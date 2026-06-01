'use strict';
const { db } = require('../db');
const eventLog = require('../event/logger');
const devices = require('../devices');
const failureTrees = require('./failure-trees');
const AdaptiveQuestionEngine = require('./adaptive-questions');
const probability = require('./probability');
const trustLayer = require('./trust-layer');

function getDiagnosticQuestions(deviceId, categoryId) {
  const dev = devices.DEVICES[deviceId];
  if (!dev) return [];
  const cat = dev.categories[categoryId];
  return (cat && cat.questions) || [];
}

function getDeviceContext(deviceId, brand, model, categoryId) {
  const dev = devices.DEVICES[deviceId];
  const cat = dev && dev.categories[categoryId];
  return {
    deviceName: (dev && dev.name) || deviceId,
    brand,
    model,
    categoryLabel: (cat && cat.label) || categoryId,
    categoryId,
  };
}

const VALID_DEVICE_TYPES = Object.keys(devices.DEVICES);

function isValidDevice(deviceId) {
  return VALID_DEVICE_TYPES.includes(deviceId);
}

function getDiagnosticPaths(deviceId, brand, model) {
  const paths = db.prepare(`SELECT * FROM diagnostic_paths WHERE device = ? AND brand = ? AND model = ? ORDER BY count DESC LIMIT 20`).all(deviceId, brand, model);
  return paths.map(p => ({ ...p, path: JSON.parse(p.path) }));
}

// Phase 1: Full diagnostic pipeline
function createDiagnosticSession(deviceId, categoryId) {
  return AdaptiveQuestionEngine.startSession(deviceId, categoryId);
}

function getFailureTree(deviceId, categoryId) {
  return failureTrees.getTreeSummary(deviceId, categoryId);
}

function getFailureTreeDetail(deviceId, categoryId) {
  return failureTrees.getTree(deviceId, categoryId);
}

function getTreeCategories(deviceId) {
  return failureTrees.getAllTreeCategories(deviceId);
}

function getProbabilityAnalysis(deviceId, brand, model, categoryId, symptoms, answers) {
  const probs = probability.calculateProbabilities(deviceId, brand, model, categoryId, symptoms, answers);
  return Object.entries(probs)
    .map(([issue, percent]) => ({
      issue: issue.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
      confidence: probability.calculateConfidence(percent / 100, answers ? answers.length : 0),
      percent,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

function addTrustToResult(result, deviceContext) {
  return trustLayer.buildResultMetadata(result, deviceContext);
}

function addTrustToPathResult(path, probabilityPercent) {
  return trustLayer.buildRecommendation(path, probabilityPercent);
}

module.exports = {
  getDiagnosticQuestions,
  getDeviceContext,
  isValidDevice,
  getDiagnosticPaths,
  VALID_DEVICE_TYPES,
  createDiagnosticSession,
  getFailureTree,
  getFailureTreeDetail,
  getTreeCategories,
  getProbabilityAnalysis,
  addTrustToResult,
  addTrustToPathResult,
  AdaptiveQuestionEngine,
  failureTrees,
  probability,
  trustLayer,
};
