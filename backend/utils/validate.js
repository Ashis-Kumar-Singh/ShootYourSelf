'use strict';
const devices = require('../devices');

const VALID_DEVICE_IDS = new Set(Object.keys(devices.DEVICES));

const VALID_BRAND_IDS = new Map();
const VALID_CATEGORY_IDS = new Map();
for (const [devId, dev] of Object.entries(devices.DEVICES)) {
  const brandSet = new Set(dev.brands.map(b => b.id));
  VALID_BRAND_IDS.set(devId, brandSet);
  const catSet = new Set(Object.keys(dev.categories));
  VALID_CATEGORY_IDS.set(devId, catSet);
}

function validateDevice(deviceId) {
  if (!deviceId || !VALID_DEVICE_IDS.has(deviceId)) {
    return { valid: false, value: 'laptop', error: `Unknown device "${deviceId}". Using default.` };
  }
  return { valid: true, value: deviceId };
}

function validateBrand(deviceId, brandId) {
  if (!brandId) return { valid: true, value: '' };
  const brands = VALID_BRAND_IDS.get(deviceId);
  if (brands && !brands.has(brandId)) {
    return { valid: false, value: brandId, error: `Unknown brand "${brandId}" for device "${deviceId}".` };
  }
  return { valid: true, value: brandId };
}

function validateCategory(deviceId, categoryId) {
  if (!categoryId) return { valid: false, value: 'troubleshooting', error: 'No category specified. Using default.' };
  const cats = VALID_CATEGORY_IDS.get(deviceId);
  if (cats && !cats.has(categoryId)) {
    return { valid: false, value: 'troubleshooting', error: `Unknown category "${categoryId}" for device "${deviceId}". Using default.` };
  }
  return { valid: true, value: categoryId };
}

function validateSearchParams(device, brand, category) {
  const d = validateDevice(device);
  const b = validateBrand(d.value, brand);
  const c = validateCategory(d.value, category);
  return { device: d.value, brand: b.value, category: c.value, warnings: [d.error, b.error, c.error].filter(Boolean) };
}

module.exports = { validateDevice, validateBrand, validateCategory, validateSearchParams, VALID_DEVICE_IDS };
