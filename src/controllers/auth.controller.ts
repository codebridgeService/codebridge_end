import { Request, Response } from 'express';
import { randomBytes, randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { sendOTPEmail } from '../lib/mail';
import {
  AuthRequest,
  getJwtRefreshSecret,
  getJwtSecret,
} from '../middleware/auth.middleware';
import { uploadToCloudinary } from '../lib/cloudinary';
import {
  getClientIP,
  recordFailedAttempt,
  recordSuccessfulAuth,
} from '../middleware/attackShield.middleware';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const OTP_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const normalizeEmail = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const issueTokens = async (user: {
  id: string;
  email: string;
  role: string;
}) => {
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    getJwtRefreshSecret(),
    { expiresIn: REFRESH_TOKEN_TTL },
  );

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
    },
  });

  return { token, refreshToken };
};

const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: '/',
  });
};

const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};

/**
 * Step 1 of Registration: Request Registration OTP.
 * Validates input, hashes password, saves pending registration with OTP,
 * and emails OTP to user. USER IS NOT CREATED IN DATABASE UNTIL OTP IS VERIFIED.
 */
export const register = async (req: Request, res: Response) => {
  const clientIp = getClientIP(req);
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const providedOtp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // If caller provided an OTP in the register call directly, verify it immediately
    if (providedOtp) {
      const pendingOtp = await prisma.registrationOtp.findUnique({
        where: { email },
      });

      if (!pendingOtp || pendingOtp.otp !== providedOtp) {
        recordFailedAttempt(clientIp, 'Invalid registration OTP code');
        return res.status(401).json({ error: 'Invalid verification code. Cannot register account without valid OTP.' });
      }

      if (pendingOtp.expiresAt.getTime() <= Date.now()) {
        await prisma.registrationOtp.delete({ where: { email } }).catch(() => undefined);
        return res.status(401).json({ error: 'Verification code has expired. Please request a new code.' });
      }

      // Valid OTP: Create user
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'user',
        },
      });

      await prisma.registrationOtp.delete({ where: { email } }).catch(() => undefined);

      const { token, refreshToken } = await issueTokens(newUser);
      setRefreshTokenCookie(res, refreshToken);

      const { password: _password, otp: _otp, otpExpires: _otpExpires, ...safeUser } = newUser;
      return res.status(201).json({
        message: 'Account registered successfully',
        token,
        refreshToken,
        user: safeUser,
      });
    }

    // Standard Registration Flow: Generate OTP and send email
    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + OTP_MAX_AGE_MS);

    // Upsert pending registration record
    await prisma.registrationOtp.upsert({
      where: { email },
      update: {
        name,
        passwordHash: hashedPassword,
        otp,
        expiresAt,
      },
      create: {
        email,
        name,
        passwordHash: hashedPassword,
        otp,
        expiresAt,
      },
    });

    try {
      await sendOTPEmail(email, otp);
    } catch (mailError) {
      console.error('Failed to send registration OTP email:', mailError);
      return res.status(500).json({
        error: 'Failed to send verification code email. Please try again.',
      });
    }

    return res.status(200).json({
      message: 'Verification code sent to your email. Please enter the OTP to complete registration.',
      requiresOTP: true,
      email,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Failed to process registration' });
  }
};

/**
 * Step 2 of Registration: Verify Registration OTP & Finalize Account Creation.
 */
export const verifyRegisterOTP = async (req: Request, res: Response) => {
  const clientIp = getClientIP(req);
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required' });
    }

    const pending = await prisma.registrationOtp.findUnique({
      where: { email },
    });

    if (!pending) {
      return res.status(404).json({
        error: 'No pending registration found for this email. Please sign up first.',
      });
    }

    if (pending.otp !== otp) {
      recordFailedAttempt(clientIp, 'Invalid registration OTP attempt');
      return res.status(401).json({
        error: 'Invalid verification code. Cannot register account without OTP.',
      });
    }

    if (pending.expiresAt.getTime() <= Date.now()) {
      await prisma.registrationOtp.delete({ where: { email } }).catch(() => undefined);
      return res.status(401).json({
        error: 'Verification code has expired. Please request a new code.',
      });
    }

    // Check if user somehow was already created in the meantime
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.registrationOtp.delete({ where: { email } }).catch(() => undefined);
      return res.status(409).json({ error: 'User already exists. Please log in.' });
    }

    // Create the confirmed user account in the database
    const user = await prisma.user.create({
      data: {
        name: pending.name,
        email: pending.email,
        password: pending.passwordHash,
        role: 'user',
      },
    });

    // Delete the pending OTP record
    await prisma.registrationOtp.delete({ where: { email } }).catch(() => undefined);

    recordSuccessfulAuth(clientIp);

    const { token, refreshToken } = await issueTokens(user);
    setRefreshTokenCookie(res, refreshToken);

    const { password: _password, otp: _otp, otpExpires: _otpExpires, ...safeUser } = user;

    return res.status(201).json({
      message: 'Account registered and verified successfully',
      token,
      refreshToken,
      user: safeUser,
    });
  } catch (error) {
    console.error('Registration OTP verification error:', error);
    return res.status(500).json({ error: 'Failed to verify registration code' });
  }
};

/**
 * Resend OTP for pending registration.
 */
export const resendRegisterOTP = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const pending = await prisma.registrationOtp.findUnique({
      where: { email },
    });

    if (!pending) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'Account already registered. Please log in.' });
      }
      return res.status(404).json({ error: 'No pending registration found for this email.' });
    }

    const otp = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + OTP_MAX_AGE_MS);

    await prisma.registrationOtp.update({
      where: { email },
      data: {
        otp,
        expiresAt,
      },
    });

    try {
      await sendOTPEmail(email, otp);
    } catch (mailError) {
      console.error('Failed to resend registration OTP email:', mailError);
      return res.status(500).json({
        error: 'Failed to send verification code. Please try again.',
      });
    }

    return res.json({
      message: 'Verification code resent successfully',
      email,
    });
  } catch (error) {
    console.error('Resend registration OTP error:', error);
    return res.status(500).json({ error: 'Failed to resend verification code' });
  }
};

/**
 * Login with 1000-Attack Defense, Brute-Force Shield, and Account Lockout.
 */
export const login = async (req: Request, res: Response) => {
  const clientIp = getClientIP(req);
  try {
    const email = normalizeEmail(req.body?.email);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      recordFailedAttempt(clientIp, 'Login attempt on nonexistent email');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check account lockout status
    const now = Date.now();
    if (user.isLocked || (user.lockoutUntil && user.lockoutUntil.getTime() > now)) {
      const remainingMinutes = Math.max(1, Math.ceil(((user.lockoutUntil?.getTime() || now) - now) / 60000));
      return res.status(423).json({
        status: 'error',
        code: 'ACCOUNT_LOCKED',
        error: `Account is temporarily locked due to repeated failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
        retryAfterMinutes: remainingMinutes,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      recordFailedAttempt(clientIp, `Failed password attempt for user ${email}`);

      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const isNowLocked = failedAttempts >= MAX_LOGIN_ATTEMPTS;
      const lockoutUntil = isNowLocked ? new Date(now + LOCKOUT_DURATION_MS) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          isLocked: isNowLocked,
          lockoutUntil,
        },
      });

      if (isNowLocked) {
        return res.status(423).json({
          status: 'error',
          code: 'ACCOUNT_LOCKED',
          error: `Account locked for 15 minutes due to ${MAX_LOGIN_ATTEMPTS} consecutive failed attempts.`,
          retryAfterMinutes: 15,
        });
      }

      return res.status(401).json({
        error: 'Invalid credentials',
        remainingAttempts: MAX_LOGIN_ATTEMPTS - failedAttempts,
      });
    }

    // Password valid: Reset failed attempts & generate 2FA login OTP
    recordSuccessfulAuth(clientIp);

    const otp = randomInt(100000, 1000000).toString();
    const otpExpires = new Date(now + OTP_MAX_AGE_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpires,
        failedLoginAttempts: 0,
        isLocked: false,
        lockoutUntil: null,
      },
    });

    try {
      await sendOTPEmail(email, otp);
    } catch (mailError) {
      await prisma.user
        .update({
          where: { id: user.id },
          data: {
            otp: null,
            otpExpires: null,
          },
        })
        .catch(() => undefined);

      console.error('Failed to send OTP email:', mailError);
      return res.status(500).json({
        error: 'Failed to send verification code. Please try again.',
      });
    }

    return res.json({
      message: 'OTP sent successfully',
      requiresOTP: true,
      email,
    });
  } catch (error: any) {
    console.error('Login error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to login' });
  }
};

/**
 * Verify OTP (Handles both Login 2FA and fallback Registration OTP).
 */
export const verifyOTP = async (req: Request, res: Response) => {
  const clientIp = getClientIP(req);
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // If user is not in users table, check if it's a pending registration OTP
    if (!user) {
      const pending = await prisma.registrationOtp.findUnique({ where: { email } });
      if (pending) {
        if (pending.otp !== otp) {
          recordFailedAttempt(clientIp, 'Invalid registration OTP');
          return res.status(401).json({ error: 'Invalid verification code' });
        }
        if (pending.expiresAt.getTime() <= Date.now()) {
          await prisma.registrationOtp.delete({ where: { email } }).catch(() => undefined);
          return res.status(401).json({ error: 'Verification code has expired' });
        }

        // Finalize registration
        const newUser = await prisma.user.create({
          data: {
            name: pending.name,
            email: pending.email,
            password: pending.passwordHash,
            role: 'user',
          },
        });
        await prisma.registrationOtp.delete({ where: { email } }).catch(() => undefined);
        recordSuccessfulAuth(clientIp);

        const { token, refreshToken } = await issueTokens(newUser);
        setRefreshTokenCookie(res, refreshToken);

        const { password: _p, otp: _o, otpExpires: _oe, ...safeUser } = newUser;
        return res.json({
          message: 'Account verified and created successfully',
          token,
          refreshToken,
          user: safeUser,
        });
      }

      recordFailedAttempt(clientIp, 'OTP verification on nonexistent user');
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    if (!user.otp || user.otp !== otp) {
      recordFailedAttempt(clientIp, `Wrong login OTP for ${email}`);
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    if (!user.otpExpires || user.otpExpires.getTime() <= Date.now()) {
      await prisma.user
        .update({
          where: { id: user.id },
          data: {
            otp: null,
            otpExpires: null,
          },
        })
        .catch(() => undefined);

      return res.status(401).json({ error: 'Verification code has expired' });
    }

    // OTP verified successfully
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        otpExpires: null,
        failedLoginAttempts: 0,
        isLocked: false,
        lockoutUntil: null,
      },
    });

    recordSuccessfulAuth(clientIp);

    const { token, refreshToken } = await issueTokens(user);
    setRefreshTokenCookie(res, refreshToken);

    const {
      password: _password,
      otp: _otp,
      otpExpires: _otpExpires,
      ...safeUser
    } = user;

    return res.json({
      token,
      refreshToken,
      user: safeUser,
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ error: 'Failed to verify code' });
  }
};

/**
 * Resend OTP for Login.
 */
export const resendOTP = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Check if registration pending
      const pending = await prisma.registrationOtp.findUnique({ where: { email } });
      if (pending) {
        const otp = randomInt(100000, 1000000).toString();
        const expiresAt = new Date(Date.now() + OTP_MAX_AGE_MS);
        await prisma.registrationOtp.update({
          where: { email },
          data: { otp, expiresAt },
        });
        await sendOTPEmail(email, otp);
        return res.json({ message: 'Verification code resent successfully', email });
      }
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpExpires = new Date(Date.now() + OTP_MAX_AGE_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpires,
      },
    });

    try {
      await sendOTPEmail(email, otp);
    } catch (mailError) {
      console.error('Failed to resend OTP email:', mailError);
      return res.status(500).json({
        error: 'Failed to send verification code. Please try again.',
      });
    }

    return res.json({
      message: 'Verification code resent successfully',
      email,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ error: 'Failed to resend code' });
  }
};


export const refreshToken = async (req: Request, res: Response) => {
  try {
    const tokenFromCookie = req.cookies?.refreshToken;
    const tokenFromBody = req.body?.refreshToken;
    const tokenFromHeader = req.headers['x-refresh-token'];

    const rToken =
      typeof tokenFromCookie === 'string'
        ? tokenFromCookie
        : typeof tokenFromBody === 'string'
          ? tokenFromBody
          : typeof tokenFromHeader === 'string'
            ? tokenFromHeader
            : '';

    if (!rToken) {
      return res.status(401).json({ error: 'Refresh token missing' });
    }

    try {
      jwt.verify(rToken, getJwtRefreshSecret());
    } catch {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
      });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: rToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt.getTime() <= Date.now()) {
      if (storedToken) {
        await prisma.refreshToken
          .delete({ where: { token: rToken } })
          .catch(() => undefined);
      }

      clearRefreshTokenCookie(res);
      return res.status(401).json({
        error: 'Refresh token expired or revoked',
      });
    }

    const { user } = storedToken;

    // Rotate refresh tokens: one successful use invalidates the old token.
    await prisma.refreshToken.delete({
      where: { token: rToken },
    });

    const {
      token: newAccessToken,
      refreshToken: newRefreshToken,
    } = await issueTokens(user);

    setRefreshTokenCookie(res, newRefreshToken);

    const {
      password: _password,
      otp: _otp,
      otpExpires: _otpExpires,
      ...safeUser
    } = user;

    return res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: safeUser,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const tokenFromCookie = req.cookies?.refreshToken;
    const tokenFromBody = req.body?.refreshToken;
    const tokenFromHeader = req.headers['x-refresh-token'];

    const rToken =
      typeof tokenFromCookie === 'string'
        ? tokenFromCookie
        : typeof tokenFromBody === 'string'
          ? tokenFromBody
          : typeof tokenFromHeader === 'string'
            ? tokenFromHeader
            : '';

    if (rToken) {
      await prisma.refreshToken
        .deleteMany({ where: { token: rToken } })
        .catch(() => undefined);
    }

    clearRefreshTokenCookie(res);

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Failed to logout' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const name =
      typeof req.body?.name === 'string' ? req.body.name.trim() : undefined;
    const email = req.body?.email !== undefined
      ? normalizeEmail(req.body.email)
      : undefined;

    if (email === '') {
      return res.status(400).json({ error: 'Invalid email' });
    }

    if (email && email !== req.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== req.user.userId) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    const updateData: Record<string, string | null> = {};

    if (name !== undefined) {
      updateData.name = name || null;
    }

    if (email !== undefined) {
      updateData.email = email;
    }

    if (req.file) {
      const fileBase64 = req.file.buffer.toString('base64');
      const uploadRes = await uploadToCloudinary(fileBase64, 'users');
      updateData.image = uploadRes.url;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No profile fields to update' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
    });

    const {
      password: _password,
      otp: _otp,
      otpExpires: _otpExpires,
      ...safeUser
    } = updatedUser;

    return res.json({
      message: 'Profile updated successfully',
      user: safeUser,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const getGoogleAuthUrl = async (_req: Request, res: Response) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUrl = process.env.GOOGLE_REDIRECT_URL;

  if (!googleClientId || !redirectUrl) {
    return res.status(500).json({
      error: 'Google OAuth is not configured',
    });
  }

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

  const qs = new URLSearchParams({
    redirect_uri: redirectUrl,
    client_id: googleClientId,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  });

  return res.redirect(`${rootUrl}?${qs.toString()}`);
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserResponse = {
  email?: string;
  name?: string;
};

export const googleCallback = async (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUrl = process.env.GOOGLE_REDIRECT_URL;

    if (!code || !googleClientId || !googleClientSecret || !redirectUrl) {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUrl,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      console.error('Google token endpoint returned:', tokenRes.status);
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

    if (!tokenData.access_token) {
      console.error('Failed to get Google access token:', tokenData.error);
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    const userRes = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    );

    if (!userRes.ok) {
      console.error('Google userinfo endpoint returned:', userRes.status);
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }

    const googleUser = (await userRes.json()) as GoogleUserResponse;
    const email = normalizeEmail(googleUser.email);

    if (!email) {
      return res.redirect(`${frontendUrl}/login?error=no_email`);
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Google users do not need to know this password; it only satisfies
      // schemas that require a password field.
      const dummyPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 12);

      user = await prisma.user.create({
        data: {
          email,
          name: googleUser.name?.trim() || 'Google User',
          password: dummyPassword,

          // Never allow OAuth registration to create an admin implicitly.
          role: 'user',
        },
      });
    }

    const { token, refreshToken } = await issueTokens(user);
    setRefreshTokenCookie(res, refreshToken);

    // Do not put the refresh token or entire user object in the URL.
    // The refresh token is already stored in an HttpOnly cookie.
    return res.redirect(
      `${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`,
    );
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
};