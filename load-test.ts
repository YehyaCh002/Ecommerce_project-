import autocannon from 'autocannon';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:3002';

const targets = [
  { name: 'GET /', url: `${BASE_URL}/` },
  { name: 'GET /health', url: `${BASE_URL}/health` },
  { name: 'GET /products', url: `${BASE_URL}/products` },
  { name: 'GET /categories', url: `${BASE_URL}/categories` },
  { name: 'GET /auth/status', url: `${BASE_URL}/auth/status` },
];

async function runTest(target: { name: string; url: string }) {
  console.log(`\n--- Benchmarking: ${target.name} ---`);
  const result = await autocannon({
    url: target.url,
    connections: 10,
    duration: 10,
    pipelining: 1,
  });
  console.log(autocannon.printResult(result));
  return result;
}

async function main() {
  const mode = process.argv[2]; // "individual" or "multi" (default: multi)

  if (mode === 'individual') {
    for (const target of targets) {
      await runTest(target);
    }
  } else {
    console.log('Running multi-target load test...');
    console.log(`Target: ${BASE_URL}`);
    console.log('Connections: 10 | Duration: 10s per endpoint\n');

    const results = [];
    for (const target of targets) {
      const result = await runTest(target);
      results.push({ name: target.name, result });
    }

    console.log('\n========== SUMMARY ==========');
    for (const { name, result } of results) {
      const rps = result.requests.average;
      const latency = result.latency.average;
      const throughput = (result.throughput.average / 1024 / 1024).toFixed(2);
      console.log(`${name.padEnd(25)} | ${rps.toFixed(0).padStart(6)} req/s | avg ${latency.toFixed(1).padStart(6)}ms | ${throughput} MB/s`);
    }
    console.log('=============================\n');
  }
}

main().catch(console.error);
