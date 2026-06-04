'use strict';
const express = require('express');
const community = require('../community');
const sanitize = require('../utils/sanitize');
const { sendError } = require('../utils/errors');

const router = express.Router();

// ===== ANALYTICS =====

router.get('/community/success-rate', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50);
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const rate = community.getRepairSuccessRate(device, brand, model);
    res.json({ device, brand, model, successRate: rate });
  } catch (e) {
    sendError(res, e, 'Failed to get success rate');
  }
});

router.get('/community/top-fixes', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50);
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const fixes = community.getTopFixes(device, brand, model, limit);
    res.json({ device, brand, model, fixes });
  } catch (e) {
    sendError(res, e, 'Failed to get top fixes');
  }
});

router.get('/community/device-stats', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50);
    if (device) {
      const stats = community.getDeviceStats(device);
      return res.json({ stats });
    }
    const allStats = community.getAllDevicesStats();
    res.json({ devices: allStats });
  } catch (e) {
    sendError(res, e, 'Failed to get device stats');
  }
});

router.get('/community/analytics', (req, res) => {
  try {
    const analytics = community.getGlobalAnalytics();
    res.json(analytics);
  } catch (e) {
    sendError(res, e, 'Failed to get analytics');
  }
});

// ===== TECHNICIAN LAYER =====

router.post('/community/technicians', (req, res) => {
  try {
    const displayName = sanitize(req.body.displayName, 100);
    const bio = sanitize(req.body.bio, 500);
    const specialties = req.body.specialties || [];
    if (!displayName) return res.status(400).json({ error: 'displayName is required' });
    const profile = community.createTechnicianProfile(displayName, bio, specialties);
    res.status(201).json({ technician: profile });
  } catch (e) {
    sendError(res, e, 'Failed to create technician profile');
  }
});

router.get('/community/technicians/:id', (req, res) => {
  try {
    const profile = community.getTechnicianProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Technician not found' });
    res.json({ technician: profile });
  } catch (e) {
    sendError(res, e, 'Failed to get technician');
  }
});

router.get('/community/technicians', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const leaderboard = community.getTechnicianLeaderboard(limit);
    res.json({ technicians: leaderboard });
  } catch (e) {
    sendError(res, e, 'Failed to get leaderboard');
  }
});

// ===== COMMUNITY FIXES =====

router.post('/community/fixes', (req, res) => {
  try {
    const technicianId = sanitize(req.body.technicianId, 100);
    const device = sanitize(req.body.device, 50) || 'laptop';
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const category = sanitize(req.body.category, 50) || 'troubleshooting';
    const title = sanitize(req.body.title, 200);
    const description = sanitize(req.body.description, 2000);
    const steps = req.body.steps || [];
    const symptoms = req.body.symptoms || [];
    if (!technicianId || !title) return res.status(400).json({ error: 'technicianId and title are required' });
    const fix = community.submitCommunityFix(technicianId, device, brand, model, category, title, description, steps, symptoms);
    res.status(201).json({ fix });
  } catch (e) {
    sendError(res, e, 'Failed to submit fix');
  }
});

router.get('/community/fixes', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50);
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const fixes = community.getCommunityFixes(device, brand, model, limit);
    res.json({ fixes });
  } catch (e) {
    sendError(res, e, 'Failed to get fixes');
  }
});

router.post('/community/fixes/:id/approve', (req, res) => {
  try {
    const result = community.approveCommunityFix(req.params.id);
    if (!result) return res.status(404).json({ error: 'Fix not found' });
    res.json(result);
  } catch (e) {
    sendError(res, e, 'Failed to approve fix');
  }
});

router.post('/community/fixes/:id/vote', (req, res) => {
  try {
    const voterId = sanitize(req.body.voterId, 100);
    const vote = parseInt(req.body.vote, 10) || 0;
    if (!voterId) return res.status(400).json({ error: 'voterId is required' });
    const result = community.voteOnCommunityFix(req.params.id, voterId, Math.max(-1, Math.min(1, vote)));
    res.json(result);
  } catch (e) {
    sendError(res, e, 'Failed to vote');
  }
});

// ===== REPAIR WARNINGS =====

router.post('/community/warnings', (req, res) => {
  try {
    const device = sanitize(req.body.device, 50) || 'laptop';
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const category = sanitize(req.body.category, 50) || 'troubleshooting';
    const warning = sanitize(req.body.warning, 1000);
    const severity = sanitize(req.body.severity, 20) || 'info';
    if (!warning) return res.status(400).json({ error: 'warning is required' });
    const result = community.submitRepairWarning(device, brand, model, category, warning, severity);
    res.status(201).json(result);
  } catch (e) {
    sendError(res, e, 'Failed to submit warning');
  }
});

router.get('/community/warnings', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50);
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const warnings = community.getRepairWarnings(device, brand, model);
    res.json({ warnings });
  } catch (e) {
    sendError(res, e, 'Failed to get warnings');
  }
});

router.post('/community/warnings/:id/upvote', (req, res) => {
  try {
    const upvotes = community.upvoteWarning(req.params.id);
    res.json({ upvotes });
  } catch (e) {
    sendError(res, e, 'Failed to upvote');
  }
});

// ===== FAILURE REPORTS / HEATMAPS =====

router.post('/community/failure-reports', (req, res) => {
  try {
    const device = sanitize(req.body.device, 50) || 'laptop';
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const category = sanitize(req.body.category, 50) || 'troubleshooting';
    const symptom = sanitize(req.body.symptom, 200);
    const failure = sanitize(req.body.failure, 200);
    const repairAttempted = sanitize(req.body.repairAttempted, 500);
    const successful = !!req.body.successful;
    const region = sanitize(req.body.region, 100);
    if (!symptom || !failure) return res.status(400).json({ error: 'symptom and failure are required' });
    const report = community.submitFailureReport(device, brand, model, category, symptom, failure, repairAttempted, successful, region);
    res.status(201).json(report);
  } catch (e) {
    sendError(res, e, 'Failed to submit report');
  }
});

router.get('/community/heatmap', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50) || 'laptop';
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const heatmap = community.getFailureHeatmap(device, brand, model);
    res.json({ device, brand, model, heatmap });
  } catch (e) {
    sendError(res, e, 'Failed to get heatmap');
  }
});

router.get('/community/trends', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50) || 'laptop';
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const trends = community.getFailureTrends(device, brand, model);
    res.json(trends);
  } catch (e) {
    sendError(res, e, 'Failed to get trends');
  }
});

router.get('/community/brand-reliability', (req, res) => {
  try {
    const brand = sanitize(req.query.brand, 100);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    if (!brand) return res.status(400).json({ error: 'brand is required' });
    const reliability = community.getBrandReliability(brand, limit);
    res.json({ brand, models: reliability });
  } catch (e) {
    sendError(res, e, 'Failed to get reliability data');
  }
});

module.exports = router;
