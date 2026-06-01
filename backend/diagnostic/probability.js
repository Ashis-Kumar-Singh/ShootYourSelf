'use strict';
const { db } = require('../db');

function calculateProbabilities(deviceId, brand, model, categoryId, symptoms, answeredQuestions) {
  const base = _getBaseProbabilities(deviceId, categoryId);
  const historical = _getHistoricalProbabilities(deviceId, brand, model, categoryId, symptoms);
  const merged = _mergeProbabilitySources([base, historical], [0.6, 0.4]);
  const normalized = _normalize(merged);
  return normalized;
}

function _getBaseProbabilities(device, category) {
  const defaults = {
    laptop: {
      'no-display': { lcdCable: 0.25, screenPanel: 0.2, gpu: 0.18, backlightInverter: 0.15, ram: 0.12, motherboard: 0.1 },
      'no-boot': { hdd: 0.25, ram: 0.2, os: 0.18, motherboard: 0.15, driver: 0.12, bios: 0.1 },
      overheating: { dust: 0.3, thermalPaste: 0.25, fan: 0.2, heatsink: 0.15, airflow: 0.1 },
      battery: { batteryAge: 0.35, charger: 0.2, chargingPort: 0.15, driver: 0.15, motherboard: 0.1, bios: 0.05 },
      troubleshooting: { software: 0.3, driver: 0.25, hardware: 0.25, userError: 0.1, malware: 0.1 },
      ram: { incompatible: 0.3, seating: 0.25, faultyStick: 0.2, slot: 0.15, speed: 0.1 },
      ssd: { failed: 0.3, connection: 0.2, compatibility: 0.2, firmware: 0.15, partition: 0.15 },
      network: { driver: 0.3, router: 0.2, interference: 0.2, hardware: 0.15, configuration: 0.15 },
      drivers: { outdated: 0.35, incompatible: 0.25, corrupt: 0.2, missing: 0.2 },
      display: { cable: 0.3, panel: 0.25, gpu: 0.2, backlight: 0.15, inverter: 0.1 },
      keyboard: { debris: 0.3, connection: 0.25, liquid: 0.2, driver: 0.15, controller: 0.1 },
    },
    phone: {
      'no-power': { battery: 0.35, chargingPort: 0.2, motherboard: 0.2, software: 0.15, powerButton: 0.1 },
      'cracked-screen': { lcd: 0.4, digitizer: 0.3, glass: 0.2, connector: 0.1 },
      troubleshooting: { software: 0.35, battery: 0.2, hardware: 0.2, userError: 0.15, malware: 0.1 },
      screen: { lcd: 0.35, digitizer: 0.3, glass: 0.2, connector: 0.15 },
      battery: { age: 0.4, chargingPort: 0.2, software: 0.2, batteryConnection: 0.1, motherboard: 0.1 },
      charging: { port: 0.35, cable: 0.25, battery: 0.2, software: 0.1, motherboard: 0.1 },
      camera: { lens: 0.3, software: 0.25, sensor: 0.2, connection: 0.15, hardware: 0.1 },
      audio: { speaker: 0.35, software: 0.25, jack: 0.2, water: 0.1, motherboard: 0.1 },
      water: { battery: 0.3, motherboard: 0.3, screen: 0.2, speaker: 0.1, chargingPort: 0.1 },
      os: { update: 0.3, storage: 0.25, app: 0.2, firmware: 0.15, hardware: 0.1 },
    },
  };

  const deviceDefaults = defaults[device];
  if (!deviceDefaults) return {};
  return deviceDefaults[category] || {};
}

function _getHistoricalProbabilities(device, brand, model, category, symptoms) {
  const result = {};
  try {
    const symptomFilter = symptoms && symptoms.length > 0 ? symptoms[0] : '';
    const patterns = symptomFilter
      ? db.prepare(`SELECT failure, frequency, success_rate FROM failure_patterns WHERE device = ? AND brand = ? AND model = ? AND symptom LIKE ? ORDER BY frequency DESC LIMIT 10`).all(device, brand, model, `%${symptomFilter}%`)
      : db.prepare(`SELECT failure, frequency, success_rate FROM failure_patterns WHERE device = ? AND brand = ? AND model = ? ORDER BY frequency DESC LIMIT 10`).all(device, brand, model);
    const total = patterns.reduce((s, p) => s + p.frequency, 0);
    if (total > 0) {
      for (const p of patterns) {
        result[p.failure] = Math.round((p.frequency / total) * 100) / 100;
      }
    }
  } catch (e) { /* no historical data yet */ }
  return result;
}

function _mergeProbabilitySources(sources, weights) {
  const merged = {};
  const allKeys = new Set();
  for (const source of sources) {
    for (const key of Object.keys(source)) {
      allKeys.add(key);
    }
  }
  for (const key of allKeys) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < sources.length; i++) {
      if (sources[i][key] !== undefined) {
        weightedSum += sources[i][key] * (weights[i] || 1);
        totalWeight += weights[i] || 1;
      }
    }
    if (totalWeight > 0) {
      merged[key] = Math.round((weightedSum / totalWeight) * 100) / 100;
    }
  }
  return merged;
}

function _normalize(probs) {
  const total = Object.values(probs).reduce((s, v) => s + v, 0);
  if (total === 0) return probs;
  const normalized = {};
  for (const [key, value] of Object.entries(probs)) {
    normalized[key] = Math.round((value / total) * 10000) / 100;
  }
  return normalized;
}

function calculateConfidence(probability, evidenceStrength) {
  const base = (probability || 0) * 100;
  const evidenceBonus = Math.min((evidenceStrength || 0) * 5, 15);
  return Math.round(Math.min(base + evidenceBonus, 99));
}

module.exports = {
  calculateProbabilities,
  calculateConfidence,
};
