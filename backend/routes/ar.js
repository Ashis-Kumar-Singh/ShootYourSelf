'use strict';
const express = require('express');
const ar = require('../ar');
const sanitize = require('../utils/sanitize');
const { sendError } = require('../utils/errors');

const router = express.Router();

// Get AR repair model for a device
router.get('/ar/model/:deviceType', (req, res) => {
  try {
    const model = ar.getRepairModel(req.params.deviceType);
    if (!model) return res.status(404).json({ error: 'No AR model for device type' });
    res.json({ deviceType: req.params.deviceType, model });
  } catch (e) {
    sendError(res, e, 'Failed to get AR model');
  }
});

// Get screw positions
router.get('/ar/screws', (req, res) => {
  try {
    const deviceType = sanitize(req.query.deviceType, 50) || 'laptop';
    const assembly = sanitize(req.query.assembly, 50) || 'bottom_panel';
    const screws = ar.getScrewPositions(deviceType, assembly);
    res.json({ deviceType, assembly, screws });
  } catch (e) {
    sendError(res, e, 'Failed to get screw positions');
  }
});

// Get component positions
router.get('/ar/components', (req, res) => {
  try {
    const deviceType = sanitize(req.query.deviceType, 50) || 'laptop';
    const components = ar.getComponentPositions(deviceType);
    res.json({ deviceType, components });
  } catch (e) {
    sendError(res, e, 'Failed to get components');
  }
});

// Get pry points
router.get('/ar/pry-points', (req, res) => {
  try {
    const deviceType = sanitize(req.query.deviceType, 50) || 'laptop';
    const assembly = sanitize(req.query.assembly, 50) || 'bottom_panel';
    const points = ar.getPryPoints(deviceType, assembly);
    res.json({ deviceType, assembly, pryPoints: points });
  } catch (e) {
    sendError(res, e, 'Failed to get pry points');
  }
});

// Generate full AR overlay
router.get('/ar/overlay', (req, res) => {
  try {
    const deviceType = sanitize(req.query.deviceType, 50) || 'laptop';
    const step = parseInt(req.query.step, 10) || 1;
    const width = parseInt(req.query.width, 10) || 1920;
    const height = parseInt(req.query.height, 10) || 1080;
    const overlay = ar.generateAROverlay(deviceType, step, width, height);
    if (!overlay) return res.status(404).json({ error: 'No AR data for device type' });
    res.json(overlay);
  } catch (e) {
    sendError(res, e, 'Failed to generate overlay');
  }
});

// Detect screws
router.post('/ar/detect-screws', (req, res) => {
  try {
    const deviceType = sanitize(req.body.deviceType, 50) || 'laptop';
    const detectedPoints = req.body.detectedPoints || [];
    const screws = ar.detectScrewsInView(deviceType, detectedPoints);
    const allDetected = screws.every(s => s.detected);
    res.json({ deviceType, screws, allDetected, remaining: screws.filter(s => !s.detected).length });
  } catch (e) {
    sendError(res, e, 'Failed to detect screws');
  }
});

module.exports = router;
