import autocannon from 'autocannon';
import fs from 'fs';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:3002';

interface RampResult {
  connections: number;
  reqPerSec: number;
  avgLatency: number;
  p99Latency: number;
  errors: number;
  timeouts: number;
  totalRequests: number;
}

async function runBench(name: string, url: string, connections: number, duration: number): Promise<RampResult> {
  const result = await autocannon({
    url,
    connections,
    duration,
    pipelining: 1,
  });

  return {
    connections,
    reqPerSec: result.requests.average,
    avgLatency: result.latency.average,
    p99Latency: result.latency.p99,
    errors: result.errors || 0,
    timeouts: (result as any).timeouts || 0,
    totalRequests: result.requests.total,
  };
}

async function findBreakingPoint(url: string, name: string) {
  console.log(`\n========== BREAKING POINT: ${name} ==========`);

  const levels = [10, 25, 50, 100, 150, 200, 300, 500];
  const duration = 10;
  const results: RampResult[] = [];

  for (const c of levels) {
    process.stdout.write(`  ${c} connections ... `);
    const r = await runBench(`${name} @${c}c`, url, c, duration);
    results.push(r);
    const status = r.errors > 0 ? 'ERRORS' : 'OK';
    console.log(`${r.reqPerSec.toFixed(0)} req/s | avg ${r.avgLatency.toFixed(0)}ms | p99 ${r.p99Latency.toFixed(0)}ms | ${status}`);
  }

  return results;
}

async function concurrentEndpointStress() {
  console.log('\n========== CONCURRENT MULTI-ENDPOINT STRESS ==========');
  console.log('Hitting ALL public endpoints simultaneously with 50 connections each\n');

  const endpoints = [
    { name: 'GET /', url: `${BASE_URL}/` },
    { name: 'GET /health', url: `${BASE_URL}/health` },
    { name: 'GET /products', url: `${BASE_URL}/products` },
    { name: 'GET /categories', url: `${BASE_URL}/categories` },
    { name: 'GET /auth/status', url: `${BASE_URL}/auth/status` },
  ];

  const promises = endpoints.map(async (ep) => {
    const result = await autocannon({
      url: ep.url,
      connections: 50,
      duration: 15,
      pipelining: 1,
    });
    return { name: ep.name, result };
  });

  const results = await Promise.all(promises);

  console.log('\nConcurrent results (all endpoints hit at the same time):');
  console.log('-'.repeat(75));
  for (const { name, result } of results) {
    console.log(`${name.padEnd(25)} | ${result.requests.average.toFixed(0).padStart(6)} req/s | avg ${result.latency.average.toFixed(1).padStart(6)}ms | p99 ${result.latency.p99.toFixed(0).padStart(5)}ms | err ${result.errors || 0}`);
  }
  console.log('-'.repeat(75));
}

async function main() {
  const mode = process.argv[2] || 'ramp';

  if (mode === 'ramp') {
    console.log('========================================');
    console.log('  STRESS TEST — FIND BREAKING POINT');
    console.log(`  Target: ${BASE_URL}`);
    console.log('========================================');

    const breaking: Record<string, RampResult[]> = {};

    breaking['GET /'] = await findBreakingPoint(`${BASE_URL}/`, 'GET /');
    breaking['GET /products'] = await findBreakingPoint(`${BASE_URL}/products`, 'GET /products');
    breaking['GET /health'] = await findBreakingPoint(`${BASE_URL}/health`, 'GET /health');

    console.log('\n\n========== BREAKING POINT ANALYSIS ==========\n');

    for (const [name, results] of Object.entries(breaking)) {
      console.log(`${name}:`);
      let peak = results[0];
      for (const r of results) {
        if (r.reqPerSec > peak.reqPerSec && r.errors === 0) peak = r;
        const marker = r.reqPerSec === peak.reqPerSec ? ' <-- PEAK' : '';
        console.log(`  ${r.connections.toString().padStart(4)}c | ${r.reqPerSec.toFixed(0).padStart(7)} req/s | avg ${r.avgLatency.toFixed(0).padStart(5)}ms | p99 ${r.p99Latency.toFixed(0).padStart(5)}ms | err ${r.errors}${marker}`);
      }
      console.log(`  Optimal concurrency: ${peak.connections}c (${peak.reqPerSec.toFixed(0)} req/s)\n`);
    }

    const report = { ramp: breaking };
    fs.writeFileSync('stress-test-results.json', JSON.stringify(report, null, 2));
    console.log('Results saved to stress-test-results.json');

  } else if (mode === 'concurrent') {
    await concurrentEndpointStress();
  } else {
    console.log('Usage: npx ts-node stress-test.ts [ramp|concurrent]');
    console.log('  ramp       - Find breaking point with increasing connections (default)');
    console.log('  concurrent - Hit all endpoints simultaneously');
  }
}

main().catch(console.error);
