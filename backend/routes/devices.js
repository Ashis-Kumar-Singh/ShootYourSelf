'use strict';
const express = require('express');
const devices = require('../devices');
const scraper = require('../scraper');

const router = express.Router();

router.get('/devices', (req, res) => {
  res.json({
    devices: Object.entries(devices.DEVICES).map(([k, v]) => ({
      id: k, name: v.name, icon: v.icon,
      brands: v.brands.map(b => ({ id: b.id, name: b.name })),
      categories: Object.entries(v.categories).map(([id, category]) => ({
        id,
        label: category.label,
        icon: category.icon,
        questions: category.questions || [],
      })),
      categoryCount: Object.keys(v.categories).length
    }))
  });
});

router.get('/categories', (req, res) => {
  const deviceId = req.query.device || 'laptop';
  const categories = scraper.getDeviceCategories(deviceId).map(category => {
    const questions = devices.DEVICES[deviceId]?.categories?.[category.id]?.questions || [];
    return { ...category, questions };
  });
  res.json({ categories });
});

module.exports = router;
