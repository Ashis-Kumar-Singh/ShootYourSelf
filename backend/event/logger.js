'use strict';
const { db } = require('../db');

const insertEvent = db.prepare(`INSERT INTO event_log (session_id, event_type, event_data, device, brand, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
const getEventsBySession = db.prepare(`SELECT * FROM event_log WHERE session_id = ? ORDER BY created_at ASC`);
const getEventsByTypeStmt = db.prepare(`SELECT * FROM event_log WHERE event_type = ? ORDER BY created_at DESC LIMIT ?`);
const getEventsByDevice = db.prepare(`SELECT * FROM event_log WHERE device = ? ORDER BY created_at DESC LIMIT ?`);
const countEvents = db.prepare(`SELECT COUNT(*) as c FROM event_log`);
const countEventsByType = db.prepare(`SELECT event_type, COUNT(*) as c FROM event_log GROUP BY event_type`);

const VALID_EVENT_TYPES = [
  'symptom_selected',
  'user_action',
  'guide_clicked',
  'search_refined',
  'repair_success',
  'flow_abandoned',
  'search_executed',
  'question_answered',
  'result_viewed',
  'feedback_submitted',
  'session_started',
];

function logEvent(sessionId, eventType, eventData, deviceContext) {
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    console.warn('Unknown event type:', eventType);
  }
  const now = Date.now();
  const data = eventData || {};
  insertEvent.run(
    sessionId || null,
    eventType,
    JSON.stringify(data),
    (deviceContext && deviceContext.device) || null,
    (deviceContext && deviceContext.brand) || null,
    (deviceContext && deviceContext.model) || null,
    now
  );
}

function getSessionEvents(sessionId) {
  return getEventsBySession.all(sessionId).map(e => ({
    ...e,
    event_data: JSON.parse(e.event_data),
  }));
}

function getEventsByType(type, limit = 100) {
  return getEventsByTypeStmt.all(type, limit).map(e => ({
    ...e,
    event_data: JSON.parse(e.event_data),
  }));
}

function getDeviceEvents(device, limit = 100) {
  return getEventsByDevice.all(device, limit).map(e => ({
    ...e,
    event_data: JSON.parse(e.event_data),
  }));
}

function getEventStats() {
  const total = countEvents.get().c;
  const byType = countEventsByType.all();
  const breakdown = {};
  for (const row of byType) {
    breakdown[row.event_type] = row.c;
  }
  return { total, breakdown };
}

module.exports = {
  logEvent,
  getSessionEvents,
  getEventsByType,
  getDeviceEvents,
  getEventStats,
  VALID_EVENT_TYPES,
};
