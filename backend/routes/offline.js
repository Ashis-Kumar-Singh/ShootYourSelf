'use strict';
const express = require('express');
const offline = require('../offline');
const sanitize = require('../utils/sanitize');
const { sendError } = require('../utils/errors');

const router = express.Router();

// Generate offline pack
router.post('/offline/packs/generate', (req, res) => {
  try {
    const device = sanitize(req.body.device, 50) || 'laptop';
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const packType = sanitize(req.body.packType, 50) || 'all';
    const pack = offline.generatePack(device, brand, model, packType);
    res.status(201).json({ pack });
  } catch (e) {
    sendError(res, e, 'Failed to generate pack');
  }
});

// Generate all packs for a device
router.post('/offline/packs/generate-all', (req, res) => {
  try {
    const device = sanitize(req.body.device, 50) || 'laptop';
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const packs = offline.generateAllPacksForDevice(device, brand, model);
    res.status(201).json({ packs, count: packs.length });
  } catch (e) {
    sendError(res, e, 'Failed to generate packs');
  }
});

// Get pack content
router.get('/offline/packs/:id', (req, res) => {
  try {
    const pack = offline.getPack(req.params.id);
    if (!pack) return res.status(404).json({ error: 'Pack not found' });
    res.json({ pack });
  } catch (e) {
    sendError(res, e, 'Failed to get pack');
  }
});

// List packs
router.get('/offline/packs', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50);
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const packs = offline.listPacks(device, brand, model, limit);
    res.json({ packs });
  } catch (e) {
    sendError(res, e, 'Failed to list packs');
  }
});

module.exports = router;
