'use strict';
const express = require('express');
const telemetry = require('../telemetry');
const sanitize = require('../utils/sanitize');

const router = express.Router();

// Get supported data types
router.get('/telemetry/types', (req, res) => {
  try {
    const types = telemetry.getDataTypes();
    res.json({ dataTypes: types });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get data types' });
  }
});

// Submit telemetry data
router.post('/telemetry/report', (req, res) => {
  try {
    const device = sanitize(req.body.device, 50) || 'laptop';
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const dataType = sanitize(req.body.dataType, 50);
    const data = req.body.data || {};
    const clientVersion = sanitize(req.body.clientVersion, 50);
    if (!dataType) return res.status(400).json({ error: 'dataType is required' });
    const result = telemetry.submitTelemetry(device, brand, model, dataType, data, clientVersion);
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to submit telemetry' });
  }
});

// Submit full device snapshot
router.post('/telemetry/snapshot', (req, res) => {
  try {
    const device = sanitize(req.body.device, 50) || 'laptop';
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const snapshot = req.body.snapshot || {};
    const result = telemetry.submitSnapshot(device, brand, model, snapshot);
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to submit snapshot' });
  }
});

// Get telemetry history
router.get('/telemetry/history', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50) || 'laptop';
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const dataType = sanitize(req.query.dataType, 50);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const history = telemetry.getTelemetryHistory(device, brand, model, dataType, limit);
    res.json({ device, brand, model, reports: history });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Get latest telemetry
router.get('/telemetry/latest', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50) || 'laptop';
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const latest = telemetry.getLatestTelemetry(device, brand, model);
    res.json({ device, brand, model, telemetry: latest });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get latest telemetry' });
  }
});

// Get telemetry alerts
router.get('/telemetry/alerts', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50) || 'laptop';
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const alerts = telemetry.getTelemetryAlerts(device, brand, model, limit);
    res.json({ device, brand, model, alerts });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// Acknowledge alert
router.post('/telemetry/alerts/:id/acknowledge', (req, res) => {
  try {
    telemetry.acknowledgeAlert(req.params.id);
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Diagnostic correlation
router.post('/telemetry/correlate', (req, res) => {
  try {
    const device = sanitize(req.body.device, 50) || 'laptop';
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const symptoms = req.body.symptoms || [];
    const correlation = telemetry.getDiagnosticCorrelation(device, brand, model, symptoms);
    res.json(correlation);
  } catch (e) {
    res.status(500).json({ error: 'Failed to correlate' });
  }
});

module.exports = router;
