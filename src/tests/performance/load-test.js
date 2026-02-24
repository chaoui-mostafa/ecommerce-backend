const autocannon = require('autocannon');
const { PassThrough } = require('stream');

function runLoadTest() {
  const url = 'http://localhost:5000';
  const connections = 50;
  const duration = 20;

  console.log(`Running load test @ ${url} with ${connections} connections for ${duration}s`);

  const instance = autocannon({
    url,
    connections,
    duration,
    requests: [
      { method: 'GET', path: '/api/health', title: 'Health Check' },
      { method: 'GET', path: '/api/products', title: 'Get Products' }
    ]
  }, (err, results) => {
    if (err) return console.error(err);
    console.log('Load Test Results:', results);
  });

  const progress = new PassThrough();
  progress.on('data', data => process.stdout.write(data));
  instance.on('tick', c => progress.write(`Reqs: ${c.totalRequests} Errors: ${c.errors}\r`));
  instance.on('done', () => progress.end());

  autocannon.track(instance, { renderProgressBar: true });
}

if (require.main === module) runLoadTest();
module.exports = { runLoadTest };