'use strict';
const express = require('express');
const deviceMemory = require('../device-memory');
const sanitize = require('../utils/sanitize');

const router = express.Router();

// Create or get device profile
router.post('/devices/profile', (req, res) => {
  try {
    const device = sanitize(req.body.device, 50) || 'laptop';
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const serialNumber = sanitize(req.body.serialNumber, 100);
    const profile = deviceMemory.getOrCreateProfile(device, brand, model, serialNumber);
    res.status(201).json({ profile });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Get device profiles
router.get('/devices/profiles', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50);
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const serialNumber = sanitize(req.query.serialNumber, 100);
    if (device && brand && model) {
      const profile = deviceMemory.getProfile(device, brand, model, serialNumber);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });
      return res.json({ profile });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const profiles = deviceMemory.getAllProfiles(limit);
    res.json({ profiles });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get profiles' });
  }
});

// Get profile summary
router.get('/devices/profiles/:id', (req, res) => {
  try {
    const summary = deviceMemory.getProfileSummary(req.params.id);
    if (!summary) return res.status(404).json({ error: 'Profile not found' });
    res.json(summary);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Track a component
router.post('/devices/profiles/:id/components', (req, res) => {
  try {
    const componentType = sanitize(req.body.componentType, 50);
    const componentName = sanitize(req.body.componentName, 200);
    if (!componentType || !componentName) return res.status(400).json({ error: 'componentType and componentName required' });
    const component = deviceMemory.trackComponent(req.params.id, componentType, componentName);
    res.status(201).json({ component });
  } catch (e) {
    res.status(500).json({ error: 'Failed to track component' });
  }
});

// Replace component
router.post('/devices/profiles/:id/components/replace', (req, res) => {
  try {
    const componentType = sanitize(req.body.componentType, 50);
    const componentName = sanitize(req.body.componentName, 200);
    const newComponentName = sanitize(req.body.newComponentName, 200);
    if (!componentType || !componentName || !newComponentName) {
      return res.status(400).json({ error: 'componentType, componentName, and newComponentName required' });
    }
    const result = deviceMemory.replaceComponent(req.params.id, componentType, componentName, newComponentName);
    res.json({ component: result });
  } catch (e) {
    res.status(500).json({ error: 'Failed to replace component' });
  }
});

// Update component health
router.post('/devices/profiles/:id/components/health', (req, res) => {
  try {
    const componentType = sanitize(req.body.componentType, 50);
    const componentName = sanitize(req.body.componentName, 200);
    const healthPercent = Math.min(100, Math.max(0, parseFloat(req.body.healthPercent) || 100));
    if (!componentType || !componentName) return res.status(400).json({ error: 'componentType and componentName required' });
    deviceMemory.updateComponentHealth(req.params.id, componentType, componentName, healthPercent);
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update health' });
  }
});

// Record event
router.post('/devices/profiles/:id/events', (req, res) => {
  try {
    const eventType = sanitize(req.body.eventType, 50);
    const eventData = req.body.eventData || {};
    const severity = sanitize(req.body.severity, 20) || 'info';
    if (!eventType) return res.status(400).json({ error: 'eventType is required' });
    deviceMemory.recordEvent(req.params.id, eventType, eventData, severity);
    res.status(201).json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to record event' });
  }
});

// Generate predictions
router.post('/devices/profiles/:id/predict', (req, res) => {
  try {
    const predictions = deviceMemory.generatePredictions(req.params.id);
    res.json({ predictions, count: predictions.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

// Get active predictions
router.get('/devices/profiles/:id/predictions', (req, res) => {
  try {
    const predictions = deviceMemory.getActivePredictions(req.params.id);
    res.json({ predictions });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get predictions' });
  }
});

// Acknowledge prediction
router.post('/devices/predictions/:id/acknowledge', (req, res) => {
  try {
    deviceMemory.acknowledgePrediction(req.params.id);
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to acknowledge prediction' });
  }
});

// Record repair outcome
router.post('/devices/profiles/:id/repair-outcome', (req, res) => {
  try {
    const success = !!req.body.success;
    deviceMemory.recordRepairOutcome(req.params.id, success);
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to record outcome' });
  }
});

module.exports = router;
