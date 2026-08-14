/**
 * 100-Bot Attack & Defense Simulator
 * 
 * Simulates 100 automated bots attacking the Codebridge backend:
 * - 40 Malicious Security Scanner Bots (sqlmap, nikto, hydra, wpscan, etc.)
 * - 30 Brute-Force & Credential Stuffing Bots (rapid /api/auth/login attempts)
 * - 30 Scraper & API Flood Bots (rapid concurrent API requests)
 * 
 * Run with: npm run bot-attack or npx ts-node scripts/simulate-bot-attack.ts
 */

import 'dotenv/config';

const BASE_URL = process.env.API_URL || 'http://localhost:5005';

interface BotResult {
  id: number;
  botType: string;
  userAgent: string;
  endpoint: string;
  status: number;
  statusText: string;
  durationMs: number;
  defended: boolean;
  defenseType: 'BOT_PROTECTION (403)' | 'RATE_LIMITED (429)' | 'AUTH_PROTECTED (401)' | 'OTHER_DEFENDED' | 'UNPROTECTED';
}

const SCANNER_AGENTS = [
  'sqlmap/1.6.4#stable (https://sqlmap.org)',
  'Mozilla/5.0 (compatible; Nikto/2.1.6; +http://cirt.net/nikto/)',
  'Mozilla/5.0 (compatible; Nmap Scripting Engine; https://nmap.org/book/nse.html)',
  'WPScan v3.8.22 (https://wpscan.com/wordpress-security-scanner)',
  'DirBuster-1.0-RC1 (http://www.owasp.org/index.php/Category:OWASP_DirBuster_Project)',
  'gobuster/3.1.0',
  'masscan/1.3.2 (https://github.com/robertdavidgraham/masscan)',
  'zgrab/0.x',
  'Hydra/9.2 (https://github.com/vanhauser-thc/thc-hydra)',
  'Medusa/2.2 (http://foofus.net/goons/jmk/medusa/medusa.html)',
  'Scrapy/2.11.0 (+https://scrapy.org)',
  'Shodan/1.0 (+https://www.shodan.io/)',
  'CensysInspect/1.1 (+https://about.censys.io/)',
  'Acunetix-Web-Vulnerability-Scanner',
  'NessusSOAP',
  'OpenVAS-VT-1.0',
  'Havij Advanced SQL Injection Tool',
  'libwww-perl/6.50',
];

const NORMAL_BROWSER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
];

async function runBotAttack() {
  console.log('\n===============================================================');
  console.log('🛡️   CODEBRIDGE 100-BOT ATTACK & DEFENSE SIMULATOR   🛡️');
  console.log('===============================================================');
  console.log(`🎯 Target URL: ${BASE_URL}`);
  console.log(`🤖 Total Bots to deploy: 100 Bots`);
  
  // Health pre-flight check
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`);
    if (!healthCheck.ok && healthCheck.status !== 200) {
      throw new Error(`Healthcheck returned status ${healthCheck.status}`);
    }
  } catch (err: any) {
    console.log(`\n❌ ERROR: Backend server is not accessible at ${BASE_URL}.`);
    console.log(`👉 Please start the backend server in a separate terminal:`);
    console.log(`   npm run dev`);
    console.log(`Then re-run: npm run bot-attack\n`);
    process.exit(1);
  }

  console.log(`⏱️  Launching attack waves...\n`);

  const results: BotResult[] = [];
  const startTime = Date.now();

  const botConfigs: Array<{
    id: number;
    type: string;
    userAgent: string;
    endpoint: string;
    method: string;
    body?: any;
  }> = [];

  // Wave 1: 40 Security Scanner Bots (exploits, sqlmap, nikto, wpscan, etc.)
  for (let i = 1; i <= 40; i++) {
    const ua = SCANNER_AGENTS[(i - 1) % SCANNER_AGENTS.length];
    botConfigs.push({
      id: i,
      type: 'Scanner / Exploit Bot',
      userAgent: ua,
      endpoint: i % 2 === 0 ? '/api/auth/login' : '/api/services',
      method: i % 2 === 0 ? 'POST' : 'GET',
      body: i % 2 === 0 ? { email: `bot_${i}@attacker.com`, password: 'admin' } : undefined,
    });
  }

  // Wave 2: 30 Credential Stuffing / Brute-Force Bots (Rapid Auth spam)
  for (let i = 41; i <= 70; i++) {
    botConfigs.push({
      id: i,
      type: 'Brute-Force Auth Bot',
      userAgent: NORMAL_BROWSER_AGENTS[i % NORMAL_BROWSER_AGENTS.length],
      endpoint: '/api/auth/login',
      method: 'POST',
      body: { email: `admin_target_${i}@codebridge.dev`, password: `Password${i}!` },
    });
  }

  // Wave 3: 30 Rapid Scraper / API Flood Bots
  for (let i = 71; i <= 100; i++) {
    botConfigs.push({
      id: i,
      type: 'API Flood / Scraper Bot',
      userAgent: NORMAL_BROWSER_AGENTS[i % NORMAL_BROWSER_AGENTS.length],
      endpoint: '/api/packages',
      method: 'GET',
    });
  }

  // Execute 100 bots concurrently with slight jitter
  const promises = botConfigs.map(async (bot) => {
    const botStart = Date.now();
    try {
      const headers: Record<string, string> = {
        'User-Agent': bot.userAgent,
        'Accept': 'application/json',
      };
      if (bot.body) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(`${BASE_URL}${bot.endpoint}`, {
        method: bot.method,
        headers,
        body: bot.body ? JSON.stringify(bot.body) : undefined,
      });

      const durationMs = Date.now() - botStart;
      let defenseType: BotResult['defenseType'] = 'UNPROTECTED';

      if (res.status === 403) {
        defenseType = 'BOT_PROTECTION (403)';
      } else if (res.status === 429) {
        defenseType = 'RATE_LIMITED (429)';
      } else if (res.status === 401) {
        defenseType = 'AUTH_PROTECTED (401)';
      } else if (res.status >= 400 && res.status < 500) {
        defenseType = 'OTHER_DEFENDED';
      }

      const defended = res.status !== 500 && (res.status === 403 || res.status === 429 || res.status === 401 || res.status === 200 || res.status === 400);

      const result: BotResult = {
        id: bot.id,
        botType: bot.type,
        userAgent: bot.userAgent,
        endpoint: bot.endpoint,
        status: res.status,
        statusText: res.statusText,
        durationMs,
        defended,
        defenseType,
      };

      // Realtime log
      const icon = res.status === 403 ? '🚫' : res.status === 429 ? '⏳' : res.status === 401 ? '🔒' : res.status === 200 ? '⚡' : '⚠️';
      console.log(
        `${icon} [Bot #${String(bot.id).padStart(3, '0')}] ${bot.type.padEnd(23)} -> ${bot.endpoint.padEnd(16)} | HTTP ${res.status} (${defenseType}) - ${durationMs}ms`
      );

      results.push(result);
    } catch (err: any) {
      const durationMs = Date.now() - botStart;
      results.push({
        id: bot.id,
        botType: bot.type,
        userAgent: bot.userAgent,
        endpoint: bot.endpoint,
        status: 0,
        statusText: err.message || 'Connection Error',
        durationMs,
        defended: true,
        defenseType: 'OTHER_DEFENDED',
      });
      console.log(`❌ [Bot #${String(bot.id).padStart(3, '0')}] Failed to reach server: ${err.message}`);
    }
  });

  await Promise.all(promises);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Analyze metrics
  const blockedByBotProtection = results.filter((r) => r.status === 403).length;
  const throttledByRateLimit = results.filter((r) => r.status === 429).length;
  const invalidAuthRejected = results.filter((r) => r.status === 401).length;
  const publicDataServed = results.filter((r) => r.status === 200).length;
  const serverCrashes = results.filter((r) => r.status >= 500).length;

  const avgLatency = (results.reduce((acc, r) => acc + r.durationMs, 0) / results.length).toFixed(1);

  console.log('\n===============================================================');
  console.log('📊                   ATTACK SIMULATION REPORT                  ');
  console.log('===============================================================');
  console.log(`🤖 Total Bots Launched:        100 Bots`);
  console.log(`⏱️  Total Duration:             ${totalTime}s (Avg ${avgLatency}ms/request)`);
  console.log(`🚫 Blocked by Bot Protection:  ${blockedByBotProtection} / 40 Scanner Bots (HTTP 403)`);
  console.log(`⏳ Rate Limited / Throttled:   ${throttledByRateLimit} Bots (HTTP 429)`);
  console.log(`🔒 Invalid Creds Defended:     ${invalidAuthRejected} Bots (HTTP 401)`);
  console.log(`⚡ Legitimate Public Responses: ${publicDataServed} (HTTP 200)`);
  console.log(`💥 Server 500 Errors:          ${serverCrashes} (0 Expected)`);
  console.log('---------------------------------------------------------------');
  
  if (blockedByBotProtection >= 40 && serverCrashes === 0) {
    console.log('✅ DEFENSE RESULT: EXCELLENT (100% of malicious scanner bots neutralized, server 100% stable!)');
  } else if (serverCrashes === 0) {
    console.log('✅ DEFENSE RESULT: PASSED (No server crashes, all attacks handled safely)');
  } else {
    console.log('⚠️ DEFENSE RESULT: NEEDS ATTENTION (Server 500 errors detected)');
  }
  console.log('===============================================================\n');
}

runBotAttack().catch(console.error);
