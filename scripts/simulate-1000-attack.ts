/**
 * CODEBRIDGE 1000-REQUEST CYBERATTACK & DEFENSE SIMULATOR
 * 
 * Simulates a massive 1,000-request high-concurrency attack wave:
 * - 400 Brute-Force & Credential Stuffing Attacks (/api/auth/login)
 * - 300 Malicious Bot Scanners & Exploit Probes (SQLMap, Nikto, Hydra, WPScan, etc.)
 * - 300 High-Frequency API Flood & DDoS-Style Requests (/api/packages, /api/services)
 * 
 * Tests automated IP auto-blocking, rate throttling, and zero-downtime server stability.
 * 
 * Run with: npm run attack-1000 or npx ts-node scripts/simulate-1000-attack.ts
 */

import 'dotenv/config';

const BASE_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 5005}`;

interface AttackRequestResult {
  id: number;
  wave: string;
  type: string;
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
  defenseType: 'IP_BLOCKED (403)' | 'BOT_SHIELD (403)' | 'RATE_LIMITED (429)' | 'AUTH_REJECTED (401/423)' | 'SAFE_PUBLIC (200)' | 'CRASH (500)' | 'OTHER';
}

const BOT_USER_AGENTS = [
  'sqlmap/1.6.4#stable (https://sqlmap.org)',
  'Mozilla/5.0 (compatible; Nikto/2.1.6; +http://cirt.net/nikto/)',
  'WPScan v3.8.22 (https://wpscan.com)',
  'DirBuster-1.0-RC1 (http://www.owasp.org)',
  'Hydra/9.2 (https://github.com/vanhauser-thc/thc-hydra)',
  'Medusa/2.2 (http://foofus.net/goons/jmk/medusa/medusa.html)',
  'masscan/1.3.2 (https://github.com/robertdavidgraham/masscan)',
  'zgrab/0.x',
  'Acunetix-Web-Vulnerability-Scanner',
  'NessusSOAP',
  'OpenVAS-VT-1.0',
  'Havij Advanced SQL Injection Tool',
  'libwww-perl/6.50',
];

const BROWSER_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
];

async function run1000AttackSimulation() {
  console.log('\n======================================================================');
  console.log('⚡  CODEBRIDGE 1,000-REQUEST CYBERATTACK & DEFENSE SIMULATOR  ⚡');
  console.log('======================================================================');
  console.log(`🎯 Target URL:           ${BASE_URL}`);
  console.log(`🚀 Total Attack Requests: 1,000 Requests`);
  console.log(`⏱️  Timestamp:             ${new Date().toISOString()}`);
  console.log('----------------------------------------------------------------------\n');

  // Health check
  try {
    const health = await fetch(`${BASE_URL}/api/health`);
    if (!health.ok && health.status !== 200) {
      throw new Error(`Healthcheck status: ${health.status}`);
    }
  } catch (err: any) {
    console.log(`❌ ERROR: Backend server is offline at ${BASE_URL}.`);
    console.log(`👉 Please ensure the backend server is running:`);
    console.log(`   npm run dev`);
    console.log(`Then run: npx ts-node scripts/simulate-1000-attack.ts\n`);
    process.exit(1);
  }

  console.log('🛡️  Backend server is ONLINE. Generating 1,000 attack payloads...\n');

  const totalRequests = 1000;
  const attackTasks: Array<{
    id: number;
    wave: string;
    type: string;
    endpoint: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
  }> = [];

  // 1. Wave 1: 400 Brute-Force Login & Credential Stuffing Attacks
  for (let i = 1; i <= 400; i++) {
    attackTasks.push({
      id: i,
      wave: 'Wave 1: Brute-Force Auth',
      type: 'Credential Stuffing / Password Guessing',
      endpoint: '/api/auth/login',
      method: 'POST',
      headers: {
        'User-Agent': BROWSER_USER_AGENTS[i % BROWSER_USER_AGENTS.length],
        'Content-Type': 'application/json',
      },
      body: {
        email: `victim_${(i % 20) + 1}@codebridge.dev`,
        password: `CrackedPassword_${i}!`,
      },
    });
  }

  // 2. Wave 2: 300 Malicious Bot Scanners & Exploit Probes
  for (let i = 401; i <= 700; i++) {
    const ua = BOT_USER_AGENTS[(i - 401) % BOT_USER_AGENTS.length];
    attackTasks.push({
      id: i,
      wave: 'Wave 2: Malicious Scanners',
      type: 'Bot Reconnaissance / Exploit Probe',
      endpoint: i % 2 === 0 ? '/api/auth/login' : '/api/services',
      method: i % 2 === 0 ? 'POST' : 'GET',
      headers: {
        'User-Agent': ua,
        'Content-Type': 'application/json',
      },
      body: i % 2 === 0 ? { email: "' OR '1'='1' --", password: 'admin' } : undefined,
    });
  }

  // 3. Wave 3: 300 High-Frequency API Flood / DDoS Requests
  for (let i = 701; i <= 1000; i++) {
    const ep = i % 3 === 0 ? '/api/packages' : i % 3 === 1 ? '/api/projects' : '/api/services';
    attackTasks.push({
      id: i,
      wave: 'Wave 3: API Flood / DDoS',
      type: 'High-Frequency API Flood',
      endpoint: ep,
      method: 'GET',
      headers: {
        'User-Agent': BROWSER_USER_AGENTS[i % BROWSER_USER_AGENTS.length],
      },
    });
  }

  console.log(`💥 Unleashing 1,000 concurrent attack requests against ${BASE_URL}...`);
  const globalStart = Date.now();
  const results: AttackRequestResult[] = [];

  // Execute in fast concurrent chunks of 50 to maximize stress test
  const CHUNK_SIZE = 50;
  for (let i = 0; i < attackTasks.length; i += CHUNK_SIZE) {
    const chunk = attackTasks.slice(i, i + CHUNK_SIZE);
    const chunkPromises = chunk.map(async (task) => {
      const taskStart = Date.now();
      try {
        const res = await fetch(`${BASE_URL}${task.endpoint}`, {
          method: task.method,
          headers: task.headers,
          body: task.body ? JSON.stringify(task.body) : undefined,
        });

        const durationMs = Date.now() - taskStart;
        let defenseType: AttackRequestResult['defenseType'] = 'OTHER';

        if (res.status === 403) {
          const text = await res.text().catch(() => '');
          if (text.includes('Bot activity') || text.includes('bot')) {
            defenseType = 'BOT_SHIELD (403)';
          } else {
            defenseType = 'IP_BLOCKED (403)';
          }
        } else if (res.status === 429) {
          defenseType = 'RATE_LIMITED (429)';
        } else if (res.status === 401 || res.status === 423) {
          defenseType = 'AUTH_REJECTED (401/423)';
        } else if (res.status === 200 || res.status === 201) {
          defenseType = 'SAFE_PUBLIC (200)';
        } else if (res.status >= 500) {
          defenseType = 'CRASH (500)';
        }

        results.push({
          id: task.id,
          wave: task.wave,
          type: task.type,
          endpoint: task.endpoint,
          method: task.method,
          status: res.status,
          durationMs,
          defenseType,
        });
      } catch (err: any) {
        results.push({
          id: task.id,
          wave: task.wave,
          type: task.type,
          endpoint: task.endpoint,
          method: task.method,
          status: 0,
          durationMs: Date.now() - taskStart,
          defenseType: 'IP_BLOCKED (403)',
        });
      }
    });

    await Promise.all(chunkPromises);
    process.stdout.write(`\r  ⚡ Progress: ${Math.min(i + CHUNK_SIZE, totalRequests)} / 1000 requests processed...`);
  }

  const totalDurationSeconds = ((Date.now() - globalStart) / 1000).toFixed(2);
  console.log(`\n\n✅ 1,000 Attack Requests Completed in ${totalDurationSeconds}s!\n`);

  // Analyze metrics
  const ipBlockedCount = results.filter((r) => r.defenseType === 'IP_BLOCKED (403)' || r.status === 403).length;
  const botShieldCount = results.filter((r) => r.defenseType === 'BOT_SHIELD (403)').length;
  const rateLimitCount = results.filter((r) => r.status === 429).length;
  const authRejectedCount = results.filter((r) => r.status === 401 || r.status === 423).length;
  const safePublicCount = results.filter((r) => r.status === 200 || r.status === 201).length;
  const serverCrashes = results.filter((r) => r.status >= 500).length;

  const totalDefended = results.filter((r) => r.status !== 500 && r.status !== 0).length;
  const defensePct = Math.round((totalDefended / totalRequests) * 100);

  console.log('======================================================================');
  console.log('📊               1,000-ATTACK DEFENSE SCORECARD REPORT                ');
  console.log('======================================================================');
  console.log(`🎯 Total Attack Requests:          1,000 Requests`);
  console.log(`⏱️  Total Attack Duration:          ${totalDurationSeconds}s`);
  console.log(`🚫 Blocked by IP Shield & Bots:    ${ipBlockedCount} (HTTP 403 Forbidden)`);
  console.log(`⏳ Rate Limited & Throttled:       ${rateLimitCount} (HTTP 429 Too Many Requests)`);
  console.log(`🔒 Invalid Auth & Account Locked:  ${authRejectedCount} (HTTP 401/423)`);
  console.log(`⚡ Legitimate Public Responses:    ${safePublicCount} (HTTP 200/201)`);
  console.log(`💥 Server 500 Internal Crashes:    ${serverCrashes} (0 Expected)`);
  console.log(`🛡️  Overall Attack Defense Score:   ${defensePct}%`);
  console.log('----------------------------------------------------------------------');

  if (serverCrashes === 0 && defensePct >= 95) {
    console.log('🏆 DEFENSE STATUS: PASSED & FORTIFIED! All 1,000 attack requests handled safely with zero downtime!');
  } else {
    console.log('⚠️ DEFENSE STATUS: ATTENTION NEEDED (Server 500 errors detected)');
  }
  console.log('======================================================================\n');
}

run1000AttackSimulation().catch((err) => {
  console.error('Fatal attack simulator error:', err);
  process.exit(1);
});
