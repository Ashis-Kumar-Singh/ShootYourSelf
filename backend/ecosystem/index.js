'use strict';
const { db } = require('../db');

db.exec(`CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT 'read',
  rate_limit INTEGER DEFAULT 60,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1
)`);

db.exec(`CREATE TABLE IF NOT EXISTS ecosystem_datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  size_bytes INTEGER DEFAULT 0,
  record_count INTEGER DEFAULT 0,
  data_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  published INTEGER NOT NULL DEFAULT 0
)`);

function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// ---- Public API access ----

const PUBLIC_ENDPOINTS = {
  'device-info': {
    description: 'Get device information, brands, and categories',
    path: '/api/v1/devices',
    method: 'GET',
  },
  'diagnostic-trees': {
    description: 'Get diagnostic failure trees for a device',
    path: '/api/v1/diagnostic/trees/:device',
    method: 'GET',
  },
  'repair-outcomes': {
    description: 'Get anonymized repair outcomes',
    path: '/api/v1/outcomes',
    method: 'GET',
  },
  'community-fixes': {
    description: 'Get community-submitted fixes',
    path: '/api/v1/fixes',
    method: 'GET',
  },
  'failure-trends': {
    description: 'Get hardware failure trends and heatmaps',
    path: '/api/v1/trends',
    method: 'GET',
  },
  'telemetry-insights': {
    description: 'Get anonymized telemetry insights',
    path: '/api/v1/telemetry',
    method: 'GET',
  },
  'reliability-scores': {
    description: 'Get device reliability scores',
    path: '/api/v1/reliability',
    method: 'GET',
  },
};

function getApiSpec() {
  return {
    apiVersion: '1.0',
    baseUrl: '/api/v1',
    description: 'Open Repair Intelligence API — Anonymous, rate-limited access to repair data',
    authentication: 'Optional API key via Authorization: Bearer <key> header. Higher rate limits with key.',
    rateLimits: { anonymous: '10 req/min', authenticated: '60 req/min', premium: '300 req/min' },
    endpoints: PUBLIC_ENDPOINTS,
  };
}

// ---- Dataset publishing ----

function publishDataset(name, description, data) {
  const id = generateId('ds');
  const now = Date.now();
  const dataStr = JSON.stringify(data);
  const recordCount = Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 1);
  db.prepare(`INSERT INTO ecosystem_datasets (id, name, description, version, size_bytes, record_count, data_json, created_at, published) VALUES (?, ?, ?, '1.0', ?, ?, ?, ?, 1)`).run(id, name, description, Buffer.byteLength(dataStr, 'utf8'), recordCount, dataStr, now);
  return { id, name, recordCount, sizeBytes: Buffer.byteLength(dataStr, 'utf8') };
}

function listDatasets(publishedOnly, limit = 20) {
  if (publishedOnly) {
    return db.prepare(`SELECT id, name, description, version, size_bytes, record_count, created_at FROM ecosystem_datasets WHERE published = 1 ORDER BY created_at DESC LIMIT ?`).all(limit);
  }
  return db.prepare(`SELECT id, name, description, version, size_bytes, record_count, created_at FROM ecosystem_datasets ORDER BY created_at DESC LIMIT ?`).all(limit);
}

function getDataset(id) {
  const row = db.prepare(`SELECT * FROM ecosystem_datasets WHERE id = ?`).get(id);
  if (!row) return null;
  return { ...row, data: JSON.parse(row.data_json) };
}

// ---- Anonymized data export ----

function exportAnonymizedOutcomes(limit = 1000) {
  const rows = db.prepare(`SELECT device, brand, model, category, symptoms, success, duration, created_at FROM repair_outcomes ORDER BY created_at DESC LIMIT ?`).all(limit);
  return rows.map(r => ({
    ...r,
    symptoms: (() => { try { return JSON.parse(r.symptoms); } catch { return r.symptoms; } })(),
  }));
}

function exportFailurePatterns(limit = 500) {
  return db.prepare(`SELECT device, brand, model, symptom, failure, frequency, success_rate FROM failure_patterns ORDER BY frequency DESC LIMIT ?`).all(limit);
}

function exportAnonymizedTelemetry(limit = 500) {
  return db.prepare(`SELECT device, data_type, data_json, reported_at FROM telemetry_reports ORDER BY reported_at DESC LIMIT ?`).all(limit).map(r => ({
    device: r.device,
    dataType: r.data_type,
    data: JSON.parse(r.data_json),
    reportedAt: r.reported_at,
  }));
}

function exportReliabilityReport() {
  const deviceStats = db.prepare(`
    SELECT ro.device, ro.brand, ro.model, COUNT(*) as total, SUM(ro.success) as successes,
           ROUND(CAST(SUM(ro.success) AS REAL) / COUNT(*) * 100, 1) as fixRate
    FROM repair_outcomes ro
    GROUP BY ro.device, ro.brand, ro.model
    HAVING total >= 3
    ORDER BY fixRate ASC
  `).all();

  const brandAverages = {};
  for (const stat of deviceStats) {
    if (!brandAverages[stat.brand]) brandAverages[stat.brand] = { total: 0, successes: 0, models: 0 };
    brandAverages[stat.brand].total += stat.total;
    brandAverages[stat.brand].successes += stat.successes;
    brandAverages[stat.brand].models++;
  }

  const brandReliability = Object.entries(brandAverages).map(([brand, data]) => ({
    brand,
    totalRepairs: data.total,
    successRate: data.total > 0 ? Math.round((data.successes / data.total) * 100) : 0,
    modelsTracked: data.models,
  })).sort((a, b) => a.successRate - b.successRate);

  return {
    generatedAt: Date.now(),
    totalDeviceModels: deviceStats.length,
    brandsTracked: brandReliability.length,
    leastReliable: brandReliability.slice(0, 10),
    mostReliable: brandReliability.slice(-10).reverse(),
    deviceDetails: deviceStats.sort((a, b) => a.fixRate - b.fixRate).slice(0, 20),
  };
}

module.exports = {
  getApiSpec,
  publishDataset,
  listDatasets,
  getDataset,
  exportAnonymizedOutcomes,
  exportFailurePatterns,
  exportAnonymizedTelemetry,
  exportReliabilityReport,
  PUBLIC_ENDPOINTS,
};
