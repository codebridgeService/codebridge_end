import { Router } from 'express';
import {
  login,
  register,
  verifyRegisterOTP,
  resendRegisterOTP,
  verifyOTP,
  resendOTP,
  updateProfile,
  getGoogleAuthUrl,
  googleCallback,
  refreshToken,
  logout,
} from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';
import { loginLimiter, registerLimiter, otpLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication API with Attack Shield & Mandatory Registration OTP
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Initiate registration by validating data and sending OTP to email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               otp:
 *                 type: string
 *                 description: Optional if verifying in a single call
 *     responses:
 *       200:
 *         description: OTP verification code sent to email
 *       201:
 *         description: Account successfully registered with OTP
 */
router.post('/register', registerLimiter, register);

/**
 * @swagger
 * /auth/register/verify:
 *   post:
 *     summary: Verify OTP and create user account (Mandatory OTP verification)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account verified and registered successfully
 *       401:
 *         description: Invalid or expired OTP
 */
router.post('/register/verify', otpLimiter, verifyRegisterOTP);

/**
 * @swagger
 * /auth/register/resend-otp:
 *   post:
 *     summary: Resend OTP for pending registration
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Verification code resent
 */
router.post('/register/resend-otp', otpLimiter, resendRegisterOTP);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user with brute-force defense and account lockout
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Credentials valid, OTP sent for 2FA verification
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */
router.post('/login', loginLimiter, login);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify login/registration OTP code
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: OTP verified, access token issued
 */
router.post('/verify-otp', otpLimiter, verifyOTP);

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     summary: Resend OTP code
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: OTP resent
 */
router.post('/resend-otp', otpLimiter, resendOTP);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token and refresh token issued
 */
router.post('/refresh', refreshToken);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user and invalidate refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', logout);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/profile', verifyToken, upload.single('image'), updateProfile);

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Get Google OAuth URL
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: URL generated
 */
router.get('/google', getGoogleAuthUrl);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth Callback
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to frontend
 */
router.get('/google/callback', googleCallback);

export default router;
