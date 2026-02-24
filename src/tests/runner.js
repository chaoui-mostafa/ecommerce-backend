#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const autocannon = require('autocannon');
const { PassThrough } = require('stream');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BASE_DIR = path.resolve(__dirname);
const REPORT_DIR = path.join(BASE_DIR, 'reports');

if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

class TestRunner {
  constructor() {
    this.startTime = Date.now();
    this.results = { total: 0, passed: 0, failed: 0, duration: 0, modules: {}, performance: null };
    this.baseURL = 'http://localhost:5000';
    this.maxRetries = 2; // retry health check
  }

  showHeader() {
    console.clear();
    console.log(`${colors.cyan}${colors.bright}╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║          E-COMMERCE API PROFESSIONAL TEST SUITE              ║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
    console.log(`${colors.yellow}📅 ${new Date().toLocaleString()}${colors.reset}`);
    console.log(`${colors.blue}🔧 Node.js: ${process.version}${colors.reset}`);
    console.log(`${colors.magenta}📁 Environment: ${process.env.NODE_ENV || 'test'}${colors.reset}\n`);
  }

  async runAllTests() {
    this.showHeader();

    const suites = [
      ['Authentication', 'integration/auth.test.js'],
      ['Products', 'integration/products.test.js'],
      ['Categories', 'integration/categories.test.js'],
      ['Cart', 'integration/cart.test.js'],
      ['Orders', 'integration/orders.test.js'],
      ['Reviews', 'integration/reviews.test.js'],
      ['End-to-End Flow', 'e2e/full-flow.test.js']
    ];

    for (const [name, file] of suites) await this.runTestSuite(name, path.join(BASE_DIR, file));

    await this.runPerformanceTests();
    this.showSummary();
    this.generateHTMLReport();
    this.startDashboard();
  }

  async runTestSuite(name, testPath) {
    console.log(`${colors.blue}${colors.bright}▶ Running: ${name}${colors.reset}`);

    if (!fs.existsSync(testPath)) {
      console.log(`${colors.yellow}⚠ No test file found for ${name}${colors.reset}`);
      return;
    }

    try {
      const reportFile = path.join(REPORT_DIR, `${name.toLowerCase()}.json`);
      execSync(`npx jest "${testPath}" --json --outputFile="${reportFile}" --passWithNoTests`, { stdio: 'ignore' });
      const result = JSON.parse(fs.readFileSync(reportFile));

      this.results.modules[name] = {
        total: result.numTotalTests || 0,
        passed: result.numPassedTests || 0,
        failed: result.numFailedTests || 0
      };

      this.results.total += result.numTotalTests || 0;
      this.results.passed += result.numPassedTests || 0;
      this.results.failed += result.numFailedTests || 0;

      console.log(result.numFailedTests === 0
        ? `${colors.green}✓ ${name} Passed${colors.reset}`
        : `${colors.red}✗ ${name} Failed${colors.reset}`
      );
    } catch (err) {
      console.log(`${colors.red}✗ ${name} Execution Error: ${err.message}${colors.reset}`);
    }
  }

  async checkHealth(retries = 0) {
    try {
      const res = await fetch(`${this.baseURL}/api/health`);
      if (!res.ok) throw new Error('Server not ready');

      const data = await res.json();
      if (!data.success) throw new Error('Health check failed');
      return true;
    } catch (err) {
      if (retries < this.maxRetries) {
        console.log(`${colors.yellow}⚠ Health check failed, retrying... (${retries + 1})${colors.reset}`);
        await new Promise(r => setTimeout(r, 1000));
        return this.checkHealth(retries + 1);
      }
      console.log(`${colors.red}✗ Server is not responding at ${this.baseURL}/api/health${colors.reset}`);
      return false;
    }
  }

  async runPerformanceTests() {
    console.log(`\n${colors.magenta}${colors.bright}⚡ Running Performance Tests${colors.reset}`);

    const serverReady = await this.checkHealth();
    if (!serverReady) {
      this.results.performance = { average: 0, p95: 0, errorRate: 100 };
      return;
    }

    const url = this.baseURL;
    const connections = 100;
    const duration = 30; // seconds

    const instance = autocannon({
      url,
      connections,
      duration,
      headers: { 'Content-Type': 'application/json' },
      requests: [
        { method: 'GET', path: '/api/health', title: 'Health Check' },
        { method: 'GET', path: '/api/products?page=1&limit=10', title: 'Get Products' },
        { method: 'GET', path: '/api/categories', title: 'Get Categories' },
        { method: 'POST', path: '/api/auth/login', title: 'Login', body: JSON.stringify({ email: 'test@example.com', password: 'Password123!' }) }
      ]
    }, (err, results) => {
      if (err) return console.error('Error during load test:', err);

      this.results.performance = {
        average: results.latency.average,
        p95: results.latency.p95,
        errorRate: (results.errors / results.requests.total) * 100,
        throughput: results.throughput.average,
        totalRequests: results.requests.total,
        totalErrors: results.errors
      };
    });

    const progress = new PassThrough();
    progress.on('data', data => process.stdout.write(`\r${data.toString()}`));
    instance.on('tick', counters => progress.write(`\r📊 Requests: ${counters.totalRequests} | Errors: ${counters.errors} | Throughput: ${counters.throughput} bytes/sec`));
    instance.on('done', () => progress.end());

    autocannon.track(instance, { renderProgressBar: true });

    await new Promise(resolve => instance.on('done', resolve));
    console.log('\n' + colors.green + '⚡ Load Test Completed' + colors.reset);
  }

  showSummary() {
    this.results.duration = Date.now() - this.startTime;

    console.log(`\n${colors.cyan}${colors.bright}════════════════ SUMMARY ════════════════${colors.reset}`);
    console.log(`Total Functional Tests: ${this.results.total}`);
    console.log(`${colors.green}Passed: ${this.results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.results.failed}${colors.reset}`);
    console.log(`Duration: ${this.results.duration}ms`);

    const passRate = this.results.total === 0 ? 0 : (this.results.passed / this.results.total) * 100;
    console.log(`Pass Rate: ${passRate.toFixed(2)}%`);

    if (this.results.performance) {
      console.log('\n📈 Performance Metrics:');
      console.log(`   Avg Latency: ${this.results.performance.average}ms`);
      console.log(`   P95 Latency: ${this.results.performance.p95}ms`);
      console.log(`   Throughput: ${this.results.performance.throughput} bytes/sec`);
      console.log(`   Total Requests: ${this.results.performance.totalRequests}`);
      console.log(`   Total Errors: ${this.results.performance.totalErrors}`);
      console.log(`   Error Rate: ${this.results.performance.errorRate.toFixed(2)}%`);
    }
  }

  generateHTMLReport() {
    const filePath = path.join(REPORT_DIR, 'test-report.html');
    const perf = this.results.performance;

    const html = `
      <html>
      <head><title>Test Report</title></head>
      <body>
        <h1>E-Commerce API Report</h1>
        <h2>Functional Tests</h2>
        <p>Total: ${this.results.total}</p>
        <p>Passed: ${this.results.passed}</p>
        <p>Failed: ${this.results.failed}</p>
        <p>Duration: ${this.results.duration}ms</p>
        ${perf ? `
          <h2>Performance Tests</h2>
          <p>Avg Latency: ${perf.average}ms</p>
          <p>P95 Latency: ${perf.p95}ms</p>
          <p>Throughput: ${perf.throughput} bytes/sec</p>
          <p>Total Requests: ${perf.totalRequests}</p>
          <p>Total Errors: ${perf.totalErrors}</p>
          <p>Error Rate: ${perf.errorRate.toFixed(2)}%</p>
        ` : ''}
      </body>
      </html>
    `;
    fs.writeFileSync(filePath, html);
    console.log(`${colors.green}📊 HTML report generated: ${filePath}${colors.reset}`);
  }

  startDashboard() {
    const server = http.createServer((req, res) => {
      if (req.url === '/') {
        const html = fs.readFileSync(path.join(REPORT_DIR, 'test-report.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      }
    });
    server.listen(3001, () => console.log(`${colors.green}📊 Dashboard: http://localhost:3001${colors.reset}`));
  }
}

new TestRunner().runAllTests().catch(console.error);