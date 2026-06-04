'use strict';
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const DB_PATH = path.join(DATA_DIR, 'shootyourself.db');
const RUNTIME_DB_PATH = path.join(DATA_DIR, 'shootyourself-runtime.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function openWritableDatabase(dbPath) {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  return sqlite;
}

function createDatabase() {
  try {
    return openWritableDatabase(DB_PATH);
  } catch (error) {
    const isReadonly = error && (error.code === 'SQLITE_READONLY' || /readonly/i.test(error.message || ''));
    if (!isReadonly) throw error;
    console.warn('  Database: primary file is read-only, using runtime database at ' + RUNTIME_DB_PATH);
    return openWritableDatabase(RUNTIME_DB_PATH);
  }
}

const db = createDatabase();

// ---- Schema ----
db.exec(`CREATE TABLE IF NOT EXISTS search_cache (
  key TEXT PRIMARY KEY, data TEXT NOT NULL, ts INTEGER NOT NULL
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_search_cache_ts ON search_cache(ts)`);

db.exec(`CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issueId TEXT NOT NULL,
  helpful INTEGER NOT NULL DEFAULT 0,
  device TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  model TEXT DEFAULT '',
  category TEXT DEFAULT '',
  timestamp TEXT NOT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS popular_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  device TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  model TEXT DEFAULT '',
  category TEXT DEFAULT '',
  count INTEGER DEFAULT 1,
  ts INTEGER NOT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS upvotes (
  link TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1
)`);

// ---- Phase 0: Repair Session Model ----
db.exec(`CREATE TABLE IF NOT EXISTS repair_sessions (
  id TEXT PRIMARY KEY,
  device TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER,
  outcome TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS repair_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES repair_sessions(id),
  step_type TEXT NOT NULL,
  step_data TEXT NOT NULL,
  created_at INTEGER NOT NULL
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_repair_steps_session ON repair_steps(session_id)`);

db.exec(`CREATE TABLE IF NOT EXISTS repair_outcomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES repair_sessions(id),
  device TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  fix_url TEXT,
  fix_title TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  duration INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_repair_outcomes_session ON repair_outcomes(session_id)`);

db.exec(`CREATE TABLE IF NOT EXISTS diagnostic_paths (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  path TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  count INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  UNIQUE(device, brand, model, category, path)
)`);

db.exec(`CREATE TABLE IF NOT EXISTS failure_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  symptom TEXT NOT NULL,
  failure TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  success_rate REAL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  UNIQUE(device, brand, model, symptom, failure)
)`);

// ---- Phase 0: Event Logging ----
db.exec(`CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL,
  device TEXT,
  brand TEXT,
  model TEXT,
  created_at INTEGER NOT NULL
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_event_log_session ON event_log(session_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_event_log_type ON event_log(event_type)`);

// ---- Phase 2: Community Repair Intelligence ----
db.exec(`CREATE TABLE IF NOT EXISTS technician_profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  specialties TEXT DEFAULT '[]',
  verified INTEGER NOT NULL DEFAULT 0,
  badge TEXT DEFAULT '',
  reputation INTEGER NOT NULL DEFAULT 0,
  total_contributions INTEGER NOT NULL DEFAULT 0,
  accepted_fixes INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS community_fixes (
  id TEXT PRIMARY KEY,
  technician_id TEXT REFERENCES technician_profiles(id),
  device TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS repair_warnings (
  id TEXT PRIMARY KEY,
  device TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  warning TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  source TEXT DEFAULT 'community',
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS failure_reports (
  id TEXT PRIMARY KEY,
  device TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL,
  symptom TEXT NOT NULL,
  failure TEXT NOT NULL,
  repair_attempted TEXT DEFAULT '',
  successful INTEGER NOT NULL DEFAULT 0,
  region TEXT DEFAULT '',
  reported_at INTEGER NOT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS technician_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fix_id TEXT NOT NULL REFERENCES community_fixes(id),
  voter_id TEXT NOT NULL,
  vote INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(fix_id, voter_id)
)`);

// ---- Prepared statements ----
const stmts = {
  getCache: db.prepare(`SELECT data, ts FROM search_cache WHERE key = ?`),
  setCache: db.prepare(`INSERT OR REPLACE INTO search_cache (key, data, ts) VALUES (?, ?, ?)`),
  deleteStaleCache: db.prepare(`DELETE FROM search_cache WHERE ts < ?`),
  countCache: db.prepare(`SELECT COUNT(*) as c FROM search_cache`),
  deleteOldestCache: db.prepare(`DELETE FROM search_cache WHERE key IN (SELECT key FROM search_cache ORDER BY ts ASC LIMIT ?)`),
  insertFeedback: db.prepare(`INSERT INTO feedback (issueId, helpful, device, brand, model, category, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`),
  upsertUpvote: db.prepare(`INSERT INTO upvotes (link, count) VALUES (?, 1) ON CONFLICT(link) DO UPDATE SET count = count + 1`),
  getUpvotes: db.prepare(`SELECT link, count FROM upvotes`),
  upsertPopularSearch: db.prepare(`INSERT INTO popular_searches (key, device, brand, model, category, count, ts) VALUES (?, ?, ?, ?, ?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1, ts = excluded.ts`),
  getPopularSearches: db.prepare(`SELECT key, device, brand, model, category, count, ts FROM popular_searches ORDER BY count DESC, ts DESC LIMIT 100`),
};

function getDb() { return db; }

function backupDb() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const backupPath = path.join(BACKUP_DIR, 'shootyourself-backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.db');
    db.backup(backupPath);
    return backupPath;
  } catch (e) {
    console.error('Backup failed:', e.message);
    return null;
  }
}

function addFeedback(issueId, helpful, device, brand, model, category) {
  stmts.insertFeedback.run(issueId, helpful ? 1 : 0, device || '', brand || '', model || '', category || '', new Date().toISOString());
}

function addUpvote(link) {
  stmts.upsertUpvote.run(link);
}

function getUpvotes() {
  const rows = stmts.getUpvotes.all();
  const map = {};
  for (const r of rows) map[r.link] = r.count;
  return map;
}

function recordPopularSearch(device, brand, model, category) {
  const key = device + '|' + brand + '|' + model + '|' + category;
  stmts.upsertPopularSearch.run(key, device, brand, model, category, Date.now());
}

function getPopularSearches() {
  return stmts.getPopularSearches.all();
}

function getFeedbackStats() {
  const total = db.prepare(`SELECT COUNT(*) as c FROM feedback`).get().c;
  const helpful = db.prepare(`SELECT COUNT(*) as c FROM feedback WHERE helpful = 1`).get().c;
  const byDeviceRows = db.prepare(`SELECT device, COUNT(*) as total, SUM(helpful) as helpful FROM feedback GROUP BY device`).all();
  const byDevice = {};
  for (const r of byDeviceRows) {
    byDevice[r.device || 'unknown'] = { total: r.total, helpful: r.helpful || 0 };
  }
  return { total, helpful, byDevice };
}

function pruneCache(CACHE_TTL, MAX_CACHE_ENTRIES) {
  const deleted = stmts.deleteStaleCache.run(Date.now() - CACHE_TTL);
  if (deleted.changes > 0) return;
  const c = stmts.countCache.get().c;
  if (c > MAX_CACHE_ENTRIES) {
    const trim = c - MAX_CACHE_ENTRIES;
    db.prepare(`DELETE FROM search_cache WHERE key IN (SELECT key FROM search_cache ORDER BY ts ASC LIMIT ?)`).run(trim);
  }
}

function getCacheStats(CACHE_TTL, MAX_CACHE_ENTRIES) {
  const row = stmts.countCache.get();
  return { total: row.c, max: MAX_CACHE_ENTRIES, ttlHours: CACHE_TTL / 3600000 };
}

module.exports = {
  db,
  stmts,
  getDb,
  backupDb,
  pruneCache,
  getCacheStats,
  getUpvotes,
  addUpvote,
  addFeedback,
  getFeedbackStats,
  recordPopularSearch,
  getPopularSearches,
  BACKUP_DIR,
  DATA_DIR,
};
