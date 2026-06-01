'use strict';

function generateOverlayData(detections) {
  if (!detections || detections.length === 0) return null;

  return {
    boxes: detections.map(d => ({
      ...d.bbox,
      label: d.label,
      severity: d.severity,
      color: severityColor(d.severity),
      confidence: d.confidence,
    })),
    annotations: detections.map(d => ({
      text: d.label,
      severity: d.severity,
      position: {
        x: d.bbox.x,
        y: Math.max(0, d.bbox.y - 25),
      },
    })),
    composite: {
      width: 640,
      height: 360,
      background: 'rgba(0,0,0,0)',
    },
  };
}

function generateStepOverlay(stepIndex, totalSteps, componentBounds) {
  const x = componentBounds ? componentBounds.x : 320;
  const y = componentBounds ? componentBounds.y : 180;
  const width = componentBounds ? componentBounds.width : 80;
  const height = componentBounds ? componentBounds.height : 60;

  return {
    step: stepIndex,
    totalSteps,
    progress: `${stepIndex}/${totalSteps}`,
    highlight: {
      x: Math.round(x - width / 2),
      y: Math.round(y - height / 2),
      width: Math.round(width),
      height: Math.round(height),
      color: '#ffd700',
      pulse: true,
    },
    label: {
      text: `Step ${stepIndex}`,
      position: { x: Math.round(x), y: Math.max(0, Math.round(y - 30)) },
      color: '#ffffff',
    },
    arrow: {
      from: { x: 320, y: 0 },
      to: { x: Math.round(x), y: Math.round(y) },
      color: '#ffd700',
    },
  };
}

function generateRepairPathOverlay(componentBounds, pathType) {
  const paths = {
    screw: {
      points: generateScrewPoints(componentBounds),
      color: '#ff4444',
      label: 'Remove screws',
    },
    pry: {
      points: generatePryPoints(componentBounds),
      color: '#44ff44',
      label: 'Pry here',
    },
    cable: {
      points: generateCablePoints(componentBounds),
      color: '#ffaa00',
      label: 'Disconnect cable',
    },
  };
  return paths[pathType] || null;
}

function severityColor(severity) {
  const map = { high: '#ff4444', medium: '#ffaa00', low: '#44aaff' };
  return map[severity] || '#ffffff';
}

function generateScrewPoints(bounds) {
  if (!bounds) return [];
  const { x, y, width, height } = bounds;
  return [
    { x: x + 10, y: y + 10 },
    { x: x + width - 10, y: y + 10 },
    { x: x + 10, y: y + height - 10 },
    { x: x + width - 10, y: y + height - 10 },
  ];
}

function generatePryPoints(bounds) {
  if (!bounds) return [];
  return [
    { x: bounds.x + Math.round(bounds.width / 2), y: bounds.y + bounds.height + 5 },
    { x: bounds.x + Math.round(bounds.width / 2), y: bounds.y + bounds.height + 25 },
  ];
}

function generateCablePoints(bounds) {
  if (!bounds) return [];
  return [
    { x: bounds.x, y: bounds.y + Math.round(bounds.height / 2) },
    { x: bounds.x - 30, y: bounds.y + Math.round(bounds.height / 2) },
  ];
}

module.exports = {
  generateOverlayData,
  generateStepOverlay,
  generateRepairPathOverlay,
};
