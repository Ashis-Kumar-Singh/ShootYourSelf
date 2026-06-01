'use strict';
require('dotenv').config();
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const scraper = require("./scraper");
const devices = require("./devices");
const { errorHandler } = require("./utils/errors");
const db = require("./db");
const apiRoutes = require("./routes");

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const NODE_ENV = (process.env.NODE_ENV || 'development').trim();
const isProd = NODE_ENV === 'production';
const DOMAIN = process.env.DOMAIN || 'localhost';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const TRUST_PROXY = parseInt(process.env.TRUST_PROXY_COUNT || '1', 10);

app.set('trust proxy', TRUST_PROXY);

// ---- Security with proper CSP ----
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: isProd ? { maxAge: 31536000, preload: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  next();
});

app.use(compression({ level: 6, threshold: 512 }));
app.use(cors({
  origin: isProd ? ['https://' + DOMAIN] : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  maxAge: 86400,
}));
app.use(express.json({ limit: '10kb' }));

// CSRF protection: POST endpoints require JSON content type (prevents form CSRF)
app.use('/api/', (req, res, next) => {
  if (req.method === 'POST' && !req.is('json') && !req.path.startsWith('/api/health')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

// ---- Admin auth middleware ----
const ADMIN_PROTECTED = ['/api/stats', '/api/feedback', '/api/popular', '/api/cache-stats'];
function adminAuth(req, res, next) {
  if (!ADMIN_KEY) return next();
  if (!ADMIN_PROTECTED.some(p => req.path.startsWith(p))) return next();
  const key = req.query.key || (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));
  if (key === ADMIN_KEY) return next();
  return res.status(401).json({ error: 'Unauthorized. Provide ?key=... or Authorization: Bearer ...' });
}
app.use('/api/', adminAuth);

// ---- Rate limiting ----
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: isProd ? 30 : 120,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Try again in a minute.' },
});
app.use('/api/', apiLimiter);

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, max: isProd ? 10 : 40,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Search rate limit reached. Wait a moment.' },
});
app.use('/api/model-search', searchLimiter);

// ---- Modular Routes ----
app.use('/api/', apiRoutes);

// ---- Logging ----
const logDir = path.join(__dirname, 'data', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

if (isProd) {
  const MAX_LOG_SIZE = 10 * 1024 * 1024;
  function createLogStream(name) {
    const logPath = path.join(logDir, name);
    try {
      if (fs.existsSync(logPath) && fs.statSync(logPath).size > MAX_LOG_SIZE) {
        const rotated = path.join(logDir, name + '.1');
        if (fs.existsSync(rotated)) fs.unlinkSync(rotated);
        fs.renameSync(logPath, rotated);
      }
    } catch (e) { /* skip */ }
    return fs.createWriteStream(logPath, { flags: 'a' });
  }
  let accessStream = createLogStream('access.log');
  setInterval(() => {
    try {
      const p = path.join(logDir, 'access.log');
      if (fs.existsSync(p) && fs.statSync(p).size > MAX_LOG_SIZE) {
        accessStream.end();
        const rotated = p + '.1';
        if (fs.existsSync(rotated)) fs.unlinkSync(rotated);
        fs.renameSync(p, rotated);
        accessStream = createLogStream('access.log');
      }
    } catch (e) { /* skip */ }
  }, 60000).unref();
  app.use(morgan('combined', { stream: accessStream }));
} else {
  app.use(morgan('dev'));
}

// ---- SEO ----
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nAllow: /\nSitemap: https://' + DOMAIN + '/sitemap.xml\n');
});

app.get('/sitemap.xml', (req, res) => {
  const urls = [
    { loc: 'https://' + DOMAIN + '/', priority: '1.0' },
    { loc: 'https://' + DOMAIN + '/chat.html', priority: '0.9' },
    { loc: 'https://' + DOMAIN + '/privacy.html', priority: '0.3' },
  ];
  for (const [id, dev] of Object.entries(devices.DEVICES)) {
    urls.push({ loc: 'https://' + DOMAIN + '/chat.html?device=' + id, priority: '0.7' });
    for (const brand of dev.brands) {
      urls.push({ loc: 'https://' + DOMAIN + '/chat.html?device=' + id + '&brand=' + brand.id, priority: '0.5' });
    }
  }
  res.type('application/xml');
  res.send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => '  <url>\n    <loc>' + u.loc + '</loc>\n    <priority>' + u.priority + '</priority>\n  </url>').join('\n') +
    '\n</urlset>');
});

// ---- Static files ----
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath, { maxAge: isProd ? '1d' : 0, etag: true, lastModified: true }));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  const four04 = path.join(frontendPath, '404.html');
  if (req.path !== '/' && !req.path.includes('.')) {
    return res.status(404).sendFile(four04);
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ---- Error handler ----
app.use(errorHandler);

// ---- Graceful shutdown ----
function shutdown(signal) {
  console.log("\n  " + signal + " received. Shutting down gracefully...");
  server.close(() => {
    console.log("  HTTP server closed.");
    try { const dbConn = require('./db').getDb(); if (dbConn) dbConn.close(); } catch (e) { /* skip */ }
    console.log("  Database closed.");
    process.exit(0);
  });
  // Destroy all tracked sockets to force port cleanup
  for (const socket of sockets) {
    socket.destroy();
  }
  sockets.clear();
  setTimeout(() => { console.error("  Forced shutdown after timeout."); process.exit(1); }, 10000).unref();
}

// ---- Track sockets so we can force-destroy on shutdown ----
const sockets = new Set();
let nextSocketId = 0;

// ---- Start ----
const server = http.createServer(app);
server.on('connection', (socket) => {
  const id = nextSocketId++;
  sockets.add(socket);
  socket._shootId = id;
  socket.on('close', () => sockets.delete(socket));
});
server.headersTimeout = 8000;
server.keepAliveTimeout = 5000;

if (process.env.HTTPS === 'true') {
  const certDir = path.join(__dirname, 'data', 'certs');
  const certPath = path.join(certDir, 'cert.pem');
  const keyPath = path.join(certDir, 'key.pem');
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    https.createServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, app).listen(443, () => {
      console.log("  HTTPS:    https://" + DOMAIN);
    });
  }
}

server.listen(PORT, () => {
  console.log("");
  console.log("  ShootYourSelf v2.0");
  console.log("  " + (isProd ? "https" : "http") + "://" + DOMAIN + ":" + PORT);
  console.log("  Environment: " + NODE_ENV);
  console.log("  Devices:  " + Object.keys(devices.DEVICES).length + " types, " + Object.values(devices.DEVICES).reduce((s, d) => s + d.brands.length, 0) + " brands, " + Object.values(devices.DEVICES).reduce((s, d) => s + Object.keys(d.categories).length, 0) + " categories");
  console.log("  Search:   DuckDuckGo + Bing + Google + YouTube (parallel, retry, UA rotation, affiliates)");
  console.log("  Cache:    SQLite, " + scraper.getCacheStats().ttlHours + "h TTL, max " + scraper.getCacheStats().max + " entries");
  console.log("  Security: CSP active, rate-limited, helmet headers, CORS restricted");
  console.log("  Logging:  Structured JSON + access log");
  console.log("  Modules:  Sessions + Events + Diagnostic Engine + Community System");
  console.log("  Zero config. Zero API keys.");
  console.log("");
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
