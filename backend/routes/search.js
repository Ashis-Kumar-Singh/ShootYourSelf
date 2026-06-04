'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const sanitize = require('../utils/sanitize');
const { validateSearchParams } = require('../utils/validate');
const { asyncHandler } = require('../utils/errors');
const { rotateLogFile } = require('../utils/log-rotate');
const scraper = require('../scraper');
const devices = require('../devices');

const router = express.Router();
const isProd = (process.env.NODE_ENV || 'development').trim() === 'production';

const logDir = path.join(__dirname, '..', 'data', 'logs');

function jsonLog(entry) {
  entry.timestamp = new Date().toISOString();
  const logPath = path.join(logDir, 'search.log');
  rotateLogFile(logPath, 10 * 1024 * 1024);
  try {
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  } catch (e) {
    if (!isProd) console.warn('[search-log]', 'Unable to write search log:', e.message);
  }
  if (!isProd) console.log('[search]', entry.query, entry.results, 'results in', entry.ms, 'ms');
}

router.get('/model-search', asyncHandler(async (req, res) => {
  const t0 = Date.now();
  const reqId = req.id || '';
  let device = sanitize(req.query.device, 50) || 'laptop';
  let brand = sanitize(req.query.brand, 100);
  let model = sanitize(req.query.model, 200);
  let category = sanitize(req.query.category, 50) || 'troubleshooting';
  let context = sanitize(req.query.context, 500);
  if (!model) model = '';

  const validated = validateSearchParams(device, brand, category);
  device = validated.device;
  brand = validated.brand;
  category = validated.category;

  const devConfig = devices.DEVICES[device];
  const catConfig = devConfig?.categories[category];
  const devName = devConfig?.name || device;

  try {
    const upvotes = scraper.getUpvotes();
    const results = await scraper.searchModel(device, brand, model, category, upvotes, context);
    scraper.recordPopularSearch(device, brand, model, category);

    const ms = Date.now() - t0;
    jsonLog({ reqId, type: 'search', query: `${brand} ${model}`, device, category, results: results.length, ms });

    res.json({
      device: devName, model: (brand ? brand + ' ' : '') + model,
      category, categoryLabel: catConfig?.label || 'Search',
      results, resultCount: results.length, ms,
      warnings: validated.warnings.length ? validated.warnings : undefined,
    });
  } catch (err) {
    console.error(`[${reqId}] Search error:`, err.message);
    const fb = scraper.getSourceUrls(
      devices.DEVICES[device]?.name || device, brand || '', model || '',
      devices.DEVICES[device]?.categories[category]?.label || category, context || ''
    );
    jsonLog({ reqId, type: 'search_error', query: `${brand || ''} ${model || ''}`, error: err.message, ms: Date.now() - t0 });
    res.json({
      model: (brand || '') + ' ' + (model || ''), category,
      categoryLabel: devices.DEVICES[device]?.categories[category]?.label || 'Search',
      results: fb, resultCount: fb.length, note: 'Search engines unavailable. Direct links shown.'
    });
  }
}));

router.post('/extract-content', asyncHandler(async (req, res) => {
  const url = sanitize(req.body.url, 2000);
  if (!url) return res.status(400).json({ error: "url is required" });
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(400).json({ error: "Invalid URL" });
  }
  const result = await scraper.extractContent(url);
  res.json(result);
}));

module.exports = router;
