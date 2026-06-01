'use strict';
const http = require('http');
const https = require('https');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const WEBHOOK_URL = process.env.HEALTH_WEBHOOK_URL || '';
const CHECK_INTERVAL = 5 * 60 * 1000;

let failureCount = 0;

function getTimestamp() {
  return new Date().toISOString();
}

function log(level, message) {
  console.log(`[${getTimestamp()}] [${level}] ${message}`);
}

function sendWebhook(message) {
  if (!WEBHOOK_URL) return;

  const url = new URL(WEBHOOK_URL);
  const client = url.protocol === 'https:' ? https : http;
  const payload = JSON.stringify({ text: message });

  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  const req = client.request(options, (res) => {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      log('WARN', `Webhook returned status ${res.statusCode}`);
    }
  });

  req.on('error', (err) => {
    log('WARN', `Webhook failed: ${err.message}`);
  });

  req.write(payload);
  req.end();
}

function performCheck() {
  const url = new URL(SERVER_URL + '/api/health');

  const client = url.protocol === 'https:' ? https : http;

  const req = client.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        log('INFO', `Health check passed (${res.statusCode})`);
        failureCount = 0;
      } else {
        handleFailure(`Health check failed with status ${res.statusCode}`);
      }
    });
  });

  req.on('error', (err) => {
    handleFailure(`Health check connection error: ${err.message}`);
  });

  req.setTimeout(10000, () => {
    req.destroy();
    handleFailure('Health check timed out after 10s');
  });
}

function handleFailure(reason) {
  failureCount++;
  log('ERROR', `${reason} (failure ${failureCount}/3)`);

  if (failureCount === 1 && WEBHOOK_URL) {
    sendWebhook(`:warning: Health check failure: ${reason}`);
  }

  if (failureCount >= 3) {
    log('CRITICAL', '3 consecutive failures — exiting with code 1');
    if (WEBHOOK_URL) {
      sendWebhook(`:red_circle: Health check CRITICAL — 3 consecutive failures. Exiting.`);
    }
    process.exit(1);
  }
}

log('INFO', `Starting health checks against ${SERVER_URL} every ${CHECK_INTERVAL / 1000}s`);
performCheck();
setInterval(performCheck, CHECK_INTERVAL);
