import rateLimit from 'express-rate-limit';
import { getClientIP, recordFailedAttempt } from './attackShield.middleware';

const isProduction = process.env.NODE_ENV === 'production';

// Global API Rate Limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    const ip = getClientIP(req);
    recordFailedAttempt(ip, 'Global API rate limit exceeded');
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

// Authentication General Limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 60 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    const ip = getClientIP(req);
    recordFailedAttempt(ip, 'Auth route rate limit exceeded');
    res.status(429).json({
      status: 'error',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication requests, please try again later.',
    });
  },
});

// Strict Login Protection Limiter
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 15 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    const ip = getClientIP(req);
    recordFailedAttempt(ip, 'Login rate limit exceeded');
    res.status(429).json({
      status: 'error',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
    });
  },
});

// Registration Rate Limiter (Prevents account spamming)
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    const ip = getClientIP(req);
    recordFailedAttempt(ip, 'Registration rate limit exceeded');
    res.status(429).json({
      status: 'error',
      code: 'REGISTER_RATE_LIMIT_EXCEEDED',
      message: 'Too many registration attempts. Please try again later.',
    });
  },
});

// OTP Verification & Resend Limiter (Prevents OTP brute-forcing)
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    const ip = getClientIP(req);
    recordFailedAttempt(ip, 'OTP rate limit exceeded');
    res.status(429).json({
      status: 'error',
      code: 'OTP_RATE_LIMIT_EXCEEDED',
      message: 'Too many verification attempts. Please wait before trying again.',
    });
  },
});
