/**
 * CODEBRIDGE 1,000 REGISTRATION LOAD & SECURITY TESTER
 * 
 * Tests 1,000 registration attempts against /api/auth/register:
 * - Tests registration validation & rate limiter (registerLimiter)
 * - Tests bot & spam flood protection (attackShield)
 * - Tests concurrent account registration simulation
 * 
 * Run with: npm run register-1000 or npx ts-node scripts/simulate-1000-register.ts
 */

import 'dotenv/config';

const BASE_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 5005}`;

interface RegisterResult {
  id: number;
  email: string;
  status: number;
  durationMs: number;
  outcome: 'SUCCESS (200/201)' | 'RATE_LIMITED (429)' | 'IP_BLOCKED (403)' | 'USER_EXISTS (409)' | 'VALIDATION_ERR (400)' | 'CRASH (500)' | 'OTHER';
  responseBody?: any;
}

async function run1000RegisterSimulation() {
  console.log('\n======================================================================');
  console.log('⚡  CODEBRIDGE 1,000 REGISTRATION TEST SIMULATOR  ⚡');
  console.log('======================================================================');
  console.log(`🎯 Target URL:           ${BASE_URL}/api/auth/register`);
  console.log(`🚀 Total Requests:       1,000 Registrations`);
  console.log(`⏱️  Timestamp:             ${new Date().toISOString()}`);
  console.log('----------------------------------------------------------------------\n');

  // Server healthcheck
  try {
    const health = await fetch(`${BASE_URL}/api/health`);
    if (!health.ok && health.status !== 200) {
      throw new Error(`Healthcheck status: ${health.status}`);
    }
  } catch (err: any) {
    console.log(`❌ ERROR: Backend server is offline at ${BASE_URL}.`);
    console.log(`👉 Please ensure the backend server is running: npm run dev`);
    console.log(`Then run: npm run register-1000\n`);
    process.exit(1);
  }

  console.log('🛡️  Backend server is ONLINE. Generating 1,000 registration test requests...\n');

  const totalRequests = 1000;
  const results: RegisterResult[] = [];
  const startTime = Date.now();

  const BATCH_SIZE = 50;

  for (let i = 0; i < totalRequests; i += BATCH_SIZE) {
    const batch = Array.from({ length: Math.min(BATCH_SIZE, totalRequests - i) }, (_, idx) => {
      const id = i + idx + 1;
      const testEmail = `loadtest_user_${Date.now()}_${id}@codebridge.test`;
      const testName = `LoadTest User ${id}`;
      const testPassword = `SecurePass123!#${id}`;

      // Simulate diverse simulated client IPs to test distributed vs single source load
      const simulatedIp = `198.51.${Math.floor((id - 1) / 20) + 1}.${((id - 1) % 20) + 1}`;

      const payload = {
        name: testName,
        email: testEmail,
        password: testPassword,
      };

      const reqStart = Date.now();

      return fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CodeBridge-LoadTester/1.0',
          'X-Forwarded-For': simulatedIp,
        },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const durationMs = Date.now() - reqStart;
          let outcome: RegisterResult['outcome'] = 'OTHER';

          if (res.status === 200 || res.status === 201) outcome = 'SUCCESS (200/201)';
          else if (res.status === 429) outcome = 'RATE_LIMITED (429)';
          else if (res.status === 403) outcome = 'IP_BLOCKED (403)';
          else if (res.status === 409) outcome = 'USER_EXISTS (409)';
          else if (res.status === 400) outcome = 'VALIDATION_ERR (400)';
          else if (res.status >= 500) outcome = 'CRASH (500)';

          return {
            id,
            email: testEmail,
            status: res.status,
            durationMs,
            outcome,
          } as RegisterResult;
        })
        .catch((err) => {
          return {
            id,
            email: testEmail,
            status: 0,
            durationMs: Date.now() - reqStart,
            outcome: 'CRASH (500)',
          } as RegisterResult;
        });
    });

    const batchResults = await Promise.all(batch);
    results.push(...batchResults);

    const progress = Math.min(i + BATCH_SIZE, totalRequests);
    process.stdout.write(`  ⚡ Progress: ${progress} / ${totalRequests} registration requests processed...\r`);
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n\n✅ 1,000 Registration Test Requests Completed in ${totalDuration}s!\n`);

  // Breakdown
  const successCount = results.filter((r) => r.status === 200 || r.status === 201).length;
  const rateLimitCount = results.filter((r) => r.status === 429).length;
  const blockedCount = results.filter((r) => r.status === 403).length;
  const userExistsCount = results.filter((r) => r.status === 409).length;
  const validationErrorCount = results.filter((r) => r.status === 400).length;
  const crashCount = results.filter((r) => r.status >= 500 || r.status === 0).length;

  console.log('======================================================================');
  console.log('📊           1,000-REGISTRATION LOAD & SECURITY SCORECARD             ');
  console.log('======================================================================');
  console.log(`🎯 Total Requests:                 ${totalRequests.toLocaleString()} Requests`);
  console.log(`⏱️  Total Duration:                 ${totalDuration}s`);
  console.log(`⚡ OTP Sent / Registered (200/201):  ${successCount}`);
  console.log(`⏳ Rate Limited & Throttled (429):   ${rateLimitCount}`);
  console.log(`🚫 Shield Blocked (403):           ${blockedCount}`);
  console.log(`👥 Already Existing (409):          ${userExistsCount}`);
  console.log(`⚠️  Validation Errors (400):         ${validationErrorCount}`);
  console.log(`💥 Server 500 Crashes:              ${crashCount}`);
  console.log('----------------------------------------------------------------------');
  if (crashCount === 0) {
    console.log('🏆 STATUS: PASSED & RESILIENT! Server handled 1,000 registrations with zero crashes!');
  } else {
    console.log(`⚠️ STATUS: ${crashCount} requests encountered server errors.`);
  }
  console.log('======================================================================\n');
}

run1000RegisterSimulation();
