'use strict';
const express = require('express');
const sessions = require('../db/repair-sessions');
const eventLog = require('../event/logger');
const sanitize = require('../utils/sanitize');

const router = express.Router();

// Create a new repair session
router.post('/sessions', (req, res) => {
  try {
    const device = sanitize(req.body.device, 50) || 'laptop';
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const category = sanitize(req.body.category, 50) || 'troubleshooting';
    const session = sessions.createSession(device, brand, model, category);

    eventLog.logEvent(session.id, 'session_started', { device, brand, model, category });

    res.status(201).json({ session });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session by ID
router.get('/sessions/:id', (req, res) => {
  try {
    const session = sessions.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const steps = sessions.getSessionSteps(req.params.id);
    res.json({ session, steps });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Add step to session
router.post('/sessions/:id/steps', (req, res) => {
  try {
    const stepType = sanitize(req.body.stepType, 50);
    const stepData = req.body.stepData || {};
    if (!stepType) return res.status(400).json({ error: 'stepType is required' });

    const session = sessions.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const step = sessions.addStep(req.params.id, stepType, stepData);

    const eventTypeMap = {
      question: 'question_answered',
      search: 'search_executed',
      guide_view: 'guide_clicked',
    };
    const eventType = eventTypeMap[stepType] || 'user_action';
    eventLog.logEvent(req.params.id, eventType, stepData, session);

    res.status(201).json({ step });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add step' });
  }
});

// Complete session
router.post('/sessions/:id/complete', (req, res) => {
  try {
    const session = sessions.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const outcome = sanitize(req.body.outcome, 50);
    sessions.completeSession(req.params.id, outcome || 'fixed');

    const symptoms = req.body.symptoms || [];
    const fixUrl = sanitize(req.body.fixUrl, 2000);
    const fixTitle = sanitize(req.body.fixTitle, 500);
    const duration = parseInt(req.body.duration, 10) || null;

    sessions.recordOutcome(
      req.params.id,
      session.device, session.brand, session.model, session.category,
      symptoms, fixUrl, fixTitle, outcome === 'fixed', duration, null
    );

    const eventType = outcome === 'fixed' ? 'repair_success' : 'flow_abandoned';
    eventLog.logEvent(req.params.id, eventType, { outcome, fixUrl, fixTitle, duration }, session);

    res.json({ status: 'ok', sessionId: req.params.id });
  } catch (e) {
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

// Abandon session
router.post('/sessions/:id/abandon', (req, res) => {
  try {
    const session = sessions.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    sessions.abandonSession(req.params.id);
    eventLog.logEvent(req.params.id, 'flow_abandoned', { reason: sanitize(req.body.reason, 500) }, session);
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to abandon session' });
  }
});

// List sessions
router.get('/sessions', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const list = sessions.listAllSessions(limit, offset);
    const total = sessions.getSessionCount();
    res.json({ sessions: list, total, limit, offset });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// List outcomes
router.get('/outcomes', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const list = sessions.getRecentOutcomes(limit, offset);
    res.json({ outcomes: list, limit, offset });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list outcomes' });
  }
});

// Failure patterns for a device
router.get('/failure-patterns', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50) || 'laptop';
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const patterns = sessions.getFailurePatternsForDevice(device, brand, model, limit);
    res.json({ patterns });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get failure patterns' });
  }
});

module.exports = router;
