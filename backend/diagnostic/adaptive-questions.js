'use strict';
const failureTrees = require('./failure-trees');

class AdaptiveQuestionEngine {
  constructor(deviceId, categoryId) {
    this.deviceId = deviceId;
    this.categoryId = categoryId;
    this.tree = failureTrees.getTree(deviceId, categoryId);
    this.askedQuestions = new Set();
    this.answers = [];
    this.currentQuestionId = this.tree ? this.tree.initialQuestion : null;
    this.pathProbabilities = null;
  }

  getCurrentQuestion() {
    if (!this.tree || !this.currentQuestionId) return null;
    const question = this.tree.questions[this.currentQuestionId];
    if (!question) return null;

    return {
      id: question.id,
      text: question.text,
      answers: question.answers.map(a => ({ label: a.label })),
      questionNumber: this.askedQuestions.size + 1,
      totalQuestions: Object.keys(this.tree.questions).length,
    };
  }

  answer(questionId, answerLabel) {
    if (!this.tree) return { error: 'No diagnostic tree available for this device/category' };

    const question = this.tree.questions[questionId];
    if (!question) return { error: 'Invalid question ID' };

    const answer = question.answers.find(a => a.label === answerLabel);
    if (!answer) return { error: 'Invalid answer' };

    this.askedQuestions.add(questionId);
    this.answers.push({ questionId, answerLabel, timestamp: Date.now() });

    if (answer.confidence) {
      this.pathProbabilities = this._mergeProbabilities(answer.confidence);
    }

    const nextId = answer.next;
    if (this.tree.paths[nextId]) {
      this.currentQuestionId = null;
      return {
        status: 'diagnosis',
        path: this.tree.paths[nextId],
        probabilities: this.pathProbabilities,
      };
    }

    if (this.tree.questions[nextId]) {
      this.currentQuestionId = nextId;
      return {
        status: 'next_question',
        question: this.getCurrentQuestion(),
        probabilities: this.pathProbabilities,
      };
    }

    this.currentQuestionId = null;
    return {
      status: 'unknown',
      probabilities: this.pathProbabilities,
    };
  }

  getProbabilities() {
    return this.pathProbabilities;
  }

  getProgress() {
    if (!this.tree) return { asked: 0, total: 0, percentage: 0 };
    const total = Object.keys(this.tree.questions).length;
    return {
      asked: this.askedQuestions.size,
      total,
      percentage: total > 0 ? Math.round((this.askedQuestions.size / total) * 100) : 0,
    };
  }

  getSessionState() {
    return {
      deviceId: this.deviceId,
      categoryId: this.categoryId,
      currentQuestionId: this.currentQuestionId,
      askedQuestions: Array.from(this.askedQuestions),
      answers: this.answers,
      progress: this.getProgress(),
      probabilities: this.pathProbabilities,
    };
  }

  _mergeProbabilities(newProbs) {
    if (!this.pathProbabilities) return { ...newProbs };
    const merged = {};
    const allKeys = new Set([...Object.keys(this.pathProbabilities), ...Object.keys(newProbs)]);
    for (const key of allKeys) {
      const existing = this.pathProbabilities[key] || 0;
      const incoming = newProbs[key] || 0;
      merged[key] = Math.round((existing + incoming) / 2 * 100) / 100;
    }
    const total = Object.values(merged).reduce((s, v) => s + v, 0);
    if (total > 0) {
      for (const key of Object.keys(merged)) {
        merged[key] = Math.round((merged[key] / total) * 100) / 100;
      }
    }
    return merged;
  }

  static startSession(deviceId, categoryId) {
    return new AdaptiveQuestionEngine(deviceId, categoryId);
  }
}

module.exports = AdaptiveQuestionEngine;
