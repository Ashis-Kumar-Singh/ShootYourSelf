'use strict';
const express = require('express');
const sanitize = require('../utils/sanitize');
const diagnostic = require('../diagnostic');
const { logError, sendError } = require('../utils/errors');
const { validateSearchParams } = require('../utils/validate');

const router = express.Router();

const VALID_EVENTS = ['symptom_selected', 'user_action'];

// Phase 0: Basic diagnostic questions
router.get('/diagnostic/questions', (req, res) => {
  try {
    const deviceRaw = sanitize(req.query.device, 50) || 'laptop';
    const categoryRaw = sanitize(req.query.category, 50) || 'troubleshooting';
    const v = validateSearchParams(deviceRaw, '', categoryRaw);
    const questions = diagnostic.getDiagnosticQuestions(v.device, v.category);
    res.json({ device: v.device, category: v.category, questions, warnings: v.warnings.length ? v.warnings : undefined });
  } catch (e) {
    logError(req, e, 'Failed to get questions');
    sendError(res, e, 'Failed to get questions');
  }
});

// Phase 0: Device context
router.get('/diagnostic/context', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50) || 'laptop';
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const category = sanitize(req.query.category, 50) || 'troubleshooting';
    const ctx = diagnostic.getDeviceContext(device, brand, model, category);
    res.json({ context: ctx });
  } catch (e) {
    logError(req, e, 'Failed to get context');
    sendError(res, e, 'Failed to get context');
  }
});

// Phase 0: Known diagnostic paths
router.get('/diagnostic/paths', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50) || 'laptop';
    const brand = sanitize(req.query.brand, 100);
    const model = sanitize(req.query.model, 200);
    const paths = diagnostic.getDiagnosticPaths(device, brand, model);
    res.json({ device, brand, model, paths });
  } catch (e) {
    logError(req, e, 'Failed to get diagnostic paths');
    sendError(res, e, 'Failed to get diagnostic paths');
  }
});

// Phase 1: List available failure tree categories
router.get('/diagnostic/trees', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50);
    if (device) {
      const categories = diagnostic.getTreeCategories(device);
      return res.json({ device, trees: categories });
    }
    const allDevices = diagnostic.failureTrees.getAllDevicesWithTrees();
    res.json({ devices: allDevices });
  } catch (e) {
    logError(req, e, 'Failed to list trees');
    sendError(res, e, 'Failed to list trees');
  }
});

// Phase 1: Get full failure tree
router.get('/diagnostic/trees/:treeId', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50) || 'laptop';
    const tree = diagnostic.getFailureTreeDetail(device, req.params.treeId);
    if (!tree) return res.status(404).json({ error: 'Tree not found' });
    res.json({ tree });
  } catch (e) {
    logError(req, e, 'Failed to get tree');
    sendError(res, e, 'Failed to get tree');
  }
});

// Phase 1: Start adaptive diagnostic session
router.post('/diagnostic/session/start', (req, res) => {
  try {
    const device = sanitize(req.body.device, 50) || 'laptop';
    const category = sanitize(req.body.category, 50) || 'troubleshooting';
    const session = diagnostic.createDiagnosticSession(device, category);
    const question = session.getCurrentQuestion();
    res.json({
      sessionId: `${device}_${category}_${Date.now()}`,
      state: session.getSessionState(),
      question,
    });
  } catch (e) {
    logError(req, e, 'Failed to start diagnostic session');
    sendError(res, e, 'Failed to start diagnostic session');
  }
});

// Phase 1: Answer a question in adaptive session
router.post('/diagnostic/session/answer', (req, res) => {
  try {
    const { sessionId, questionId, answerLabel } = req.body;
    if (!questionId || !answerLabel) {
      return res.status(400).json({ error: 'questionId and answerLabel are required' });
    }
    const device = sanitize(req.body.device, 50) || 'laptop';
    const category = sanitize(req.body.category, 50) || 'troubleshooting';
    const session = diagnostic.createDiagnosticSession(device, category);
    session.askedQuestions = new Set(req.body.askedQuestions || []);
    session.answers = req.body.answers || [];
    session.currentQuestionId = questionId;
    const result = session.answer(questionId, answerLabel);
    if (result.status === 'diagnosis') {
      result.recommendation = diagnostic.addTrustToPathResult(result.path, result.probabilities);
    }
    res.json(result);
  } catch (e) {
    logError(req, e, 'Failed to process answer');
    sendError(res, e, 'Failed to process answer');
  }
});

// Phase 1: Probability analysis
router.post('/diagnostic/probability', (req, res) => {
  try {
    const device = sanitize(req.body.device, 50) || 'laptop';
    const brand = sanitize(req.body.brand, 100);
    const model = sanitize(req.body.model, 200);
    const category = sanitize(req.body.category, 50) || 'troubleshooting';
    const symptoms = req.body.symptoms || [];
    const answers = req.body.answers || [];
    const analysis = diagnostic.getProbabilityAnalysis(device, brand, model, category, symptoms, answers);
    res.json({ device, brand, model, category, analysis });
  } catch (e) {
    logError(req, e, 'Failed to calculate probabilities');
    sendError(res, e, 'Failed to calculate probabilities');
  }
});

// Phase 1: Validate device
router.get('/diagnostic/validate-device', (req, res) => {
  try {
    const device = sanitize(req.query.device, 50);
    const valid = diagnostic.isValidDevice(device);
    res.json({ device, valid, supportedDevices: diagnostic.VALID_DEVICE_TYPES });
  } catch (e) {
    logError(req, e, 'Validation failed');
    sendError(res, e, 'Validation failed');
  }
});

module.exports = router;
