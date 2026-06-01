'use strict';
const express = require('express');
const scraper = require('../scraper');
const devices = require('../devices');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({ affiliateTag: process.env.AMAZON_AFFILIATE_TAG || 'shootyourself-20', version: '2.0' });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok', version: '2.0', environment: (process.env.NODE_ENV || 'development').trim(), uptime: process.uptime(),
    devices: Object.keys(devices.DEVICES).length,
    searchEngine: 'DuckDuckGo + Bing + Google + YouTube (parallel, retry, ranked)',
    ...scraper.getEngineHealth(),
    cache: scraper.getCacheStats(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
