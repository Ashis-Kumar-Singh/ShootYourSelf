'use strict';
const express = require('express');
const ecosystem = require('../ecosystem');

const router = express.Router();

// API specification
router.get('/v1', (req, res) => {
  try {
    const spec = ecosystem.getApiSpec();
    res.json(spec);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get API spec' });
  }
});

// --- Public API Endpoints ---

router.get('/v1/devices', (req, res) => {
  try {
    const devices = require('../devices');
    const list = Object.entries(devices.DEVICES).map(([id, d]) => ({
      id, name: d.name, icon: d.icon,
      brands: d.brands.map(b => b.name),
      categories: Object.keys(d.categories),
    }));
    res.json({ devices: list, count: list.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

router.get('/v1/outcomes', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const data = ecosystem.exportAnonymizedOutcomes(limit);
    res.json({ outcomes: data, count: data.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get outcomes' });
  }
});

router.get('/v1/failure-patterns', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const data = ecosystem.exportFailurePatterns(limit);
    res.json({ patterns: data, count: data.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get patterns' });
  }
});

router.get('/v1/telemetry', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const data = ecosystem.exportAnonymizedTelemetry(limit);
    res.json({ telemetry: data, count: data.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get telemetry' });
  }
});

router.get('/v1/reliability', (req, res) => {
  try {
    const report = ecosystem.exportReliabilityReport();
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get reliability report' });
  }
});

// --- Datasets ---

router.get('/v1/datasets', (req, res) => {
  try {
    const publishedOnly = req.query.published !== 'false';
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const datasets = ecosystem.listDatasets(publishedOnly, limit);
    res.json({ datasets });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list datasets' });
  }
});

router.post('/v1/datasets', (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const description = (req.body.description || '').trim();
    const data = req.body.data;
    if (!name || !description || !data) return res.status(400).json({ error: 'name, description, and data are required' });
    const dataset = ecosystem.publishDataset(name, description, data);
    res.status(201).json({ dataset });
  } catch (e) {
    res.status(500).json({ error: 'Failed to publish dataset' });
  }
});

router.get('/v1/datasets/:id', (req, res) => {
  try {
    const dataset = ecosystem.getDataset(req.params.id);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
    res.json({ dataset });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get dataset' });
  }
});

module.exports = router;
