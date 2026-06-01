'use strict';

const REPAIR_MODELS = {
  laptop: {
    screwPatterns: {
      bottom_panel: [
        { id: 's1', label: 'Bottom-left corner', x: 0.05, y: 0.92 },
        { id: 's2', label: 'Bottom-right corner', x: 0.95, y: 0.92 },
        { id: 's3', label: 'Top-left corner', x: 0.05, y: 0.08 },
        { id: 's4', label: 'Top-right corner', x: 0.95, y: 0.08 },
        { id: 's5', label: 'Center-top', x: 0.5, y: 0.05 },
        { id: 's6', label: 'Center-bottom', x: 0.5, y: 0.95 },
      ],
      battery: [
        { id: 'sb1', label: 'Battery left', x: 0.15, y: 0.7 },
        { id: 'sb2', label: 'Battery right', x: 0.35, y: 0.7 },
      ],
      ssd: [
        { id: 'ss1', label: 'SSD screw', x: 0.6, y: 0.5 },
      ],
    },
    componentPositions: {
      battery: { x: 0.1, y: 0.55, width: 0.3, height: 0.3, label: 'Battery' },
      ssd: { x: 0.5, y: 0.4, width: 0.2, height: 0.12, label: 'SSD / NVMe' },
      ram: { x: 0.5, y: 0.6, width: 0.2, height: 0.08, label: 'RAM Slots' },
      fan_left: { x: 0.15, y: 0.25, width: 0.15, height: 0.15, label: 'Left Fan' },
      fan_right: { x: 0.7, y: 0.25, width: 0.15, height: 0.15, label: 'Right Fan' },
      cmos: { x: 0.35, y: 0.15, width: 0.08, height: 0.06, label: 'CMOS Battery' },
    },
    pryPoints: {
      bottom_panel: [
        { x: 0.3, y: 0.92, direction: 'up', label: 'Pry here to release clips' },
        { x: 0.7, y: 0.92, direction: 'up', label: 'Pry here to release clips' },
        { x: 0.3, y: 0.08, direction: 'down', label: 'Pry here' },
      ],
    },
  },
  phone: {
    screwPatterns: {
      bottom_assembly: [
        { id: 'ps1', label: 'Pentalobe left', x: 0.05, y: 0.85 },
        { id: 'ps2', label: 'Pentalobe right', x: 0.95, y: 0.85 },
      ],
    },
    componentPositions: {
      battery: { x: 0.3, y: 0.5, width: 0.4, height: 0.25, label: 'Battery' },
      screen: { x: 0.05, y: 0.05, width: 0.9, height: 0.85, label: 'Screen Assembly' },
      charging_port: { x: 0.45, y: 0.92, width: 0.1, height: 0.05, label: 'Charging Port' },
    },
    pryPoints: {
      screen: [
        { x: 0.1, y: 0.1, direction: 'up', label: 'Pry screen from frame' },
        { x: 0.9, y: 0.1, direction: 'up', label: 'Pry screen from frame' },
      ],
    },
  },
};

function getRepairModel(deviceType) {
  return REPAIR_MODELS[deviceType] || null;
}

function getScrewPositions(deviceType, assembly) {
  const model = REPAIR_MODELS[deviceType];
  if (!model) return [];
  const screws = model.screwPatterns[assembly];
  if (!screws) return [];
  return screws.map(s => ({ ...s, detected: false }));
}

function getComponentPositions(deviceType) {
  const model = REPAIR_MODELS[deviceType];
  if (!model) return [];
  return Object.entries(model.componentPositions).map(([id, pos]) => ({ id, ...pos }));
}

function getPryPoints(deviceType, assembly) {
  const model = REPAIR_MODELS[deviceType];
  if (!model) return [];
  return model.pryPoints[assembly] || [];
}

function generateAROverlay(deviceType, repairStep, cameraWidth, cameraHeight) {
  const model = getRepairModel(deviceType);
  if (!model) return null;

  const w = cameraWidth || 1920;
  const h = cameraHeight || 1080;

  const screws = model.screwPatterns.bottom_panel || [];
  const components = model.componentPositions;
  const pryPoints = model.pryPoints.bottom_panel || [];

  function scale(point) {
    return { x: Math.round(point.x * w), y: Math.round(point.y * h) };
  }
  function scaleRect(rect) {
    return { x: Math.round(rect.x * w), y: Math.round(rect.y * h), width: Math.round(rect.width * w), height: Math.round(rect.height * h) };
  }

  return {
    camera: { width: w, height: h },
    step: repairStep || 1,
    overlays: {
      screws: screws.map(s => ({ ...s, position: scale(s) })),
      components: Object.entries(components).map(([id, c]) => ({ id, label: c.label, bounds: scaleRect(c) })),
      pryPoints: pryPoints.map(p => ({ ...p, position: scale(p) })),
    },
    style: {
      screwColor: '#ff4444',
      screwRadius: 12,
      componentBorderColor: '#ffd700',
      componentBorderWidth: 3,
      pryColor: '#44ff44',
      labelFontSize: 14,
      labelColor: '#ffffff',
    },
  };
}

function detectScrewsInView(deviceType, detectedPoints) {
  const model = getRepairModel(deviceType);
  if (!model) return [];
  const screws = model.screwPatterns.bottom_panel || [];
  return screws.map(s => ({
    ...s,
    detected: detectedPoints ? detectedPoints.some(dp => Math.abs(dp.x - s.x) < 0.05 && Math.abs(dp.y - s.y) < 0.05) : false,
  }));
}

module.exports = {
  getRepairModel,
  getScrewPositions,
  getComponentPositions,
  getPryPoints,
  generateAROverlay,
  detectScrewsInView,
  REPAIR_MODELS,
};
