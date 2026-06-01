'use strict';
const express = require('express');
const eventLog = require('../event/logger');
const sanitize = require('../utils/sanitize');

const router = express.Router();

// Log an event
router.post('/events', (req, res) => {
  try {
    const sessionId = sanitize(req.body.sessionId, 100) || null;
    const eventType = sanitize(req.body.eventType, 50);
    const eventData = req.body.eventData || {};
    const deviceContext = {
      device: sanitize(req.body.device, 50),
      brand: sanitize(req.body.brand, 100),
      model: sanitize(req.body.model, 200),
    };

    if (!eventType) return res.status(400).json({ error: 'eventType is required' });
    eventLog.logEvent(sessionId, eventType, eventData, deviceContext);

    res.status(201).json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to log event' });
  }
});

// Get events for a session
router.get('/events/session/:sessionId', (req, res) => {
  try {
    const events = eventLog.getSessionEvents(req.params.sessionId);
    res.json({ events });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get events by type
router.get('/events/type/:type', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const events = eventLog.getEventsByType(req.params.type, limit);
    res.json({ events });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get event stats
router.get('/events/stats', (req, res) => {
  try {
    const stats = eventLog.getEventStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get event stats' });
  }
});

module.exports = router;
