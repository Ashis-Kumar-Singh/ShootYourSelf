'use strict';
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

// Set up a runtime db for testing before requiring diagnostic modules
process.env.NODE_ENV = 'test';

const diagnostic = require('../diagnostic');
const failureTrees = require('../diagnostic/failure-trees');
const AdaptiveQuestionEngine = require('../diagnostic/adaptive-questions');
const probability = require('../diagnostic/probability');
const trustLayer = require('../diagnostic/trust-layer');

describe('diagnostic engine', () => {

  describe('failure trees', () => {
    it('has trees for laptop and phone', () => {
      const trees = failureTrees.getAllDevicesWithTrees();
      assert.ok(trees.includes('laptop'));
      assert.ok(trees.includes('phone'));
    });

    it('laptop no-display tree has correct structure', () => {
      const tree = failureTrees.getTree('laptop', 'no-display');
      assert.ok(tree);
      assert.equal(tree.id, 'no-display');
      assert.equal(tree.initialQuestion, 'external-monitor');
      assert.ok(Object.keys(tree.questions).length >= 3);
      assert.ok(Object.keys(tree.paths).length >= 3);
    });

    it('laptop overheating tree has correct paths', () => {
      const tree = failureTrees.getTree('laptop', 'overheating');
      assert.ok(tree);
      assert.ok(tree.paths['thermal-shutdown-path']);
      assert.ok(tree.paths['dust-path']);
      assert.ok(tree.paths['fan-failure-path']);
    });

    it('phone cracked-screen tree has correct paths', () => {
      const tree = failureTrees.getTree('phone', 'cracked-screen');
      assert.ok(tree);
      assert.ok(tree.paths['glass-only-path']);
      assert.ok(tree.paths['lcd-damage-path']);
    });

    it('getAllTreeCategories returns correct categories for laptop', () => {
      const cats = failureTrees.getAllTreeCategories('laptop');
      assert.ok(cats.length >= 2);
      const ids = cats.map(c => c.id);
      assert.ok(ids.includes('no-display'));
      assert.ok(ids.includes('no-boot'));
    });

    it('returns null for missing tree', () => {
      assert.equal(failureTrees.getTree('laptop', 'nonexistent'), null);
      assert.equal(failureTrees.getTree('nonexistent', 'test'), null);
    });
  });

  describe('adaptive questions engine', () => {
    it('creates a session with initial question', () => {
      const session = AdaptiveQuestionEngine.startSession('laptop', 'no-display');
      const q = session.getCurrentQuestion();
      assert.ok(q);
      assert.equal(q.id, 'external-monitor');
      assert.ok(q.text);
      assert.ok(q.answers.length >= 2);
      assert.equal(q.questionNumber, 1);
    });

    it('returns null for unsupported device/category', () => {
      const session = AdaptiveQuestionEngine.startSession('laptop', 'nonexistent');
      assert.equal(session.getCurrentQuestion(), null);
    });

    it('progresses through questions and reaches a diagnosis', () => {
      const session = AdaptiveQuestionEngine.startSession('laptop', 'no-display');
      let q = session.getCurrentQuestion();
      assert.ok(q);

      const result = session.answer(q.id, q.answers[0].label);
      assert.ok(['next_question', 'diagnosis'].includes(result.status));

      if (result.status === 'next_question') {
        const q2 = result.question;
        assert.ok(q2);
        const result2 = session.answer(q2.id, q2.answers[0].label);
        assert.equal(result2.status, 'diagnosis');
        assert.ok(result2.path);
        assert.ok(result2.path.label);
        assert.ok(result2.path.steps);
      }
    });

    it('tracks probabilities as questions are answered', () => {
      const session = AdaptiveQuestionEngine.startSession('laptop', 'no-display');
      let q = session.getCurrentQuestion();
      const result = session.answer(q.id, q.answers[0].label);
      if (result.status === 'next_question') {
        assert.ok(result.probabilities);
        const keys = Object.keys(result.probabilities);
        assert.ok(keys.length > 0);
      }
    });

    it('tracks progress correctly', () => {
      const session = AdaptiveQuestionEngine.startSession('laptop', 'no-display');
      const p1 = session.getProgress();
      assert.equal(p1.asked, 0);
      assert.ok(p1.total > 0);
      assert.equal(p1.percentage, 0);

      const q = session.getCurrentQuestion();
      session.answer(q.id, q.answers[0].label);

      const p2 = session.getProgress();
      assert.equal(p2.asked, 1);
      assert.ok(p2.percentage > 0);
    });

    it('getSessionState returns current state', () => {
      const session = AdaptiveQuestionEngine.startSession('laptop', 'no-display');
      const state = session.getSessionState();
      assert.equal(state.deviceId, 'laptop');
      assert.equal(state.categoryId, 'no-display');
      assert.ok(state.currentQuestionId);
      assert.ok(Array.isArray(state.askedQuestions));
      assert.ok(Array.isArray(state.answers));
    });
  });

  describe('probability engine', () => {
    it('calculates base probabilities for known device/category', () => {
      const probs = probability.calculateProbabilities('laptop', 'Dell', 'XPS 15', 'no-display', [], []);
      assert.ok(probs);
      const keys = Object.keys(probs);
      assert.ok(keys.length > 0);
      const total = Object.values(probs).reduce((s, v) => s + v, 0);
      assert.ok(Math.abs(total - 100) < 1);
    });

    it('calculates confidence correctly', () => {
      assert.equal(probability.calculateConfidence(0.8, 3), 95);
      assert.equal(probability.calculateConfidence(0.5, 0), 50);
      assert.ok(probability.calculateConfidence(0.9, 5) <= 99);
    });

    it('returns empty for unknown device', () => {
      const probs = probability.calculateProbabilities('unknown', '', '', 'test', [], []);
      assert.deepEqual(probs, {});
    });

    it('normalizes probabilities to sum to 100%', () => {
      const probs = probability.calculateProbabilities('laptop', 'HP', 'Pavilion', 'overheating', [], []);
      const total = Object.values(probs).reduce((s, v) => s + v, 0);
      assert.ok(Math.abs(total - 100) < 1);
    });
  });

  describe('trust layer', () => {
    it('builds recommendation with all fields', () => {
      const path = {
        label: 'Test Issue',
        description: 'A test issue',
        confidence: 0.8,
        risk: 'low',
        difficulty: 'beginner',
        time: '15 min',
        steps: ['Step 1', 'Step 2'],
        links: [{ title: 'Guide', url: 'https://example.com' }],
      };
      const rec = trustLayer.buildRecommendation(path, null);
      assert.equal(rec.diagnosis, 'Test Issue');
      assert.equal(rec.confidence, 80);
      assert.equal(rec.riskLevel, 'low');
      assert.equal(rec.repairDifficulty, 'beginner');
      assert.ok(rec.steps.length === 2);
      assert.ok(rec.trustIndicators.canDIY);
      assert.ok(!rec.trustIndicators.expertRecommended);
    });

    it('builds recommendation without path confidence', () => {
      const path = {
        label: 'No Confidence Issue',
        description: '',
        steps: [],
        links: [],
      };
      const rec = trustLayer.buildRecommendation(path, 65);
      assert.equal(rec.confidence, 65);
    });

    it('builds result metadata with trust indicators', () => {
      const result = {
        title: 'Fix Guide',
        link: 'https://ifixit.com/guide',
        source: 'ifixit.com',
        type: 'guide',
        score: 85,
      };
      const meta = trustLayer.buildResultMetadata(result, null);
      assert.equal(meta.trustIndicators.sourceTrust, 'high');
      assert.ok(meta.trustIndicators.isOfficial);
      assert.ok(meta.trustIndicators.evidenceLevel === 'strong');
    });

    it('infers risk correctly from difficulty', () => {
      assert.equal(trustLayer.buildRecommendation({ label: 't', steps: [], links: [], difficulty: 'beginner' }, null).riskLevel, 'low');
      assert.equal(trustLayer.buildRecommendation({ label: 't', steps: [], links: [], difficulty: 'advanced' }, null).riskLevel, 'high');
    });
  });

  describe('diagnostic module entry', () => {
    it('getDiagnosticQuestions returns questions for valid device/category', () => {
      const qs = diagnostic.getDiagnosticQuestions('laptop', 'battery');
      assert.ok(qs.length >= 2);
    });

    it('getDiagnosticQuestions returns empty array for invalid device', () => {
      const qs = diagnostic.getDiagnosticQuestions('invalid', 'test');
      assert.deepEqual(qs, []);
    });

    it('isValidDevice checks device types', () => {
      assert.ok(diagnostic.isValidDevice('laptop'));
      assert.ok(diagnostic.isValidDevice('phone'));
      assert.ok(!diagnostic.isValidDevice('invalid'));
      assert.ok(!diagnostic.isValidDevice(''));
    });

    it('getTreeCategories returns categories', () => {
      const cats = diagnostic.getTreeCategories('laptop');
      const ids = cats.map(c => c.id);
      assert.ok(ids.includes('no-display'));
    });

    it('getProbabilityAnalysis returns sorted results', () => {
      const analysis = diagnostic.getProbabilityAnalysis('laptop', 'Lenovo', 'ThinkPad', 'no-boot', [], []);
      assert.ok(analysis.length > 0);
      for (let i = 1; i < analysis.length; i++) {
        assert.ok(analysis[i - 1].confidence >= analysis[i].confidence);
      }
    });
  });
});
