'use strict';
const express = require('express');
const vision = require('../vision');
const overlay = require('../vision/overlay');
const sanitize = require('../utils/sanitize');
const { sendError } = require('../utils/errors');

const router = express.Router();

// Detection capabilities
router.get('/vision/capabilities', (req, res) => {
  try {
    const caps = vision.getDetectionCapabilities();
    res.json(caps);
  } catch (e) {
    sendError(res, e, 'Failed to get capabilities');
  }
});

// Upload and analyze an image
router.post('/vision/analyze', async (req, res) => {
  try {
    const imageData = req.body.image;
    const mimeType = req.body.mimeType || 'image/jpeg';

    if (!imageData) return res.status(400).json({ error: 'No image provided. Send base64 image in "image" field.' });

    let buffer;
    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        buffer = Buffer.from(matches[2], 'base64');
        const detectedMime = matches[1];
        if (detectedMime !== mimeType && mimeType === 'image/jpeg') {
          return res.status(400).json({ error: 'MIME type mismatch' });
        }
      } else {
        return res.status(400).json({ error: 'Invalid data URI format' });
      }
    } else {
      buffer = Buffer.from(imageData, 'base64');
    }

    const result = await vision.analyzeImage(buffer, mimeType);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Analysis failed: ' + e.message });
  }
});

// Analyze via URL
router.post('/vision/analyze-url', async (req, res) => {
  try {
    const url = sanitize(req.body.url, 2000);
    if (!url) return res.status(400).json({ error: 'url is required' });
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const response = await fetch(url);
    if (!response.ok) return res.status(400).json({ error: 'Failed to fetch image: HTTP ' + response.status });

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    const result = await vision.analyzeImage(buffer, contentType);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Analysis failed: ' + e.message });
  }
});

// Get step overlay for repair guidance
router.get('/vision/overlay/step', (req, res) => {
  try {
    const step = parseInt(req.query.step, 10) || 1;
    const totalSteps = parseInt(req.query.totalSteps, 10) || 5;
    const cx = parseInt(req.query.cx, 10) || 320;
    const cy = parseInt(req.query.cy, 10) || 180;
    const cw = parseInt(req.query.cw, 10) || 80;
    const ch = parseInt(req.query.ch, 10) || 60;

    const overlayData = overlay.generateStepOverlay(step, totalSteps, { x: cx, y: cy, width: cw, height: ch });
    res.json({ overlay: overlayData });
  } catch (e) {
    sendError(res, e, 'Failed to generate overlay');
  }
});

// Get repair path overlay
router.get('/vision/overlay/path', (req, res) => {
  try {
    const pathType = sanitize(req.query.type, 20) || 'screw';
    const cx = parseInt(req.query.cx, 10) || 320;
    const cy = parseInt(req.query.cy, 10) || 180;
    const cw = parseInt(req.query.cw, 10) || 100;
    const ch = parseInt(req.query.ch, 10) || 80;

    const pathData = overlay.generateRepairPathOverlay({ x: cx, y: cy, width: cw, height: ch }, pathType);
    if (!pathData) return res.status(400).json({ error: 'Invalid path type. Use: screw, pry, cable' });
    res.json({ path: pathData });
  } catch (e) {
    sendError(res, e, 'Failed to generate path overlay');
  }
});

module.exports = router;
