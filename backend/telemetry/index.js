'use strict';
const { db } = require('../db');
const correlation = require('./correlation');

const DATA_TYPES = {
  smart: ['temperature', 'power_cycle_count', 'reallocated_sectors', 'pending_sectors', 'uncorrectable_sectors', 'percentage_used', 'total_bytes_written', 'total_bytes_read', 'remaining_life_percent', 'status'],
  battery: ['cycle_count', 'design_capacity', 'full_charge_capacity', 'current_capacity', 'voltage', 'temperature', 'wear_level', 'charge_rate', 'discharge_rate', 'health_percent', 'status'],
  cpu: ['temperature', 'load_percent', 'clock_speed', 'voltage', 'power_draw', 'core_count', 'thread_count', 'max_temperature', 'throttling_percent'],
  system: ['os_version', 'bios_version', 'uptime_seconds', 'total_ram', 'used_ram', 'available_ram', 'disk_usage_percent', 'process_count', 'last_bsod_time', 'bsod_count_30days', 'error_count_24h'],
  gpu: ['temperature', 'load_percent', 'memory_used', 'memory_total', 'voltage', 'clock_speed', 'fan_speed_percent', 'driver_version'],
  storage: ['model', 'firmware', 'interface', 'capacity_bytes', 'used_bytes', 'health_percent', 'temperature', 'power_on_hours'],
};

const DATA_TYPE_UNITS = {
  smart: { temperature: '°C', power_cycle_count: 'count', reallocated_sectors: 'sectors', remaining_life_percent: '%', total_bytes_written: 'TB' },
  battery: { cycle_count: 'count', design_capacity: 'mAh', full_charge_capacity: 'mAh', wear_level: '%', voltage: 'V', temperature: '°C', health_percent: '%' },
  cpu: { temperature: '°C', load_percent: '%', clock_speed: 'GHz', voltage: 'V', power_draw: 'W' },
  gpu: { temperature: '°C', load_percent: '%', memory_used: 'MB', voltage: 'V', fan_speed_percent: '%' },
};

// ---- Schema ----
db.exec(`CREATE TABLE IF NOT EXISTS telemetry_reports (
  id TEXT PRIMARY KEY,
  device TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  data_type TEXT NOT NULL,
  data_json TEXT NOT NULL,
  client_version TEXT DEFAULT '',
  reported_at INTEGER NOT NULL
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_telemetry_device ON telemetry_reports(device, brand, model)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_reports(data_type)`);

db.exec(`CREATE TABLE IF NOT EXISTS telemetry_alerts (
  id TEXT PRIMARY KEY,
  device TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  metric TEXT NOT NULL,
  value REAL,
  threshold REAL,
  message TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
)`);

db.exec(`CREATE TABLE IF NOT EXISTS telemetry_snapshots (
  id TEXT PRIMARY KEY,
  device TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  reported_at INTEGER NOT NULL
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_snapshots_device ON telemetry_snapshots(device, brand, model, reported_at)`);

function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// ---- Submit telemetry data ----
function submitTelemetry(device, brand, model, dataType, data, clientVersion) {
  if (!DATA_TYPES[dataType]) return { error: `Unknown data type: ${dataType}. Valid: ${Object.keys(DATA_TYPES).join(', ')}` };
  const id = generateId('tel');
  const now = Date.now();
  db.prepare(`INSERT INTO telemetry_reports (id, device, brand, model, data_type, data_json, client_version, reported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, device, brand, model, dataType, JSON.stringify(data), clientVersion || '', now);
  const alerts = generateAlerts(device, brand, model, dataType, data);
  return { id, alertsGenerated: alerts.length, alerts };
}

function submitSnapshot(device, brand, model, snapshot) {
  const id = generateId('snap');
  const now = Date.now();
  db.prepare(`INSERT INTO telemetry_snapshots (id, device, brand, model, snapshot_json, reported_at) VALUES (?, ?, ?, ?, ?, ?)`).run(id, device, brand, model, JSON.stringify(snapshot), now);
  return { id };
}

function getTelemetryHistory(device, brand, model, dataType, limit = 50) {
  if (dataType) {
    return db.prepare(`SELECT * FROM telemetry_reports WHERE device = ? AND brand = ? AND model = ? AND data_type = ? ORDER BY reported_at DESC LIMIT ?`).all(device, brand, model, dataType, limit).map(r => ({ ...r, data: JSON.parse(r.data_json) }));
  }
  return db.prepare(`SELECT * FROM telemetry_reports WHERE device = ? AND brand = ? AND model = ? ORDER BY reported_at DESC LIMIT ?`).all(device, brand, model, limit).map(r => ({ ...r, data: JSON.parse(r.data_json) }));
}

function getLatestTelemetry(device, brand, model) {
  const types = Object.keys(DATA_TYPES);
  const result = {};
  for (const type of types) {
    const row = db.prepare(`SELECT * FROM telemetry_reports WHERE device = ? AND brand = ? AND model = ? AND data_type = ? ORDER BY reported_at DESC LIMIT 1`).get(device, brand, model, type);
    if (row) result[type] = { ...row, data: JSON.parse(row.data_json) };
  }
  return result;
}

function getTelemetryAlerts(device, brand, model, limit = 50) {
  return db.prepare(`SELECT * FROM telemetry_alerts WHERE device = ? AND brand = ? AND model = ? ORDER BY created_at DESC LIMIT ?`).all(device, brand, model, limit);
}

function acknowledgeAlert(alertId) {
  db.prepare(`UPDATE telemetry_alerts SET acknowledged = 1 WHERE id = ?`).run(alertId);
}

// ---- Alert generation ----
function generateAlerts(device, brand, model, dataType, data) {
  const alerts = [];
  const now = Date.now();

  const rules = {
    smart: {
      temperature: { max: 60, severity: 'warning', msg: v => `SSD temperature high: ${v}°C` },
      reallocated_sectors: { max: 10, severity: 'critical', msg: v => `${v} reallocated sectors detected. Drive may be failing.` },
      remaining_life_percent: { min: 10, severity: 'critical', msg: v => `SSD remaining life: ${v}%. Backup and replace soon.` },
      pending_sectors: { max: 5, severity: 'warning', msg: v => `${v} pending sectors. Possible drive issues.` },
    },
    battery: {
      wear_level: { max: 30, severity: 'warning', msg: v => `Battery wear level: ${v}%. Consider replacement.` },
      temperature: { max: 45, severity: 'warning', msg: v => `Battery temperature high: ${v}°C` },
      health_percent: { min: 50, severity: 'critical', msg: v => `Battery health: ${v}%. Replace soon.` },
    },
    cpu: {
      temperature: { max: 85, severity: 'warning', msg: v => `CPU temperature: ${v}°C. Check cooling.` },
      throttling_percent: { min: 10, severity: 'warning', msg: v => `CPU throttling at ${v}%. Thermal issue.` },
      max_temperature: { max: 95, severity: 'critical', msg: v => `CPU max temperature: ${v}°C. Critical.` },
    },
    gpu: {
      temperature: { max: 85, severity: 'warning', msg: v => `GPU temperature: ${v}°C. Check cooling.` },
    },
  };

  const typeRules = rules[dataType];
  if (!typeRules) return alerts;

  for (const [metric, rule] of Object.entries(typeRules)) {
    const value = data[metric];
    if (value === undefined || value === null) continue;
    let triggered = false;
    if (rule.max !== undefined && value > rule.max) triggered = true;
    if (rule.min !== undefined && value < rule.min) triggered = true;
    if (triggered) {
      const id = generateId('alert');
      const severity = value > (rule.max || 0) * 1.2 ? 'critical' : rule.severity;
      db.prepare(`INSERT INTO telemetry_alerts (id, device, brand, model, alert_type, severity, metric, value, threshold, message, acknowledged, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`).run(id, device, brand, model, dataType, severity, metric, value, rule.max || rule.min || 0, rule.msg(value), now);
      alerts.push({ id, metric, value, severity, message: rule.msg(value) });
    }
  }

  return alerts;
}

function getDataTypes() {
  return Object.entries(DATA_TYPES).map(([type, metrics]) => ({
    type,
    metrics: metrics.map(m => ({
      name: m,
      unit: (DATA_TYPE_UNITS[type] && DATA_TYPE_UNITS[type][m]) || '',
    })),
  }));
}

function getDiagnosticCorrelation(device, brand, model, symptoms) {
  const telemetry = getLatestTelemetry(device, brand, model);
  const outcomes = db.prepare(`SELECT * FROM repair_outcomes WHERE device = ? AND brand = ? AND model = ? ORDER BY created_at DESC LIMIT 10`).all(device, brand, model);
  const alerts = getTelemetryAlerts(device, brand, model, 20);
  return correlation.correlate(device, brand, model, symptoms, telemetry, outcomes, alerts);
}

module.exports = {
  submitTelemetry,
  submitSnapshot,
  getTelemetryHistory,
  getLatestTelemetry,
  getTelemetryAlerts,
  acknowledgeAlert,
  getDiagnosticCorrelation,
  getDataTypes,
  DATA_TYPES,
};
