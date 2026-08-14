import 'dotenv/config';
import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';

jest.mock('../src/lib/mail', () => ({
  sendOTPEmail: jest.fn().mockResolvedValue({ status: 'success' }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ status: 'success' }),
  sendContactEmail: jest.fn().mockResolvedValue({ status: 'success' }),
}));

const mockRegistrationOtps = new Map<string, any>();
const mockUsers = new Map<string, any>();

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    contactMessage: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(mockUsers.get(where.email) || null);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const newUser = { id: 'mock-user-id-123', ...data, createdAt: new Date(), updatedAt: new Date() };
        mockUsers.set(data.email, newUser);
        return Promise.resolve(newUser);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const user = mockUsers.get(where.id) || { id: where.id, email: 'test@example.com', ...data };
        Object.assign(user, data);
        return Promise.resolve(user);
      }),
      count: jest.fn().mockResolvedValue(0),
    },
    registrationOtp: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(mockRegistrationOtps.get(where.email) || null);
      }),
      upsert: jest.fn().mockImplementation(({ where, create, update }) => {
        const record = { id: 'mock-otp-id', ...(mockRegistrationOtps.has(where.email) ? update : create) };
        mockRegistrationOtps.set(where.email, record);
        return Promise.resolve(record);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const record = mockRegistrationOtps.get(where.email) || { id: 'mock-otp-id', ...data };
        Object.assign(record, data);
        mockRegistrationOtps.set(where.email, record);
        return Promise.resolve(record);
      }),
      delete: jest.fn().mockImplementation(({ where }) => {
        mockRegistrationOtps.delete(where.email);
        return Promise.resolve({});
      }),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    package: {
      count: jest.fn().mockResolvedValue(0),
    },
    service: {
      count: jest.fn().mockResolvedValue(0),
    },
    teamMember: {
      count: jest.fn().mockResolvedValue(0),
    },
    project: {
      count: jest.fn().mockResolvedValue(0),
    },
    projectRequest: {
      count: jest.fn().mockResolvedValue(0),
    },
    blockedIp: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

import adminRoutes from '../src/routes/admin.routes';
import userRoutes from '../src/routes/users.routes';
import authRoutes from '../src/routes/auth.routes';
import { attackShield, blockIP, unblockIP, clearAllBlocks } from '../src/middleware/attackShield.middleware';
import { botProtection } from '../src/middleware/botProtection.middleware';
import { globalLimiter, authLimiter } from '../src/middleware/rateLimit.middleware';
import { getJwtSecret } from '../src/middleware/auth.middleware';

const app = express();
app.use(helmet());
app.use(express.json());

// Mount Attack Shield, bot protection, and rate limiting
app.use('/api/', attackShield);
app.use('/api/', botProtection);
app.use('/api/', globalLimiter);
app.use('/api/auth', authLimiter);

const JWT_SECRET = getJwtSecret();

// Mount routes for security testing
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

describe('Defensive Security Integration Tests', () => {
  beforeEach(() => {
    clearAllBlocks();
    mockRegistrationOtps.clear();
    mockUsers.clear();
  });

  describe('Attack Shield & IP Blocking Middleware', () => {
    it('should immediately block requests with 403 when IP is on the blocklist', async () => {
      blockIP('10.20.30.40', 60000, 'Simulated brute-force attack');

      const res = await request(app)
        .get('/api/users')
        .set('x-forwarded-for', '10.20.30.40');

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('blocked');
      expect(res.body.code).toBe('IP_BLOCKED');
      expect(res.body.message).toContain('Access Denied');
    });

    it('should allow requests again once the IP is unblocked', async () => {
      blockIP('10.20.30.40', 60000, 'Simulated brute-force attack');
      unblockIP('10.20.30.40');

      const res = await request(app)
        .get('/api/admin/stats')
        .set('x-forwarded-for', '10.20.30.40');

      // Passes IP shield (returns 401 because no auth token provided)
      expect(res.status).toBe(401);
    });
  });

  describe('Mandatory Registration OTP Verification', () => {
    it('should NOT create user account immediately upon registration, but return requiresOTP: true', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Security',
          email: 'alice@example.com',
          password: 'StrongPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.requiresOTP).toBe(true);
      expect(res.body.email).toBe('alice@example.com');
      expect(res.body.message).toContain('Verification code sent');

      // Ensure user is NOT created in User table yet
      expect(mockUsers.has('alice@example.com')).toBe(false);
      // Ensure pending registration OTP exists
      expect(mockRegistrationOtps.has('alice@example.com')).toBe(true);
    });

    it('should reject registration verification when given an incorrect OTP code', async () => {
      mockRegistrationOtps.set('alice@example.com', {
        email: 'alice@example.com',
        name: 'Alice Security',
        passwordHash: 'hashed_pw',
        otp: '654321',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/auth/register/verify')
        .send({
          email: 'alice@example.com',
          otp: '000000', // wrong OTP
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Cannot register account without OTP');
      expect(mockUsers.has('alice@example.com')).toBe(false);
    });

    it('should successfully create and confirm account when valid OTP is provided', async () => {
      mockRegistrationOtps.set('alice@example.com', {
        email: 'alice@example.com',
        name: 'Alice Security',
        passwordHash: 'hashed_pw',
        otp: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/auth/register/verify')
        .send({
          email: 'alice@example.com',
          otp: '123456',
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('alice@example.com');

      // Confirmed user is now in database
      expect(mockUsers.has('alice@example.com')).toBe(true);
    });
  });

  describe('Authentication & Access Control', () => {
    it('should reject unauthenticated access to admin endpoints with 401', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Unauthorized');
    });

    it('should reject standard user tokens on admin endpoints with 403 Forbidden', async () => {
      const standardUserToken = jwt.sign(
        { userId: 'user-123', email: 'user@example.com', role: 'user' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${standardUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('should allow valid admin tokens to access protected admin endpoints', async () => {
      const adminToken = jwt.sign(
        { userId: 'admin-123', email: 'admin@example.com', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/admin/messages/count')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 0 });
    });

    it('should reject requests with invalid or tampered tokens with 401', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer invalid-token-string');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Unauthorized');
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should reject requests with expired tokens with 401', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123', email: 'user@example.com', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Access token expired');
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('HTTP Security Headers (Helmet)', () => {
    it('should set defensive security headers on HTTP responses', async () => {
      const res = await request(app).get('/api/admin/stats');

      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('Bot Protection Middleware', () => {
    it('should block known security scanners and malicious bots with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('User-Agent', 'sqlmap/1.5.2#stable');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Bot activity detected');
    });

    it('should allow normal requests with standard user agent', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');

      // Should pass bot protection (returns 401 due to unauthenticated admin endpoint)
      expect(res.status).toBe(401);
    });
  });

  describe('OWASP Penetration Testing Attack Vectors', () => {
    it('should safely reject SQL injection payloads in auth endpoints without crashing', async () => {
      const sqliPayloads = [
        "' OR '1'='1' --",
        "admin' --",
        "test' UNION SELECT id, password, email FROM \"User\"--",
        "test'; DROP TABLE \"User\";--",
      ];

      for (const payload of sqliPayloads) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: payload, password: 'password123' });

        // Must reject safely (400, 401, or 403), never 500 error
        expect([400, 401, 403]).toContain(res.status);
      }
    });

    it('should safely handle NoSQL / JSON object operator injection attempts', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $gt: '' }, password: { $gt: '' } });

      expect([400, 401, 403]).toContain(res.status);
    });

    it('should reject JWT algorithm "none" unsigned token attacks', async () => {
      const headerB64 = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payloadB64 = Buffer.from(JSON.stringify({ userId: 'hacker', email: 'hacker@evil.com', role: 'admin' })).toString('base64url');
      const noneAlgToken = `${headerB64}.${payloadB64}.`;

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${noneAlgToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Unauthorized');
    });

    it('should safely process and not execute XSS payloads in input forms', async () => {
      const xssPayloads = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert(1)>",
        "javascript:alert(1)",
      ];

      for (const payload of xssPayloads) {
        const res = await request(app)
          .post('/api/users')
          .send({ name: payload, email: 'xss@test.com' });

        // Ensure server handles safely without crashing (status < 500)
        expect(res.status).toBeLessThan(500);
      }
    });
  });

  describe('Admin IP Blocklist and Security Management Endpoints', () => {
    const adminToken = jwt.sign(
      { userId: 'admin-id', email: 'admin@codebridge.dev', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const userToken = jwt.sign(
      { userId: 'user-id', email: 'user@codebridge.dev', role: 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    beforeEach(() => {
      clearAllBlocks();
    });

    it('should reject non-admin users from accessing blocked IPs API', async () => {
      const res = await request(app)
        .get('/api/admin/blocked-ips')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to view blocked IPs list and security stats', async () => {
      // Block a test IP
      blockIP('198.51.100.55', 60000, 'Test flood attack');

      const res = await request(app)
        .get('/api/admin/blocked-ips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.totalActive).toBeGreaterThanOrEqual(1);
      expect(res.body.blockedIPs.some((b: any) => b.ip === '198.51.100.55')).toBe(true);

      // Check security stats endpoint
      const statsRes = await request(app)
        .get('/api/admin/security-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.shieldStatus).toBe('ACTIVE');
      expect(statsRes.body.totalActiveBlocks).toBeGreaterThanOrEqual(1);
    });

    it('should allow admin to manually block an IP', async () => {
      const res = await request(app)
        .post('/api/admin/blocked-ips')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ip: '203.0.113.88',
          durationMinutes: 30,
          reason: 'Hostile scraper bot detected',
          isPermanent: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.ip).toBe('203.0.113.88');
      expect(res.body.reason).toBe('Hostile scraper bot detected');

      // Verify the IP is now blocked by Attack Shield
      const testReq = await request(app)
        .get('/api/packages')
        .set('X-Forwarded-For', '203.0.113.88');

      expect(testReq.status).toBe(403);
      expect(testReq.body.code).toBe('IP_BLOCKED');
      expect(testReq.body.message).toContain('Access Denied: Your IP has been temporarily blocked');
    });

    it('should allow admin to manually unblock an IP', async () => {
      // 1. Block IP
      blockIP('192.0.2.145', 60000, 'Test ban');

      // 2. Unblock via Admin API
      const unblockRes = await request(app)
        .delete('/api/admin/blocked-ips/192.0.2.145')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(unblockRes.status).toBe(200);
      expect(unblockRes.body.status).toBe('success');
      expect(unblockRes.body.message).toContain('unblocked successfully');

      // 3. Verify IP can now access the API again
      const testReq = await request(app)
        .get('/api/packages')
        .set('X-Forwarded-For', '192.0.2.145');

      expect(testReq.status).not.toBe(403);
    });

    it('should allow admin to clear all active IP blocks', async () => {
      blockIP('192.0.2.1', 60000, 'Test 1');
      blockIP('192.0.2.2', 60000, 'Test 2');

      const clearRes = await request(app)
        .post('/api/admin/blocked-ips/clear-all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(clearRes.status).toBe(200);
      expect(clearRes.body.status).toBe('success');

      // Verify blocked list is now empty
      const listRes = await request(app)
        .get('/api/admin/blocked-ips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.body.totalActive).toBe(0);
    });
  });
});
