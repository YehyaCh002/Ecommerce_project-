import autocannon, { Client } from 'autocannon';
import http from 'http';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:3002';
const CONNS = parseInt(process.env.CONNS || '50', 10);
const DURATION = parseInt(process.env.DURATION || '30', 10);

function httpPost(path: string, body: object): Promise<{ accessToken: string; cookies: string }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'] || [];
        const accessCookie = setCookie.find((c) => c.startsWith('accessToken='));
        const token = accessCookie ? accessCookie.split('accessToken=')[1].split(';')[0] : '';
        resolve({ accessToken: token, cookies: setCookie.map((c) => c.split(';')[0]).join('; ') });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function login(): Promise<{ accessToken: string; cookies: string }> {
  console.log('Logging in as admin@shop.local ...');
  const res = await httpPost('/users/login', { email: 'admin@shop.local', password: 'admin123' });
  console.log(`Login successful, token: ${res.accessToken.substring(0, 20)}...`);
  return res;
}

function runTest(name: string, url: string, opts: Record<string, any> = {}) {
  console.log(`\n--- ${name} (${opts.connections || CONNS}c / ${opts.duration || DURATION}s) ---`);
  return autocannon({
    url,
    connections: opts.connections || CONNS,
    duration: opts.duration || DURATION,
    pipelining: 1,
    headers: opts.headers || {},
    ...(opts.requests ? { requests: opts.requests } : {}),
  });
}

function printSummary(results: { name: string; result: any }[]) {
  console.log('\n' + '='.repeat(95));
  console.log('ENDPOINT'.padEnd(30) + 'REQ/S'.padStart(8) + 'AVG LATENCY'.padStart(14) + 'P99 LATENCY'.padStart(14) + 'THROUGHPUT'.padStart(14) + 'ERRORS'.padStart(10));
  console.log('-'.repeat(95));
  for (const { name, result } of results) {
    const rps = result.requests.average.toFixed(0);
    const avgLat = result.latency.average.toFixed(1) + 'ms';
    const p99Lat = result.latency.p99.toFixed(1) + 'ms';
    const tp = (result.throughput.average / 1024 / 1024).toFixed(2) + ' MB/s';
    const errors = (result.errors || 0).toString();
    console.log(name.padEnd(30) + rps.padStart(8) + avgLat.padStart(14) + p99Lat.padStart(14) + tp.padStart(14) + errors.padStart(10));
  }
  console.log('='.repeat(95));
}

async function main() {
  console.log('========================================');
  console.log('  ADVANCED LOAD TEST');
  console.log(`  Target:   ${BASE_URL}`);
  console.log(`  Conc:     ${CONNS} connections`);
  console.log(`  Duration: ${DURATION}s per endpoint`);
  console.log('========================================');

  let auth: { accessToken: string; cookies: string } | null = null;
  try {
    auth = await login();
  } catch {
    console.log('Login failed — skipping authenticated tests.\n');
  }

  const results: { name: string; result: any }[] = [];

  // --- Phase 1: Public endpoints (heavy) ---
  console.log('\n======= PHASE 1: PUBLIC ENDPOINTS =======');

  const root = await runTest('GET /', `${BASE_URL}/`);
  results.push({ name: 'GET /', result: root });

  const health = await runTest('GET /health', `${BASE_URL}/health`);
  results.push({ name: 'GET /health', result: health });

  const products = await runTest('GET /products', `${BASE_URL}/products`);
  results.push({ name: 'GET /products', result: products });

  const categories = await runTest('GET /categories', `${BASE_URL}/categories`);
  results.push({ name: 'GET /categories', result: categories });

  const authStatus = await runTest('GET /auth/status', `${BASE_URL}/auth/status`);
  results.push({ name: 'GET /auth/status', result: authStatus });

  // --- Phase 2: Authenticated endpoints ---
  if (auth) {
    console.log('\n======= PHASE 2: AUTHENTICATED ENDPOINTS =======');

    const authHeaders = { Cookie: auth.cookies };

    const me = await runTest('GET /users/me', `${BASE_URL}/users/me`, { headers: authHeaders });
    results.push({ name: 'GET /users/me', result: me });

    const cart = await runTest('GET /cart', `${BASE_URL}/cart`, { headers: authHeaders });
    results.push({ name: 'GET /cart', result: cart });

    const ordersTest = await runTest('GET /orders/test', `${BASE_URL}/orders/test`);
    results.push({ name: 'GET /orders/test', result: ordersTest });
  }

  // --- Phase 3: Ramp-up test on /health ---
  console.log('\n======= PHASE 3: RAMP-UP (GET /health) =======');
  for (const c of [10, 50, 100, 200]) {
    const r = await runTest(`Ramp ${c}c`, `${BASE_URL}/health`, { connections: c, duration: 5 });
    results.push({ name: `Ramp /health ${c}c`, result: r });
  }

  printSummary(results);

  // Save JSON
  const fs = require('fs');
  const report = results.map(({ name, result }) => ({
    name,
    requests: result.requests,
    latency: result.latency,
    throughput: result.throughput,
    errors: result.errors,
    duration: result.duration,
    start: result.start,
    finish: result.finish,
  }));
  fs.writeFileSync('load-test-results.json', JSON.stringify(report, null, 2));
  console.log('\nResults saved to load-test-results.json');
}

main().catch(console.error);
