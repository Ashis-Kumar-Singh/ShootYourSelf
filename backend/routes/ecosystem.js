'use strict';
const express = require('express');
const ecosystem = require('../ecosystem');
const community = require('../community');
const { logError, sendError } = require('../utils/errors');

const router = express.Router();

// API specification
router.get('/v1', (req, res) => {
  try {
    const spec = ecosystem.getApiSpec();
    res.json(spec);
  } catch (e) {
    logError(req, e, 'Failed to get API spec');
    sendError(res, e, 'Failed to get API spec');
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
    logError(req, e, 'Failed to get devices');
    sendError(res, e, 'Failed to get devices');
  }
});

router.get('/v1/outcomes', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const data = ecosystem.exportAnonymizedOutcomes(limit);
    res.json({ outcomes: data, count: data.length });
  } catch (e) {
    logError(req, e, 'Failed to get outcomes');
    sendError(res, e, 'Failed to get outcomes');
  }
});

router.get('/v1/fixes', (req, res) => {
  try {
    const device = (req.query.device || '').trim();
    const brand = (req.query.brand || '').trim();
    const model = (req.query.model || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const fixes = community.getCommunityFixes(device, brand, model, limit);
    const approved = fixes.filter(f => f.status === 'approved');
    res.json({ fixes: approved, count: approved.length });
  } catch (e) {
    logError(req, e, 'Failed to get fixes');
    sendError(res, e, 'Failed to get fixes');
  }
});

router.get('/v1/trends', (req, res) => {
  try {
    const device = (req.query.device || '').trim();
    const brand = (req.query.brand || '').trim();
    const model = (req.query.model || '').trim();
    if (!device) return res.status(400).json({ error: 'device parameter is required' });
    const trends = community.getFailureTrends(device, brand, model);
    res.json(trends);
  } catch (e) {
    logError(req, e, 'Failed to get trends');
    sendError(res, e, 'Failed to get trends');
  }
});

router.get('/v1/failure-patterns', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const data = ecosystem.exportFailurePatterns(limit);
    res.json({ patterns: data, count: data.length });
  } catch (e) {
    logError(req, e, 'Failed to get patterns');
    sendError(res, e, 'Failed to get patterns');
  }
});

router.get('/v1/telemetry', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const data = ecosystem.exportAnonymizedTelemetry(limit);
    res.json({ telemetry: data, count: data.length });
  } catch (e) {
    logError(req, e, 'Failed to get telemetry');
    sendError(res, e, 'Failed to get telemetry');
  }
});

router.get('/v1/reliability', (req, res) => {
  try {
    const report = ecosystem.exportReliabilityReport();
    res.json(report);
  } catch (e) {
    logError(req, e, 'Failed to get reliability report');
    sendError(res, e, 'Failed to get reliability report');
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
    logError(req, e, 'Failed to list datasets');
    sendError(res, e, 'Failed to list datasets');
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
    logError(req, e, 'Failed to publish dataset');
    sendError(res, e, 'Failed to publish dataset');
  }
});

router.get('/v1/datasets/:id', (req, res) => {
  try {
    const dataset = ecosystem.getDataset(req.params.id);
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
    res.json({ dataset });
  } catch (e) {
    logError(req, e, 'Failed to get dataset');
    sendError(res, e, 'Failed to get dataset');
  }
});

module.exports = router;
