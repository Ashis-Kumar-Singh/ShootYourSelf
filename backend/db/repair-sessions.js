'use strict';
const { db } = require('./index');

const insertSession = db.prepare(`INSERT INTO repair_sessions (id, device, brand, model, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`);
const updateSession = db.prepare(`UPDATE repair_sessions SET status = ?, updated_at = ?, completed_at = ?, outcome = ? WHERE id = ?`);
const getSession = db.prepare(`SELECT * FROM repair_sessions WHERE id = ?`);
const listSessions = db.prepare(`SELECT * FROM repair_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?`);
const countSessions = db.prepare(`SELECT COUNT(*) as c FROM repair_sessions`);

const insertStep = db.prepare(`INSERT INTO repair_steps (session_id, step_type, step_data, created_at) VALUES (?, ?, ?, ?)`);
const getSteps = db.prepare(`SELECT * FROM repair_steps WHERE session_id = ? ORDER BY created_at ASC`);

const insertOutcome = db.prepare(`INSERT INTO repair_outcomes (session_id, device, brand, model, category, symptoms, fix_url, fix_title, success, duration, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const getOutcomes = db.prepare(`SELECT * FROM repair_outcomes ORDER BY created_at DESC LIMIT ? OFFSET ?`);
const getOutcomesByDevice = db.prepare(`SELECT * FROM repair_outcomes WHERE device = ? AND brand = ? AND model = ? ORDER BY created_at DESC LIMIT ?`);

const upsertDiagnosticPath = db.prepare(`INSERT INTO diagnostic_paths (device, brand, model, category, path, success, count, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT(device, brand, model, category, path) DO UPDATE SET count = count + 1, success = CASE WHEN ? THEN success + 1 ELSE success END, updated_at = excluded.updated_at`);
const getDiagnosticPaths = db.prepare(`SELECT * FROM diagnostic_paths WHERE device = ? AND brand = ? AND model = ? ORDER BY count DESC LIMIT ?`);

const upsertFailurePattern = db.prepare(`INSERT INTO failure_patterns (device, brand, model, symptom, failure, frequency, success_rate, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?) ON CONFLICT(device, brand, model, symptom, failure) DO UPDATE SET frequency = frequency + 1, success_rate = ?, updated_at = excluded.updated_at`);
const getFailurePatterns = db.prepare(`SELECT * FROM failure_patterns WHERE device = ? AND brand = ? AND model = ? ORDER BY frequency DESC LIMIT ?`);

function generateId() {
  return 'ses_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function createSession(device, brand, model, category) {
  const id = generateId();
  const now = Date.now();
  insertSession.run(id, device, brand, model, category, now, now);
  return { id, device, brand, model, category, status: 'active', created_at: now };
}

function getSessionById(id) {
  return getSession.get(id) || null;
}

function completeSession(id, outcome) {
  const now = Date.now();
  updateSession.run('completed', now, now, outcome, id);
}

function abandonSession(id) {
  const now = Date.now();
  updateSession.run('abandoned', now, now, null, id);
}

function listAllSessions(limit = 50, offset = 0) {
  return listSessions.all(limit, offset);
}

function getSessionCount() {
  return countSessions.get().c;
}

function addStep(sessionId, stepType, stepData) {
  const now = Date.now();
  insertStep.run(sessionId, stepType, JSON.stringify(stepData), now);
  return { session_id: sessionId, step_type: stepType, created_at: now };
}

function getSessionSteps(sessionId) {
  return getSteps.all(sessionId).map(s => ({ ...s, step_data: JSON.parse(s.step_data) }));
}

function recordOutcome(sessionId, device, brand, model, category, symptoms, fixUrl, fixTitle, success, duration, notes) {
  const now = Date.now();
  insertOutcome.run(sessionId, device, brand, model, category, JSON.stringify(symptoms), fixUrl || null, fixTitle || null, success ? 1 : 0, duration || null, notes || null, now);

  if (symptoms && symptoms.length > 0) {
    for (const symptom of symptoms) {
      const pathStr = JSON.stringify([{ type: 'symptom', value: symptom }]);
      upsertDiagnosticPath.run(device, brand, model, category, pathStr, success ? 1 : 0, now, success ? 1 : 0);
    }
  }

  return { session_id: sessionId, success };
}

function getRecentOutcomes(limit = 50, offset = 0) {
  return getOutcomes.all(limit, offset);
}

function getOutcomesForDevice(device, brand, model, limit = 20) {
  return getOutcomesByDevice.all(device, brand, model, limit);
}

function getFailurePatternsForDevice(device, brand, model, limit = 20) {
  return getFailurePatterns.all(device, brand, model, limit);
}

module.exports = {
  createSession,
  getSessionById,
  completeSession,
  abandonSession,
  listAllSessions,
  getSessionCount,
  addStep,
  getSessionSteps,
  recordOutcome,
  getRecentOutcomes,
  getOutcomesForDevice,
  getFailurePatternsForDevice,
};
