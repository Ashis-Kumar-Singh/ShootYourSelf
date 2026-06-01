'use strict';

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];
const RISK_LEVELS = ['low', 'medium', 'high'];

function buildRecommendation(path, probabilityPercent) {
  const confidence = path.confidence
    ? Math.round(path.confidence * 100)
    : probabilityPercent || 50;

  const risk = path.risk || _inferRisk(path.difficulty);
  const difficulty = path.difficulty || 'intermediate';
  const estimatedTime = path.time || _inferTime(difficulty);
  const steps = path.steps || [];

  return {
    diagnosis: path.label,
    description: path.description || '',
    confidence,
    riskLevel: risk,
    repairDifficulty: difficulty,
    estimatedTime,
    steps,
    links: path.links || [],
    trustIndicators: {
      evidenceLevel: _getEvidenceLevel(confidence),
      requiresTools: _requiresTools(steps, difficulty),
      expertRecommended: risk === 'high',
      canDIY: risk !== 'high' || difficulty === 'beginner',
    },
  };
}

function buildResultMetadata(result, deviceContext) {
  return {
    ...result,
    trustLayer: {
      confidence: result.score || 50,
      riskLevel: _inferRiskFromSource(result.source),
      repairDifficulty: _inferDifficultyFromType(result.type),
      estimatedTime: _inferTimeFromType(result.type),
      source: result.source,
      type: result.type,
    },
  };
}

function _inferRisk(difficulty) {
  const map = { beginner: 'low', intermediate: 'medium', advanced: 'high' };
  return map[difficulty] || 'medium';
}

function _inferTime(difficulty) {
  const map = { beginner: '15-30 min', intermediate: '30-60 min', advanced: '1-3 hours' };
  return map[difficulty] || '30-60 min';
}

function _getEvidenceLevel(confidence) {
  if (confidence >= 80) return 'strong';
  if (confidence >= 50) return 'moderate';
  return 'limited';
}

function _requiresTools(steps, difficulty) {
  if (!steps || steps.length === 0) return difficulty !== 'beginner';
  const toolKeywords = ['screwdriver', 'spudger', 'pry', 'multimeter', 'soldering', 'heat', 'pry tool', 'tweezer'];
  for (const step of steps) {
    for (const kw of toolKeywords) {
      if (step.toLowerCase().includes(kw)) return true;
    }
  }
  return false;
}

function _inferRiskFromSource(source) {
  const highRisk = ['unknown', 'sketchy', 'forum'];
  if (highRisk.includes(source || '')) return 'high';
  return 'low';
}

function _inferDifficultyFromType(type) {
  const map = { guide: 'beginner', video: 'beginner', download: 'intermediate', affiliate: 'beginner' };
  return map[type] || 'intermediate';
}

function _inferTimeFromType(type) {
  const map = { guide: '20-40 min', video: '10-30 min', download: '5-10 min' };
  return map[type] || '30-60 min';
}

module.exports = {
  buildRecommendation,
  buildResultMetadata,
  DIFFICULTY_LEVELS,
  RISK_LEVELS,
};
