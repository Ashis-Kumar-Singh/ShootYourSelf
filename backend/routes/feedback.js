'use strict';
const express = require('express');
const sanitize = require('../utils/sanitize');
const scraper = require('../scraper');

const router = express.Router();

router.post('/upvote', (req, res) => {
  try {
    const link = sanitize(req.body.link, 2000);
    if (!link) return res.status(400).json({ error: "link is required" });
    scraper.addUpvote(link);
    const upvotes = scraper.getUpvotes();
    res.json({ status: "ok", count: upvotes[link] || 0 });
  } catch (e) { res.status(500).json({ error: "Failed to upvote" }); }
});

router.post('/feedback', (req, res) => {
  try {
    const issueId = sanitize(req.body.issueId, 200);
    const helpful = !!req.body.helpful;
    const device = sanitize(req.body.device, 50);
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const category = sanitize(req.body.category, 50);
    if (!issueId) return res.status(400).json({ error: "issueId is required" });
    scraper.addFeedback(issueId, !!helpful, device, brand, model, category);
    res.json({ status: "ok" });
  } catch (e) { res.status(500).json({ error: "Failed to save feedback" }); }
});

module.exports = router;
