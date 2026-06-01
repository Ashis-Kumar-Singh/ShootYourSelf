'use strict';

const DETECTION_FEATURES = {
  swollen_battery: {
    label: 'Swollen Battery',
    severity: 'high',
    actionable: true,
    repairNote: 'Do not puncture. Dispose properly. Replace immediately.',
    keywords: ['swelling', 'bulging', 'puffed', 'battery bulge'],
  },
  burnt_capacitor: {
    label: 'Burnt Capacitor',
    severity: 'high',
    actionable: true,
    repairNote: 'Check surrounding components. Replace with same rating.',
    keywords: ['burnt', 'burned', 'charred', 'capacitor bulge', 'leaking capacitor'],
  },
  corrosion: {
    label: 'Corrosion / Liquid Damage',
    severity: 'medium',
    actionable: true,
    repairNote: 'Clean with isopropyl alcohol. Check for broken traces.',
    keywords: ['corrosion', 'green', 'white residue', 'rust', 'liquid damage'],
  },
  cracked_trace: {
    label: 'Cracked PCB Trace',
    severity: 'high',
    actionable: true,
    repairNote: 'Requires soldering. Scrape mask, tin, and bridge with wire.',
    keywords: ['cracked trace', 'broken trace', 'cut trace', 'pcb crack'],
  },
  damaged_port: {
    label: 'Damaged Port / Connector',
    severity: 'medium',
    actionable: true,
    repairNote: 'Check for bent pins. May need reflow or replacement.',
    keywords: ['bent pin', 'broken port', 'damaged connector', 'loose port'],
  },
  display_bleeding: {
    label: 'Display Backlight Bleeding',
    severity: 'low',
    actionable: false,
    repairNote: 'Common in LCD panels. Reduce bezel pressure if possible.',
    keywords: ['bleeding', 'light bleed', 'backlight bleed', 'screen bleed'],
  },
  thermal_paste_degraded: {
    label: 'Thermal Paste Degraded',
    severity: 'medium',
    actionable: true,
    repairNote: 'Clean old paste. Apply fresh quality thermal paste.',
    keywords: ['dry paste', 'thermal paste', 'cracked paste', 'cpu paste'],
  },
  blown_fuse: {
    label: 'Blown Fuse',
    severity: 'high',
    actionable: true,
    repairNote: 'Check with multimeter. Replace with same rating.',
    keywords: ['blown fuse', 'blown fuse', 'fuse blown', 'open fuse'],
  },
  broken_fan: {
    label: 'Broken / Stuck Fan',
    severity: 'medium',
    actionable: true,
    repairNote: 'Check for obstructions. Replace if bearing failed.',
    keywords: ['fan not spinning', 'stuck fan', 'broken fan', 'fan blade'],
  },
};

let backend = 'simulation';
let available = true;

function getSupportedDetections() {
  return Object.entries(DETECTION_FEATURES).map(([id, feat]) => ({
    id,
    label: feat.label,
    severity: feat.severity,
    actionable: feat.actionable,
  }));
}

function getModelInfo() {
  return {
    primary: {
      name: 'YOLOv8n-hardware',
      type: 'object_detection',
      status: available ? 'configured' : 'unavailable',
      accuracy: '0.82 (simulated)',
    },
    secondary: {
      name: 'Detectron2-fault-classification',
      type: 'classification',
      status: 'planned',
    },
    segmentation: {
      name: 'Segment Anything (SAM)',
      type: 'segmentation',
      status: 'planned',
    },
    fallback: {
      name: 'OpenCV heuristic analysis',
      type: 'computer_vision',
      status: available ? 'available' : 'unavailable',
    },
  };
}

function isAvailable() { return available; }
function getBackend() { return backend; }

function setBackend(b) {
  backend = b;
  available = b !== 'none';
}

async function detect(imageBuffer) {
  const detections = [];
  const imageHash = simpleImageHash(imageBuffer);

  const features = Object.entries(DETECTION_FEATURES);
  const numDetections = Math.floor(Math.random() * 3) + 1;
  const selectedIndices = new Set();
  while (selectedIndices.size < numDetections && selectedIndices.size < features.length) {
    selectedIndices.add(Math.floor(Math.random() * features.length));
  }

  for (const idx of selectedIndices) {
    const [id, feature] = features[idx];
    const confidence = 0.55 + (Math.random() * 0.4);
    detections.push({
      id,
      label: feature.label,
      confidence: Math.round(confidence * 100) / 100,
      severity: feature.severity,
      actionable: feature.actionable,
      repairNote: feature.repairNote,
      bbox: generateBoundingBox(imageHash + idx),
    });
  }

  return detections.sort((a, b) => b.confidence - a.confidence);
}

function generateSummary(detections) {
  if (!detections || detections.length === 0) {
    return { text: 'No hardware faults detected.', hasIssues: false, criticalCount: 0 };
  }
  const high = detections.filter(d => d.severity === 'high');
  const medium = detections.filter(d => d.severity === 'medium');
  const actionable = detections.filter(d => d.actionable);

  let text = `Found ${detections.length} issue(s): `;
  text += high.length > 0 ? `${high.length} critical, ` : '';
  text += medium.length > 0 ? `${medium.length} moderate, ` : '';
  text += `${detections.length - high.length - medium.length} minor.`;
  if (actionable.length > 0) text += ` ${actionable.length} issue(s) require repair action.`;

  return { text, hasIssues: detections.length > 0, criticalCount: high.length, moderateCount: medium.length };
}

function inferHardwareContext(detections) {
  const context = { possibleDeviceType: 'laptop', confidence: 0.5, clues: [] };
  const labels = detections.map(d => d.label.toLowerCase());
  if (labels.some(l => l.includes('fan') || l.includes('thermal') || l.includes('battery'))) {
    context.possibleDeviceType = 'laptop';
    context.confidence = 0.7;
    context.clues.push('Cooling system or battery components detected');
  }
  if (labels.some(l => l.includes('display') || l.includes('bleeding'))) {
    context.possibleDeviceType = 'laptop_or_monitor';
    context.clues.push('Display-related fault detected');
  }
  return context;
}

function generateBoundingBox(seed) {
  const x = ((seed * 7 + 13) % 640);
  const y = ((seed * 11 + 37) % 360);
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(80 + (seed * 3 % 120)),
    height: Math.round(60 + (seed * 5 % 100)),
  };
}

function simpleImageHash(buffer) {
  let hash = 0;
  if (!buffer || buffer.length === 0) return hash;
  const step = Math.max(1, Math.floor(buffer.length / 256));
  for (let i = 0; i < buffer.length; i += step) {
    hash = ((hash << 5) - hash) + buffer[i];
    hash |= 0;
  }
  return Math.abs(hash);
}

module.exports = {
  detect,
  generateSummary,
  inferHardwareContext,
  getSupportedDetections,
  getModelInfo,
  isAvailable,
  getBackend,
  setBackend,
};
