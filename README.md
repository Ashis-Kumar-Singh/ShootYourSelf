# FixItSelf — Open Repair Intelligence

**Free, unlimited device troubleshooting. Answer a few questions, get fixes from across the web.**

No API keys. No accounts. No databases to set up. Just Node.js and the open web.

---

## Intent

FixItSelf exists to democratize device repair. The project's core belief is that **nobody should pay to fix their own device** or be locked into manufacturer-authorized repair channels for simple troubleshooting. By scraping the open web — DuckDuckGo, Bing, Google, and YouTube — in parallel and intelligently ranking results, it surfaces the best existing guides, videos, and forum threads for any device problem, free of charge, with no accounts, no paywalls, and no tracking.

The name is a deliberate paradox: by taking repair into your own hands ("shoot yourself"), you gain independence from expensive repair services. You break things, you learn, and you fix them yourself.

---

## Features

- **11 device types** — Laptop, Phone, Tablet, Console, Desktop, Monitor, Printer, Smartwatch, Camera, Router, E-Reader
- **106 brands** — Acer, Apple, ASUS, Dell, HP, Lenovo, Samsung, Sony, and many more
- **67 problem categories** — Troubleshooting, Battery, Screen, RAM, SSD, Network, Drivers, and device-specific issues
- **Multi-engine search** — Queries DuckDuckGo, Bing, Google, and YouTube in parallel, then scores and deduplicates results
- **Smart ranking** — Domain authority scoring, upvote weighting, keyword relevance, type bonuses (guides/videos ranked higher)
- **Diagnostic questions** — 2-3 targeted questions per device/category before searching
- **Curated guides** — Hardcoded repair links from iFixit, manufacturer support, and trusted sources
- **Affiliate integration** — Amazon Associate links (configurable tag)
- **PWA support** — Offline-capable service worker, installable on mobile
- **Admin dashboard** — Feedback stats, search volume, engine health monitoring
- **Privacy-first** — No tracking, no cookies, no personal data collection
- **Docker ready** — Multi-stage build with Caddy reverse proxy and auto HTTPS

---

## How It Works

1. User picks a device type
2. Picks their brand
3. Enters their model number
4. Selects a problem category
5. Answers 2-3 diagnostic questions
6. App searches DuckDuckGo + Bing + Google + YouTube in parallel
7. Results are scored, deduplicated, ranked (0-100), and returned as the top 12
8. Users can upvote helpful results (persisted to SQLite)

---

## Quick Start

### Local (Node.js)

```bash
# Install dependencies
cd backend
npm install

# Start development server
node server.js
```

Open **http://localhost:3000**

### Docker (Production)

```bash
# Build and start with Caddy reverse proxy
docker compose up --build -d
```

Open **http://localhost** (Caddy on port 80)

---

## Setup Guide

### 1. Basic Setup

```bash
git clone <repo-url>
cd ShootYourSelf/backend
npm install
npm start
```

The server starts on `http://localhost:3000`. Visit it in your browser — the frontend is served automatically.

### 2. Environment Configuration

Copy or edit `backend/.env`:

```env
PORT=3000
NODE_ENV=development
DOMAIN=localhost

# Protect admin endpoints (/api/stats, /api/feedback, etc.)
# ADMIN_KEY=your-secret-key

# Cache TTL in milliseconds (default: 1 hour)
# CACHE_TTL=3600000

# Max cache entries (default: 2000)
# MAX_CACHE_ENTRIES=2000

# Fetch timeout in milliseconds (default: 15s)
# FETCH_TIMEOUT=15000

# HTTP/SOCKS proxy for outbound scraping
# PROXY_URL=http://customer-xxx:pass@proxy.example.com:22225

# Amazon affiliate tag
# AMAZON_AFFILIATE_TAG=shootyourself-20

# Block requests to private/internal IPs (default: true)
# BLOCK_PRIVATE_IPS=true
```

### 3. Docker Deployment

```bash
# Set your domain
export DOMAIN=example.com

# Deploy
docker compose up --build -d

# Check health
docker compose ps
docker compose logs app
```

The Docker setup runs two containers:
- **app** — Node.js server (internal port 3000, bound to 127.0.0.1)
- **caddy** — Caddy reverse proxy (ports 80/443, auto HTTPS via Let's Encrypt)

### 4. Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `DOMAIN` to your real domain
- [ ] Set `ADMIN_KEY` to a secure random value
- [ ] Update `AMAZON_AFFILIATE_TAG` if using your own
- [ ] Set `FETCH_TIMEOUT` appropriately (default 15s)
- [ ] Configure `PROXY_URL` if search engines block your server IP
- [ ] Verify healthcheck: `docker compose ps` should show `healthy`
- [ ] Run tests: `cd backend && npm test`

---

## Usage Guide

### Chat Interface

The main interface is at `/chat.html`. The guided flow:

1. **Select device** — Click a device card from the grid
2. **Select brand** — Click your manufacturer
3. **Enter model** — Type the exact model number (e.g., "Aspire 5 A515-56")
4. **Select category** — Choose your issue type
5. **Answer questions** — 2-3 quick diagnostic questions
6. **Get results** — Ranked list of guides, videos, and articles

Each result shows:
- **Type badge** — Video (red), Guide (green), Download (blue), Affiliate (yellow)
- **Source domain**
- **Title** with link
- **Snippet** preview
- **Upvote button** — Click to mark helpful

Source links (Google, DuckDuckGo, YouTube, Reddit, iFixit) appear below main results.

### Admin Dashboard

Visit `/admin.html` to access:
- **Dashboard** — Total feedback entries, helpful rate, per-device breakdown
- **Export Data** — View popular searches and upvote counts
- **Set Key** — Enter admin key if `ADMIN_KEY` is configured

### API

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| GET | `/api/config` | Public config (affiliate tag, version) | — |
| GET | `/api/health` | Health check with cache/engine stats | 30/min |
| GET | `/api/devices` | All device types with brands | 30/min |
| GET | `/api/categories?device=X` | Categories for a device | 30/min |
| GET | `/api/model-search?device=&brand=&model=&category=` | Search for fixes | 10/min |
| POST | `/api/upvote` | Upvote a result link | 30/min |
| POST | `/api/feedback` | Submit helpfulness feedback | 30/min |
| GET | `/api/popular` | Popular searches and upvotes | 30/min |
| GET | `/api/stats` | Feedback stats and engine health | 30/min |
| GET | `/api/cache-stats` | Cache statistics | 30/min |

**Auth:** If `ADMIN_KEY` is set, pass it as `?key=<key>` query param or `Authorization: Bearer <key>` header on protected endpoints.

### Health Check Script

A standalone health check script is available at `backend/health-check.js`:

```bash
node backend/health-check.js
```

It checks `/api/health` and exits with code 1 after 3 consecutive failures (useful for external monitoring).

---

## Project Structure

```
ShootYourself/
├── frontend/                      # Static frontend (vanilla HTML/CSS/JS)
│   ├── index.html                 # Home page with device grid
│   ├── chat.html                  # Guided diagnostic chat (main interface)
│   ├── admin.html                 # Admin dashboard
│   ├── community.html             # Community fixes & tips page
│   ├── vision.html                # Vision diagnostics page
│   ├── telemetry.html             # Telemetry analytics page
│   ├── device-memory.html         # Device profile manager page
│   ├── offline.html               # Offline packs page
│   ├── ar.html                    # AR repair assistant page
│   ├── ecosystem.html             # Ecosystem datasets page
│   ├── privacy.html               # Privacy policy
│   ├── 404.html                   # 404 error page
│   ├── styles.css                 # Shared stylesheet
│   ├── js/
│   │   ├── api.js                 # API client with retry/backoff
│   │   ├── app.js                 # Service worker registration
│   │   ├── chat.js                # Chat UI logic (diagnostic flow, search, results)
│   │   ├── admin.js               # Admin dashboard logic
│   │   ├── community.js           # Community page logic
│   │   ├── vision.js              # Vision page logic
│   │   ├── telemetry.js           # Telemetry page logic
│   │   ├── device-memory.js       # Device memory page logic
│   │   ├── offline.js             # Offline packs page logic
│   │   ├── ar.js                  # AR page logic
│   │   └── ecosystem.js           # Ecosystem page logic
│   ├── sw.js                      # Service worker (PWA offline support)
│   ├── manifest.json              # PWA manifest (standalone installable)
│   └── images/
│       └── symbol.svg             # App icon
│
├── backend/
│   ├── server.js                  # Express API server (routes, security, logging)
│   ├── scraper.js                 # Search engine scrapers + SQLite cache + ranking
│   ├── devices.js                 # Device definitions (11 types, 106 brands, 67 categories)
│   ├── health-check.js            # External monitoring script
│   ├── .env                       # Environment configuration
│   ├── package.json               # Dependencies and scripts
│   ├── routes/                    # API route handlers
│   │   ├── index.js               # Route aggregator
│   │   ├── search.js              # Search endpoints
│   │   ├── devices.js             # Device info endpoints
│   │   ├── diagnostic.js          # Diagnostic flow endpoints
│   │   ├── feedback.js            # User feedback endpoints
│   │   ├── stats.js               # Statistics endpoints
│   │   ├── sessions.js            # Repair session endpoints
│   │   ├── config.js              # Configuration endpoints
│   │   ├── events.js              # Event logging endpoints
│   │   ├── vision.js              # Vision analysis endpoints
│   │   ├── ar.js                  # AR overlay endpoints
│   │   ├── device-memory.js       # Device profile endpoints
│   │   ├── community.js           # Community data endpoints
│   │   ├── ecosystem.js           # Ecosystem data endpoints
│   │   ├── offline.js             # Offline pack endpoints
│   │   └── telemetry.js           # Telemetry endpoints
│   ├── db/
│   │   ├── index.js               # SQLite schema + prepared statements
│   │   └── repair-sessions.js     # Repair session persistence
│   ├── diagnostic/
│   │   ├── index.js               # Diagnostic engine entry
│   │   ├── failure-trees.js       # Failure mode trees (803 lines)
│   │   ├── adaptive-questions.js  # Adaptive questioning engine
│   │   ├── probability.js         # Probability scoring
│   │   └── trust-layer.js         # Confidence/trust scoring
│   ├── search/
│   │   ├── curated.js             # Curated search results
│   │   ├── ranking.js             # Result ranking & dedup
│   │   └── scrapers/              # (reserved for additional scrapers)
│   ├── vision/
│   │   ├── index.js               # Vision module entry
│   │   ├── detector.js            # Image detection logic
│   │   └── overlay.js             # Step overlay generation
│   ├── ar/
│   │   └── index.js               # AR model data + helpers
│   ├── telemetry/
│   │   ├── index.js               # Telemetry aggregation
│   │   └── correlation.js         # Alert correlation engine
│   ├── device-memory/
│   │   └── index.js               # Device profile management
│   ├── community/
│   │   └── index.js               # Community fixes & analytics
│   ├── ecosystem/
│   │   └── index.js               # Dataset publishing & export
│   ├── event/
│   │   └── logger.js              # Event logging to SQLite
│   ├── offline/
│   │   └── index.js               # Offline pack generation
│   ├── utils/
│   │   ├── errors.js              # Custom error classes
│   │   └── sanitize.js            # Input sanitization helpers
│   ├── data/                      # Runtime data (gitignored)
│   │   ├── shootyourself.db       # Main database
│   │   ├── feedback.json          # User feedback store
│   │   ├── popular.json           # Popular searches cache
│   │   ├── saved-solutions.json   # Saved solutions store
│   │   ├── logs/                  # Application logs
│   │   ├── backup/                # DB backups
│   │   └── uploads/               # Uploaded images
│   └── test/
│       ├── run-tests.js           # Test runner
│       ├── devices.test.js        # Device definition tests
│       └── scraper.test.js        # Scraper utility tests
│
├── Caddyfile                      # Caddy reverse proxy config
├── Dockerfile                     # Multi-stage Docker build (node:22-alpine)
├── docker-compose.yml             # App + Caddy services
├── .github/workflows/ci.yml       # GitHub Actions CI pipeline
├── revolution.md                  # Roadmap & vision document
├── .gitignore
└── .dockerignore
```

---

## Configuration Reference

All settings are environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP listen port |
| `NODE_ENV` | `development` | `production` enables CSP, HSTS, restricted CORS, access logging |
| `DOMAIN` | `localhost` | Used for CSP, CORS, sitemap, and HTTPS |
| `ADMIN_KEY` | — | If set, admin endpoints require this key via header or query |
| `CACHE_TTL` | `3600000` | Search cache TTL in ms (1 hour) |
| `MAX_CACHE_ENTRIES` | `2000` | Max cached search results |
| `TOP_K` | `12` | Max results returned per search |
| `MAX_RETRIES` | `2` | Max fetch retries per search engine |
| `FETCH_TIMEOUT` | `15000` | Per-request fetch timeout in ms |
| `PROXY_URL` | — | HTTP/SOCKS proxy for outbound fetches |
| `AMAZON_AFFILIATE_TAG` | `shootyourself-20` | Amazon Associate tag |
| `BLOCK_PRIVATE_IPS` | `true` | Block fetches to private/internal IP ranges (SSRF protection) |
| `TRUST_PROXY_COUNT` | `1` | Number of trusted proxy hops (for rate limiting behind Caddy) |
| `HTTPS` | `false` | Enable Node.js HTTPS (requires cert.pem + key.pem in data/certs/) |

---

## Security

| Layer | Implementation |
|-------|---------------|
| **CSP** | Content-Security-Policy with `'self'` sources |
| **HSTS** | `max-age=31536000; includeSubDomains; preload` in production |
| **CORS** | Restricted to `https://DOMAIN` in production |
| **Rate limiting** | 30 req/min general API, 10 req/min search |
| **CSRF** | JSON content-type required on all POST requests |
| **SSRF** | Blocks fetches to `127.x`, `10.x`, `172.16-31.x`, `192.168.x`, `localhost`, `.local`, `.internal` |
| **Input validation** | `sanitize()` strips `<>"'&` and enforces max length on all user input |
| **Helmet** | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| **Auth** | Optional `ADMIN_KEY` for admin endpoints (Bearer token or query param) |
| **Non-root** | Docker container runs as `node` user |
| **Init** | `tini` as PID 1 for proper signal handling |
| **Dependency audit** | CI runs `npm audit --audit-level=high` weekly |
| **Data cleanup** | Feedback pruned after 90 days, cache trimmed, old backups removed |

---

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express 5
- **Scraping:** `fetch` + `cheerio` (HTML parsing)
- **Search engines:** DuckDuckGo, Bing, Google, YouTube
- **Cache:** SQLite via `better-sqlite3` (WAL mode)
- **Rate limiting:** `express-rate-limit` (sliding window)
- **Security:** `helmet`, `cors`, input sanitization
- **Logging:** `morgan` (access) + structured JSON (search)
- **Compression:** `compression` (gzip level 6)
- **Frontend:** Vanilla HTML/CSS/JS (no frameworks)
- **PWA:** Service worker + manifest
- **Reverse proxy:** Caddy 2 (auto HTTPS, HSTS)
- **Containerization:** Docker multi-stage (`node:22-alpine`)
- **CI:** GitHub Actions (test + security audit)

---

## Testing

```bash
cd backend
npm test
```

15 unit tests covering:
- Device definitions (11 types, brands, categories)
- Query building and placeholder replacement
- Scraper engine health and cache stats
- Source URL generation
- Category retrieval for all devices

---

## License

ISC
