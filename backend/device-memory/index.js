'use strict';
const { db } = require('../db');

db.exec(`CREATE TABLE IF NOT EXISTS device_profiles (
  id TEXT PRIMARY KEY,
  device TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT DEFAULT '',
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  successful_repairs INTEGER NOT NULL DEFAULT 0,
  failed_repairs INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT ''
)`);
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_device_profile_unique ON device_profiles(device, brand, model, serial_number)`);

db.exec(`CREATE TABLE IF NOT EXISTS device_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id TEXT NOT NULL REFERENCES device_profiles(id),
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  created_at INTEGER NOT NULL
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_device_events_profile ON device_events(profile_id)`);

db.exec(`CREATE TABLE IF NOT EXISTS device_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id TEXT NOT NULL REFERENCES device_profiles(id),
  component_type TEXT NOT NULL,
  component_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'original',
  installed_at INTEGER,
  replaced_at INTEGER,
  health_percent REAL DEFAULT 100,
  notes TEXT DEFAULT ''
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_device_components_profile ON device_components(profile_id)`);

db.exec(`CREATE TABLE IF NOT EXISTS device_predictions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES device_profiles(id),
  prediction_type TEXT NOT NULL,
  component TEXT NOT NULL,
  current_value REAL,
  previous_value REAL,
  change_rate REAL,
  probability REAL NOT NULL,
  estimated_failure_date INTEGER,
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_device_predictions_profile ON device_predictions(profile_id)`);

function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function getOrCreateProfile(device, brand, model, serialNumber) {
  const existing = db.prepare(`SELECT * FROM device_profiles WHERE device = ? AND brand = ? AND model = ? AND serial_number = ?`).get(device, brand, model, serialNumber || '');
  if (existing) {
    db.prepare(`UPDATE device_profiles SET last_seen = ?, total_sessions = total_sessions + 1 WHERE id = ?`).run(Date.now(), existing.id);
    return existing;
  }
  const id = generateId('dev');
  const now = Date.now();
  db.prepare(`INSERT INTO device_profiles (id, device, brand, model, serial_number, first_seen, last_seen, total_sessions, successful_repairs, failed_repairs, notes) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 0, '')`).run(id, device, brand, model, serialNumber || '', now, now);
  return db.prepare(`SELECT * FROM device_profiles WHERE id = ?`).get(id);
}

function getProfile(device, brand, model, serialNumber) {
  return db.prepare(`SELECT * FROM device_profiles WHERE device = ? AND brand = ? AND model = ? AND serial_number = ?`).get(device, brand, model, serialNumber || '') || null;
}

function getProfileById(id) {
  return db.prepare(`SELECT * FROM device_profiles WHERE id = ?`).get(id) || null;
}

function getProfileSummary(profileId) {
  const profile = getProfileById(profileId);
  if (!profile) return null;

  const components = db.prepare(`SELECT * FROM device_components WHERE profile_id = ? ORDER BY component_type`).all(profileId);
  const events = db.prepare(`SELECT * FROM device_events WHERE profile_id = ? ORDER BY created_at DESC LIMIT 20`).all(profileId).map(e => ({ ...e, event_data: JSON.parse(e.event_data) }));
  const predictions = db.prepare(`SELECT * FROM device_predictions WHERE profile_id = ? AND acknowledged = 0 ORDER BY probability DESC`).all(profileId);
  const recentOutcomes = db.prepare(`SELECT * FROM repair_outcomes WHERE device = ? AND brand = ? AND model = ? ORDER BY created_at DESC LIMIT 10`).all(profile.device, profile.brand, profile.model);

  return {
    profile,
    components,
    recentEvents: events,
    activePredictions: predictions,
    recentRepairs: recentOutcomes,
  };
}

function recordEvent(profileId, eventType, eventData, severity) {
  const now = Date.now();
  db.prepare(`INSERT INTO device_events (profile_id, event_type, event_data, severity, created_at) VALUES (?, ?, ?, ?, ?)`).run(profileId, eventType, JSON.stringify(eventData), severity || 'info', now);
}

function trackComponent(profileId, componentType, componentName) {
  const existing = db.prepare(`SELECT * FROM device_components WHERE profile_id = ? AND component_type = ? AND component_name = ?`).get(profileId, componentType, componentName);
  if (existing) return existing;
  const now = Date.now();
  db.prepare(`INSERT INTO device_components (profile_id, component_type, component_name, status, installed_at, health_percent) VALUES (?, ?, ?, 'original', ?, 100)`).run(profileId, componentType, componentName, now);
  return db.prepare(`SELECT * FROM device_components WHERE profile_id = ? AND component_type = ? AND component_name = ?`).get(profileId, componentType, componentName);
}

function replaceComponent(profileId, componentType, componentName, newComponentName) {
  const now = Date.now();
  db.prepare(`UPDATE device_components SET status = 'replaced', replaced_at = ? WHERE profile_id = ? AND component_type = ? AND component_name = ?`).run(now, profileId, componentType, componentName);
  db.prepare(`INSERT INTO device_components (profile_id, component_type, component_name, status, installed_at, health_percent) VALUES (?, ?, ?, 'replacement', ?, 100)`).run(profileId, componentType, newComponentName, now);
  recordEvent(profileId, 'component_replaced', { componentType, oldName: componentName, newName: newComponentName }, 'info');
  return db.prepare(`SELECT * FROM device_components WHERE profile_id = ? AND component_type = ? AND component_name = ?`).get(profileId, componentType, newComponentName);
}

function updateComponentHealth(profileId, componentType, componentName, healthPercent) {
  db.prepare(`UPDATE device_components SET health_percent = ? WHERE profile_id = ? AND component_type = ? AND component_name = ?`).run(healthPercent, profileId, componentType, componentName);
  recordEvent(profileId, 'health_updated', { componentType, componentName, healthPercent }, healthPercent < 30 ? 'warning' : 'info');
}

function recordRepairOutcome(profileId, success) {
  if (success) {
    db.prepare(`UPDATE device_profiles SET successful_repairs = successful_repairs + 1 WHERE id = ?`).run(profileId);
    recordEvent(profileId, 'repair_success', {}, 'info');
  } else {
    db.prepare(`UPDATE device_profiles SET failed_repairs = failed_repairs + 1 WHERE id = ?`).run(profileId);
    recordEvent(profileId, 'repair_failed', {}, 'warning');
  }
}

// ---- Predictive Failure Detection ----

function generatePredictions(profileId) {
  const profile = getProfileById(profileId);
  if (!profile) return [];

  const predictions = [];
  const now = Date.now();

  const components = db.prepare(`SELECT * FROM device_components WHERE profile_id = ?`).all(profileId);
  const telemetry = db.prepare(`SELECT * FROM telemetry_reports WHERE device = ? AND brand = ? AND model = ? ORDER BY reported_at DESC LIMIT 50`).all(profile.device, profile.brand, profile.model);

  for (const component of components) {
    if (component.health_percent < 20) {
      const id = generateId('pred');
      const daysLeft = Math.round((component.health_percent / 5) * 30);
      const message = `${component.component_name} health critically low (${component.health_percent}%). Estimated ${daysLeft} days remaining.`;
      db.prepare(`INSERT OR IGNORE INTO device_predictions (id, profile_id, prediction_type, component, current_value, previous_value, change_rate, probability, estimated_failure_date, severity, message, created_at) VALUES (?, ?, 'component_failure', ?, ?, NULL, NULL, ?, ?, 'critical', ?, ?)`).run(id, profileId, component.component_name, component.health_percent, 0.9, now + daysLeft * 86400000, message, now);
      predictions.push({ id, type: 'component_failure', component: component.component_name, probability: 0.9, message });
    }
  }

  // SSD trend analysis from telemetry
  const smartReports = telemetry.filter(t => t.data_type === 'smart');
  if (smartReports.length >= 2) {
    const recent = smartReports.slice(0, 2);
    try {
      const current = JSON.parse(recent[0].data_json);
      const previous = JSON.parse(recent[1].data_json);
      const lifeDrop = (previous.remaining_life_percent || 100) - (current.remaining_life_percent || 100);
      if (lifeDrop > 0) {
        const ratePerMonth = lifeDrop * 30 / Math.max(1, (recent[0].reported_at - recent[1].reported_at) / 86400000);
        if (ratePerMonth > 5) {
          const monthsLeft = Math.round((current.remaining_life_percent || 0) / ratePerMonth);
          const id = generateId('pred');
          const message = `SSD health dropped ${lifeDrop}% since last check. Current: ${current.remaining_life_percent}%. Estimated ${monthsLeft} months remaining.`;
          db.prepare(`INSERT OR IGNORE INTO device_predictions (id, profile_id, prediction_type, component, current_value, previous_value, change_rate, probability, estimated_failure_date, severity, message, created_at) VALUES (?, ?, 'trend_analysis', 'SSD', ?, ?, ?, ?, ?, 'warning', ?, ?)`).run(id, profileId, current.remaining_life_percent, previous.remaining_life_percent, ratePerMonth, Math.min(ratePerMonth / 20, 0.9), now + monthsLeft * 30 * 86400000, message, now);
          predictions.push({ id, type: 'trend_analysis', component: 'SSD', probability: Math.min(ratePerMonth / 20, 0.9), message });
        }
      }
    } catch (e) { /* skip parse errors */ }
  }

  // Battery trend analysis
  const batteryReports = telemetry.filter(t => t.data_type === 'battery');
  if (batteryReports.length >= 2) {
    try {
      const recent = JSON.parse(batteryReports[0].data_json);
      const previous = JSON.parse(batteryReports[1].data_json);
      const wearIncrease = (recent.wear_level || 0) - (previous.wear_level || 0);
      if (wearIncrease > 0) {
        const ratePerMonth = wearIncrease * 30 / Math.max(1, (batteryReports[0].reported_at - batteryReports[1].reported_at) / 86400000);
        if (ratePerMonth > 3) {
          const monthsLeft = Math.round((100 - (recent.wear_level || 0)) / ratePerMonth);
          const id = generateId('pred');
          const message = `Battery wear increasing at ${ratePerMonth.toFixed(1)}%/month. Current: ${recent.wear_level}%. Estimated ${monthsLeft} months until replacement needed.`;
          db.prepare(`INSERT OR IGNORE INTO device_predictions (id, profile_id, prediction_type, component, current_value, previous_value, change_rate, probability, estimated_failure_date, severity, message, created_at) VALUES (?, ?, 'trend_analysis', 'Battery', ?, ?, ?, ?, ?, 'warning', ?, ?)`).run(id, profileId, recent.wear_level, previous.wear_level, ratePerMonth, Math.min(ratePerMonth / 10, 0.85), now + monthsLeft * 30 * 86400000, message, now);
          predictions.push({ id, type: 'trend_analysis', component: 'Battery', probability: Math.min(ratePerMonth / 10, 0.85), message });
        }
      }
    } catch (e) { /* skip */ }
  }

  return predictions;
}

function getActivePredictions(profileId) {
  return db.prepare(`SELECT * FROM device_predictions WHERE profile_id = ? AND acknowledged = 0 ORDER BY probability DESC`).all(profileId);
}

function acknowledgePrediction(predictionId) {
  db.prepare(`UPDATE device_predictions SET acknowledged = 1 WHERE id = ?`).run(predictionId);
}

function getAllProfiles(limit = 50) {
  return db.prepare(`SELECT * FROM device_profiles ORDER BY last_seen DESC LIMIT ?`).all(limit);
}

module.exports = {
  getOrCreateProfile,
  getProfile,
  getProfileById,
  getProfileSummary,
  recordEvent,
  trackComponent,
  replaceComponent,
  updateComponentHealth,
  recordRepairOutcome,
  generatePredictions,
  getActivePredictions,
  acknowledgePrediction,
  getAllProfiles,
};
