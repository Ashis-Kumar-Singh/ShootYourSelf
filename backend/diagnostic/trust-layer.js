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
  const score = result.score || 50;
  const source = result.source || '';

  const riskLevel = result.riskLevel || _inferRiskFromSource(source, score);
  const repairDifficulty = result.difficulty || _inferDifficultyFromType(result.type, score);
  const estimatedTime = result.estimatedTime || _inferTime(repairDifficulty);

  return {
    ...result,
    score,
    riskLevel,
    difficulty: repairDifficulty,
    estimatedTime,
    trustIndicators: {
      evidenceLevel: _getEvidenceLevel(score),
      sourceTrust: _getSourceTrust(source),
      isOfficial: ['ifixit.com', 'support.microsoft.com', 'support.apple.com', 'support.dell.com', 'support.hp.com', 'support.lenovo.com', 'support.samsung.com'].some(d => source.includes(d)),
      requiresTools: _requiresTools(result.steps, repairDifficulty),
      hasVideo: result.type === 'video',
    },
  };
}

function _inferRisk(difficulty) {
  const map = { beginner: 'low', intermediate: 'medium', advanced: 'high' };
  return map[difficulty] || 'medium';
}

function _inferTime(difficulty) {
  if (difficulty && typeof difficulty !== 'string') return '30-60 min';
  const map = { beginner: '15-30 min', intermediate: '30-60 min', advanced: '1-3 hours' };
  return map[difficulty] || '30-60 min';
}

function _getEvidenceLevel(score) {
  if (score >= 80) return 'strong';
  if (score >= 50) return 'moderate';
  return 'limited';
}

function _getSourceTrust(source) {
  const trusted = ['ifixit.com', 'support.microsoft.com', 'support.apple.com', 'support.dell.com', 'support.hp.com', 'support.lenovo.com', 'support.samsung.com', 'support.asus.com'];
  const known = ['youtube.com', 'reddit.com', 'stackexchange.com', 'tomshardware.com', 'wikihow.com', 'instructables.com', 'github.com', 'superuser.com'];
  const str = String(source || '').toLowerCase();
  for (const d of trusted) { if (str.includes(d)) return 'high'; }
  for (const d of known) { if (str.includes(d)) return 'medium'; }
  return 'low';
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

function _inferRiskFromSource(source, score) {
  const highRisk = ['unknown', 'sketchy'];
  if (highRisk.includes(source || '')) return 'high';
  if (score >= 70) return 'low';
  if (score >= 40) return 'medium';
  return 'high';
}

function _inferDifficultyFromType(type, score) {
  if (score >= 70) return 'beginner';
  if (score >= 40) return 'intermediate';
  const map = { guide: 'beginner', video: 'beginner', download: 'intermediate', affiliate: 'beginner' };
  return map[type] || 'intermediate';
}

module.exports = {
  buildRecommendation,
  buildResultMetadata,
  DIFFICULTY_LEVELS,
  RISK_LEVELS,
};
