'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const scraper = require('../scraper');
const devices = require('../devices');

const router = express.Router();

router.get('/popular', (req, res) => {
  const searches = scraper.getPopularSearches().slice(0, 20);
  const upvotes = scraper.getUpvotes();
  res.json({ searches, upvotes });
});

router.get('/cache-stats', (req, res) => {
  res.json(scraper.getCacheStats());
});

router.get('/stats', (req, res) => {
  try {
    const fbStats = scraper.getFeedbackStats();
    let searchVolume = 0, searchErrors = 0, recentSearches = [];
    try {
      const logDir = path.join(__dirname, '..', 'data', 'logs');
      const logPath = path.join(logDir, 'search.log');
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean).slice(-100);
        lines.forEach(line => {
          try {
            const entry = JSON.parse(line);
            if (entry.type === 'search') searchVolume++;
            if (entry.type === 'search_error') searchErrors++;
            recentSearches.push(entry);
          } catch (e) { /* skip */ }
        });
      }
    } catch (e) { /* skip */ }

    res.json({
      totalFeedback: fbStats.total,
      helpfulPercentage: fbStats.total > 0 ? Math.round((fbStats.helpful / fbStats.total) * 100) : 0,
      byDevice: fbStats.byDevice, devices: Object.keys(devices.DEVICES).length,
      searchVolume, searchErrors, recentSearches: recentSearches.slice(-20),
      ...scraper.getEngineHealth(),
    });
  } catch (e) { res.status(500).json({ error: "Failed to load stats" }); }
});

module.exports = router;
