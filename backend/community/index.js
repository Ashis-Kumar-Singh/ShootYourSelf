'use strict';
const { db } = require('../db');

// ===== REPAIR ANALYTICS (2.1 + 2.2) =====

function getRepairSuccessRate(device, brand, model) {
  const row = db.prepare(`SELECT COUNT(*) as total, SUM(success) as successes FROM repair_outcomes WHERE device = ? AND brand = ? AND model = ?`).get(device, brand, model);
  if (!row || row.total === 0) return null;
  return {
    total: row.total,
    successes: row.successes || 0,
    rate: Math.round(((row.successes || 0) / row.total) * 100),
  };
}

function getTopFixes(device, brand, model, limit = 10) {
  return db.prepare(`
    SELECT fix_url, fix_title, COUNT(*) as count, SUM(success) as successes
    FROM repair_outcomes
    WHERE device = ? AND brand = ? AND model = ? AND fix_url IS NOT NULL
    GROUP BY fix_url
    ORDER BY count DESC
    LIMIT ?
  `).all(device, brand, model, limit).map(r => ({
    ...r,
    successRate: r.count > 0 ? Math.round((r.successes / r.count) * 100) : 0,
  }));
}

function getDeviceStats(device) {
  const sessionCount = db.prepare(`SELECT COUNT(*) as c FROM repair_sessions WHERE device = ?`).get(device).c;
  const outcomeCount = db.prepare(`SELECT COUNT(*) as c FROM repair_outcomes WHERE device = ?`).get(device).c;
  const successRate = getRepairSuccessRate(device, '', '');
  return { device, sessionCount, outcomeCount, successRate };
}

function getAllDevicesStats() {
  const devices = db.prepare(`SELECT DISTINCT device FROM repair_outcomes`).all();
  return devices.map(d => getDeviceStats(d.device));
}

function getGlobalAnalytics() {
  const totalOutcomes = db.prepare(`SELECT COUNT(*) as c FROM repair_outcomes`).get().c;
  const totalSuccesses = db.prepare(`SELECT SUM(success) as s FROM repair_outcomes`).get().s || 0;
  const totalSessions = db.prepare(`SELECT COUNT(*) as c FROM repair_sessions`).get().c;
  const deviceBreakdown = db.prepare(`
    SELECT device, COUNT(*) as total, SUM(success) as successes
    FROM repair_outcomes GROUP BY device ORDER BY total DESC
  `).all().map(r => ({
    device: r.device,
    total: r.total,
    successes: r.successes || 0,
    rate: r.total > 0 ? Math.round(((r.successes || 0) / r.total) * 100) : 0,
  }));
  const topBrands = db.prepare(`
    SELECT brand, COUNT(*) as total FROM repair_outcomes
    WHERE brand != '' GROUP BY brand ORDER BY total DESC LIMIT 10
  `).all();
  return {
    totalOutcomes,
    totalSuccesses,
    overallRate: totalOutcomes > 0 ? Math.round((totalSuccesses / totalOutcomes) * 100) : 0,
    totalSessions,
    deviceBreakdown,
    topBrands,
  };
}

// ===== TECHNICIAN LAYER (2.3) =====

function generateId() {
  return 'tech_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function generateFixId() {
  return 'fix_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function generateWarningId() {
  return 'warn_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function generateReportId() {
  return 'rep_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function createTechnicianProfile(displayName, bio, specialties) {
  const id = generateId();
  const now = Date.now();
  db.prepare(`INSERT INTO technician_profiles (id, display_name, bio, specialties, verified, badge, reputation, total_contributions, accepted_fixes, created_at, updated_at) VALUES (?, ?, ?, ?, 0, '', 0, 0, 0, ?, ?)`).run(id, displayName, bio || '', JSON.stringify(specialties || []), now, now);
  return { id, displayName, bio: bio || '', specialties: specialties || [] };
}

function getTechnicianProfile(id) {
  const row = db.prepare(`SELECT * FROM technician_profiles WHERE id = ?`).get(id);
  if (!row) return null;
  return { ...row, specialties: JSON.parse(row.specialties || '[]') };
}

function updateTechnicianReputation(technicianId) {
  const contributions = db.prepare(`SELECT COUNT(*) as c FROM community_fixes WHERE technician_id = ?`).get(technicianId).c;
  const acceptedFixes = db.prepare(`SELECT COUNT(*) as c FROM community_fixes WHERE technician_id = ? AND status = 'approved'`).get(technicianId).c;
  const totalVotes = db.prepare(`
    SELECT COALESCE(SUM(tv.vote), 0) as s FROM technician_votes tv
    JOIN community_fixes cf ON tv.fix_id = cf.id
    WHERE cf.technician_id = ?
  `).get(technicianId).s || 0;
  const reputation = (acceptedFixes * 50) + (contributions * 10) + (totalVotes * 2);
  const now = Date.now();
  let badge = '';
  if (reputation >= 500) badge = 'expert';
  else if (reputation >= 200) badge = 'senior_technician';
  else if (reputation >= 50) badge = 'technician';
  else if (acceptedFixes >= 1) badge = 'contributor';

  db.prepare(`UPDATE technician_profiles SET reputation = ?, total_contributions = ?, accepted_fixes = ?, badge = ?, updated_at = ? WHERE id = ?`).run(reputation, contributions, acceptedFixes, badge, now, technicianId);
  return { reputation, badge };
}

function submitCommunityFix(technicianId, device, brand, model, category, title, description, steps, symptoms) {
  const id = generateFixId();
  const now = Date.now();
  db.prepare(`INSERT INTO community_fixes (id, technician_id, device, brand, model, category, title, description, steps, symptoms, success_count, failure_count, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'pending', ?, ?)`).run(id, technicianId, device, brand, model, category, title, description, JSON.stringify(steps || []), JSON.stringify(symptoms || []), now, now);
  updateTechnicianReputation(technicianId);
  return { id, title };
}

function approveCommunityFix(fixId) {
  const fix = db.prepare(`SELECT * FROM community_fixes WHERE id = ?`).get(fixId);
  if (!fix) return null;
  const now = Date.now();
  db.prepare(`UPDATE community_fixes SET status = 'approved', updated_at = ? WHERE id = ?`).run(now, fixId);
  updateTechnicianReputation(fix.technician_id);
  return { id: fixId, status: 'approved' };
}

function voteOnCommunityFix(fixId, voterId, vote) {
  const now = Date.now();
  db.prepare(`INSERT INTO technician_votes (fix_id, voter_id, vote, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(fix_id, voter_id) DO UPDATE SET vote = excluded.vote`).run(fixId, voterId, vote, now);
  const fix = db.prepare(`SELECT technician_id FROM community_fixes WHERE id = ?`).get(fixId);
  if (fix) updateTechnicianReputation(fix.technician_id);
  return { fixId, vote };
}

function getCommunityFixes(device, brand, model, limit = 20) {
  let fixes;
  if (device) {
    fixes = db.prepare(`SELECT * FROM community_fixes WHERE device = ? AND brand = ? AND model = ? ORDER BY created_at DESC LIMIT ?`).all(device, brand || '', model || '', limit);
  } else {
    fixes = db.prepare(`SELECT * FROM community_fixes ORDER BY created_at DESC LIMIT ?`).all(limit);
  }
  return fixes.map(f => ({
    ...f,
    steps: JSON.parse(f.steps),
    symptoms: JSON.parse(f.symptoms),
  }));
}

function getTechnicianLeaderboard(limit = 20) {
  return db.prepare(`SELECT id, display_name, badge, reputation, total_contributions, accepted_fixes FROM technician_profiles ORDER BY reputation DESC LIMIT ?`).all(limit).map(t => ({
    ...t,
    level: t.reputation >= 500 ? 'Expert' : t.reputation >= 200 ? 'Senior Technician' : t.reputation >= 50 ? 'Technician' : 'Contributor',
  }));
}

// ===== REPAIR WARNINGS =====

function submitRepairWarning(device, brand, model, category, warning, severity) {
  const id = generateWarningId();
  const now = Date.now();
  db.prepare(`INSERT INTO repair_warnings (id, device, brand, model, category, warning, severity, upvotes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`).run(id, device, brand, model, category, warning, severity || 'info', now);
  return { id, warning, severity };
}

function getRepairWarnings(device, brand, model) {
  return db.prepare(`SELECT * FROM repair_warnings WHERE device = ? AND brand = ? AND model = ? ORDER BY severity DESC, upvotes DESC`).all(device, brand, model);
}

function upvoteWarning(warningId) {
  db.prepare(`UPDATE repair_warnings SET upvotes = upvotes + 1 WHERE id = ?`).run(warningId);
  return db.prepare(`SELECT upvotes FROM repair_warnings WHERE id = ?`).get(warningId).upvotes;
}

// ===== FAILURE REPORTS / HEATMAPS (2.4) =====

function submitFailureReport(device, brand, model, category, symptom, failure, repairAttempted, successful, region) {
  const id = generateReportId();
  const now = Date.now();
  db.prepare(`INSERT INTO failure_reports (id, device, brand, model, category, symptom, failure, repair_attempted, successful, region, reported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, device, brand, model, category, symptom, failure, repairAttempted || '', successful ? 1 : 0, region || '', now);

  db.prepare(`INSERT INTO failure_patterns (device, brand, model, symptom, failure, frequency, success_rate, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT(device, brand, model, symptom, failure) DO UPDATE SET frequency = frequency + 1, success_rate = (success_rate * (frequency - 1) + ?) / frequency, updated_at = excluded.updated_at`).run(device, brand, model, symptom, failure, successful ? 1 : 0, now, successful ? 1 : 0);

  return { id };
}

function getFailureHeatmap(device, brand, model) {
  const rows = db.prepare(`
    SELECT f.symptom, f.failure, COUNT(*) as occurrences, SUM(f.successful) as successes
    FROM failure_reports f
    WHERE f.device = ? AND f.brand = ? AND f.model = ?
    GROUP BY f.symptom, f.failure
    ORDER BY occurrences DESC
    LIMIT 20
  `).all(device, brand, model);
  const totalReports = rows.reduce((s, r) => s + r.occurrences, 0);
  return rows.map(r => ({
    symptom: r.symptom,
    failure: r.failure,
    occurrences: r.occurrences,
    percentage: totalReports > 0 ? Math.round((r.occurrences / totalReports) * 100) : 0,
    successRate: r.occurrences > 0 ? Math.round(((r.successes || 0) / r.occurrences) * 100) : 0,
  }));
}

function getBrandReliability(brand, limit = 10) {
  return db.prepare(`
    SELECT f.device, f.brand, f.model, COUNT(*) as reports,
           SUM(f.successful) as fixes,
           ROUND(CAST(SUM(f.successful) AS REAL) / COUNT(*) * 100, 1) as fixRate
    FROM failure_reports f
    WHERE f.brand = ?
    GROUP BY f.device, f.brand, f.model
    ORDER BY reports DESC
    LIMIT ?
  `).all(brand, limit);
}

function getFailureTrends(device, brand, model) {
  const raw = db.prepare(`
    SELECT symptom, failure, COUNT(*) as count
    FROM failure_reports
    WHERE device = ? AND brand = ? AND model = ?
    GROUP BY symptom, failure
    ORDER BY count DESC
    LIMIT 15
  `).all(device, brand, model);

  const mostCommon = raw.slice(0, 3).map(r => `${r.symptom}: ${r.failure} (${r.count} reports)`);
  const total = raw.reduce((s, r) => s + r.count, 0);

  return {
    device, brand, model,
    totalReports: total,
    topFailures: raw.map(r => ({
      label: `${r.symptom} → ${r.failure}`,
      count: r.count,
      percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
    })),
    summary: mostCommon,
    riskLevel: total > 20 ? 'high' : total > 5 ? 'medium' : 'low',
  };
}

module.exports = {
  getRepairSuccessRate,
  getTopFixes,
  getDeviceStats,
  getAllDevicesStats,
  getGlobalAnalytics,
  createTechnicianProfile,
  getTechnicianProfile,
  submitCommunityFix,
  approveCommunityFix,
  voteOnCommunityFix,
  getCommunityFixes,
  getTechnicianLeaderboard,
  submitRepairWarning,
  getRepairWarnings,
  upvoteWarning,
  submitFailureReport,
  getFailureHeatmap,
  getBrandReliability,
  getFailureTrends,
};
