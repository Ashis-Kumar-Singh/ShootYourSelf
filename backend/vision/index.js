'use strict';
const path = require('path');
const fs = require('fs');
const detector = require('./detector');
const overlay = require('./overlay');

const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function validateImage(buffer, mimeType) {
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return { valid: false, error: 'Unsupported image type. Use JPEG, PNG, WebP, or AVIF.' };
  }
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: 'Image too large. Maximum 10MB.' };
  }
  return { valid: true };
}

async function analyzeImage(imageBuffer, mimeType) {
  const validation = validateImage(imageBuffer, mimeType);
  if (!validation.valid) return { error: validation.error };

  const detections = await detector.detect(imageBuffer);

  const analysis = {
    detections: detections.map(d => ({
      label: d.label,
      confidence: d.confidence,
      bbox: d.bbox,
      severity: d.severity,
      actionable: d.actionable,
      repairNote: d.repairNote,
    })),
    summary: detector.generateSummary(detections),
    overlayData: overlay.generateOverlayData(detections),
    hardwareInfo: detector.inferHardwareContext(detections),
  };

  return analysis;
}

function getDetectionCapabilities() {
  return {
    available: detector.isAvailable(),
    backend: detector.getBackend(),
    supportedDetections: detector.getSupportedDetections(),
    models: detector.getModelInfo(),
  };
}

module.exports = {
  analyzeImage,
  getDetectionCapabilities,
  validateImage,
  UPLOAD_DIR,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
};
