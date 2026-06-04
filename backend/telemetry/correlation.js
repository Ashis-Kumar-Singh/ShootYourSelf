'use strict';

const SEVERITY_ORDER = { critical: 4, warning: 3, medium: 2, info: 1, ok: 0 };

const DEVICE_THRESHOLDS = {
  laptop: { cpuTempWarning: 85, cpuTempCritical: 95, gpuTempWarning: 80, gpuTempCritical: 90, batteryWearWarning: 25, batteryWearCritical: 40, batteryHealthWarning: 60, batteryHealthCritical: 40, smartLifeCritical: 15, smartLifeWarning: 25, reallocatedSectorsWarning: 3, reallocatedSectorsCritical: 8, bsodWarning: 2, bsodCritical: 5 },
  phone: { cpuTempWarning: 75, cpuTempCritical: 85, gpuTempWarning: 70, gpuTempCritical: 80, batteryWearWarning: 20, batteryWearCritical: 35, batteryHealthWarning: 70, batteryHealthCritical: 55, smartLifeCritical: 10, smartLifeWarning: 20, reallocatedSectorsWarning: 2, reallocatedSectorsCritical: 5, bsodWarning: 1, bsodCritical: 3 },
  tablet: { cpuTempWarning: 78, cpuTempCritical: 88, gpuTempWarning: 73, gpuTempCritical: 83, batteryWearWarning: 22, batteryWearCritical: 37, batteryHealthWarning: 65, batteryHealthCritical: 50, smartLifeCritical: 10, smartLifeWarning: 20, reallocatedSectorsWarning: 2, reallocatedSectorsCritical: 5, bsodWarning: 1, bsodCritical: 3 },
  desktop: { cpuTempWarning: 88, cpuTempCritical: 98, gpuTempWarning: 83, gpuTempCritical: 93, batteryWearWarning: 30, batteryWearCritical: 45, batteryHealthWarning: 50, batteryHealthCritical: 35, smartLifeCritical: 15, smartLifeWarning: 25, reallocatedSectorsWarning: 5, reallocatedSectorsCritical: 10, bsodWarning: 3, bsodCritical: 6 },
  console: { cpuTempWarning: 80, cpuTempCritical: 92, gpuTempWarning: 78, gpuTempCritical: 88, batteryWearWarning: 25, batteryWearCritical: 40, batteryHealthWarning: 60, batteryHealthCritical: 45, smartLifeCritical: 15, smartLifeWarning: 25, reallocatedSectorsWarning: 3, reallocatedSectorsCritical: 8, bsodWarning: 2, bsodCritical: 5 },
};

const DEFAULT_THRESHOLDS = DEVICE_THRESHOLDS.laptop;

function getThresholds(deviceType) {
  return DEVICE_THRESHOLDS[deviceType] || DEFAULT_THRESHOLDS;
}

function freshnessWeight(timestamp, maxAgeDays = 90) {
  if (!timestamp) return 0.5;
  const ageMs = Date.now() - timestamp;
  const maxAgeMs = maxAgeDays * 86400000;
  if (ageMs < 0) return 1;
  if (ageMs > maxAgeMs) return 0.1;
  return 1 - (ageMs / maxAgeMs) * 0.9;
}

function bayesianUpdate(priorConfidence, evidenceLikelihood) {
  const p = Math.max(0.01, Math.min(0.99, priorConfidence));
  const e = Math.max(0.01, Math.min(0.99, evidenceLikelihood));
  const posterior = (p * e) / (p * e + (1 - p) * (1 - e));
  return Math.round(posterior * 100) / 100;
}

function deduplicateFindings(findings) {
  const seen = new Map();
  return findings.filter(f => {
    const key = `${f.type}:${f.metric}`;
    if (seen.has(key)) {
      const existing = seen.get(key);
      if (f.severity !== existing.severity) {
        const sevOrder = { critical: 4, warning: 3, medium: 2, info: 1 };
        if (sevOrder[f.severity] > sevOrder[existing.severity]) {
          seen.set(key, f);
          return false;
        }
      }
      if (f.confidence > existing.confidence) {
        seen.set(key, f);
        return false;
      }
      return false;
    }
    seen.set(key, f);
    return true;
  });
}

function correlate(device, brand, model, symptoms, telemetry, outcomes, alerts) {
  const findings = [];
  const evidenceCount = { telemetry: 0, history: 0, symptoms: 0, alerts: 0 };
  const thresholds = getThresholds(device);

  // 1. Correlate active alerts with symptoms
  if (alerts && alerts.length > 0) {
    const relevantAlerts = alerts.filter(a => !a.acknowledged);
    const alertGroups = new Map();

    for (const alert of relevantAlerts) {
      const freshness = freshnessWeight(alert.created_at, 30);
      const key = `${alert.alert_type}:${alert.metric}`;

      if (!alertGroups.has(key)) {
        alertGroups.set(key, { count: 0, severities: [], maxValue: 0, best: null });
      }
      const group = alertGroups.get(key);
      group.count++;
      group.severities.push(alert.severity);
      group.maxValue = Math.max(group.maxValue, alert.value || 0);
      if (!group.best || freshness > freshnessWeight(group.best.created_at, 30)) {
        group.best = alert;
      }
    }

    for (const [, group] of alertGroups) {
      const alert = group.best;
      const freshness = freshnessWeight(alert.created_at, 30);
      const symptomMatch = symptoms && symptoms.length > 0 && symptoms.some(s =>
        s.toLowerCase().includes(alert.metric.toLowerCase()) ||
        alert.message.toLowerCase().includes(s.toLowerCase())
      );

      let baseConfidence = 0.5;
      if (symptomMatch) baseConfidence += 0.2;
      if (alert.severity === 'critical') baseConfidence += 0.15;
      if (group.count > 1) baseConfidence = bayesianUpdate(baseConfidence, 0.7 + (group.count * 0.05));
      baseConfidence = Math.round(baseConfidence * freshness * 100) / 100;

      if (symptomMatch || alert.severity === 'critical' || group.count >= 2) {
        findings.push({
          type: 'alert_correlation',
          source: 'telemetry_alert',
          metric: alert.metric,
          value: group.maxValue,
          message: alert.message,
          severity: (group.count >= 3 && alert.severity === 'warning') ? 'warning' : alert.severity,
          confidence: Math.min(baseConfidence, 0.98),
          occurrenceCount: group.count,
        });
        evidenceCount.alerts++;
      }
    }
  }

  // 2. Telemetry analysis with device-aware thresholds and freshness
  if (telemetry) {
    for (const [dataType, report] of Object.entries(telemetry)) {
      if (!report || !report.data) continue;
      const data = report.data;
      const freshness = freshnessWeight(report.reported_at, 60);

      if (dataType === 'smart') {
        const lifeThresholds = thresholds.smartLifeCritical;
        if (data.remaining_life_percent < lifeThresholds) {
          const severity = data.remaining_life_percent < thresholds.smartLifeCritical ? 'critical' : 'warning';
          findings.push({
            type: 'disk_failure_risk', source: 'smart', metric: 'remaining_life',
            value: data.remaining_life_percent, message: `Drive at ${data.remaining_life_percent}% life remaining`,
            severity, confidence: Math.round(Math.min(0.95, 0.7 + (1 - data.remaining_life_percent / lifeThresholds) * 0.25) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        if ((data.reallocated_sectors || 0) > thresholds.reallocatedSectorsWarning) {
          const severity = (data.reallocated_sectors || 0) > thresholds.reallocatedSectorsCritical ? 'critical' : 'warning';
          const ratio = Math.min(1, (data.reallocated_sectors || 0) / 50);
          findings.push({
            type: 'disk_failure_risk', source: 'smart', metric: 'reallocated_sectors',
            value: data.reallocated_sectors, message: `${data.reallocated_sectors} reallocated sectors detected`,
            severity, confidence: Math.round(Math.min(0.9, 0.5 + ratio * 0.4) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        if ((data.pending_sectors || 0) > 2) {
          findings.push({
            type: 'disk_failure_risk', source: 'smart', metric: 'pending_sectors',
            value: data.pending_sectors, message: `${data.pending_sectors} pending sectors - possible drive degradation`,
            severity: 'warning', confidence: Math.round(Math.min(0.8, 0.4 + (data.pending_sectors / 20) * 0.4) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        if (data.temperature && data.temperature > 55) {
          findings.push({
            type: 'overheating', source: 'smart', metric: 'drive_temperature',
            value: data.temperature, message: `Drive temperature: ${data.temperature}°C`,
            severity: data.temperature > 65 ? 'warning' : 'info',
            confidence: Math.round(Math.min(0.7, 0.3 + (data.temperature - 55) / 30 * 0.4) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
      }

      if (dataType === 'battery') {
        const wearThreshold = thresholds.batteryWearWarning;
        if ((data.wear_level || 0) > wearThreshold) {
          const severity = (data.wear_level || 0) > thresholds.batteryWearCritical ? 'critical' : 'warning';
          findings.push({
            type: 'battery_degradation', source: 'battery_telemetry', metric: 'wear_level',
            value: data.wear_level, message: `Battery worn ${data.wear_level}%`,
            severity, confidence: Math.round(Math.min(0.95, 0.5 + (data.wear_level / 100) * 0.45) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        if ((data.health_percent || 100) < thresholds.batteryHealthWarning) {
          const severity = (data.health_percent || 100) < thresholds.batteryHealthCritical ? 'critical' : 'warning';
          findings.push({
            type: 'battery_failure', source: 'battery_telemetry', metric: 'health',
            value: data.health_percent, message: `Battery health at ${data.health_percent}%`,
            severity, confidence: Math.round(Math.min(0.95, 0.6 + (1 - (data.health_percent || 100) / 100) * 0.35) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        if (data.temperature && data.temperature > 40) {
          findings.push({
            type: 'battery_degradation', source: 'battery_telemetry', metric: 'temperature',
            value: data.temperature, message: `Battery temperature: ${data.temperature}°C`,
            severity: data.temperature > 50 ? 'warning' : 'info',
            confidence: Math.round(Math.min(0.7, 0.3 + (data.temperature - 40) / 20 * 0.4) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        if ((data.cycle_count || 0) > 800) {
          findings.push({
            type: 'battery_degradation', source: 'battery_telemetry', metric: 'cycle_count',
            value: data.cycle_count, message: `${data.cycle_count} charge cycles - battery approaching end of life`,
            severity: data.cycle_count > 1200 ? 'critical' : 'warning',
            confidence: Math.round(Math.min(0.85, 0.4 + (data.cycle_count / 2000) * 0.45) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
      }

      if (dataType === 'cpu') {
        if ((data.max_temperature || 0) > thresholds.cpuTempWarning) {
          const severity = (data.max_temperature || 0) > thresholds.cpuTempCritical ? 'critical' : 'warning';
          findings.push({
            type: 'overheating', source: 'cpu_telemetry', metric: 'max_temperature',
            value: data.max_temperature, message: `CPU reached ${data.max_temperature}°C`,
            severity, confidence: Math.round(Math.min(0.95, 0.5 + ((data.max_temperature - thresholds.cpuTempWarning) / 30) * 0.45) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        if ((data.current_temperature || 0) > thresholds.cpuTempWarning) {
          const severity = (data.current_temperature || 0) > thresholds.cpuTempCritical ? 'critical' : 'warning';
          findings.push({
            type: 'overheating', source: 'cpu_telemetry', metric: 'current_temperature',
            value: data.current_temperature, message: `CPU currently at ${data.current_temperature}°C`,
            severity, confidence: Math.round(Math.min(0.9, 0.4 + ((data.current_temperature - thresholds.cpuTempWarning) / 30) * 0.5) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        if ((data.throttling_percent || 0) > 5) {
          findings.push({
            type: 'thermal_throttling', source: 'cpu_telemetry', metric: 'throttling',
            value: data.throttling_percent, message: `CPU throttling ${data.throttling_percent}% of the time`,
            severity: (data.throttling_percent || 0) > 20 ? 'critical' : 'warning',
            confidence: Math.round(Math.min(0.85, 0.4 + (data.throttling_percent / 50) * 0.45) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        if ((data.load_percent || 0) > 95 && data.throttling_percent < 5) {
          findings.push({
            type: 'high_cpu_load', source: 'cpu_telemetry', metric: 'load',
            value: data.load_percent, message: `Sustained CPU load at ${data.load_percent}% without throttling`,
            severity: 'info', confidence: Math.round(0.4 * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
      }

      if (dataType === 'gpu') {
        if ((data.temperature || 0) > thresholds.gpuTempWarning) {
          const severity = (data.temperature || 0) > thresholds.gpuTempCritical ? 'critical' : 'warning';
          findings.push({
            type: 'overheating', source: 'gpu_telemetry', metric: 'gpu_temperature',
            value: data.temperature, message: `GPU at ${data.temperature}°C`,
            severity, confidence: Math.round(Math.min(0.9, 0.4 + ((data.temperature - thresholds.gpuTempWarning) / 25) * 0.5) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
      }

      if (dataType === 'system') {
        const bsodCount = data.bsod_count_30days || 0;
        if (bsodCount > thresholds.bsodWarning) {
          const severity = bsodCount > thresholds.bsodCritical ? 'critical' : 'warning';
          findings.push({
            type: 'system_instability', source: 'system_telemetry', metric: 'bsod_count',
            value: bsodCount, message: `${bsodCount} crashes in last 30 days`,
            severity, confidence: Math.round(Math.min(0.9, 0.3 + (bsodCount / 15) * 0.55) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        const errorCount = data.error_count_24h || 0;
        if (errorCount > 20) {
          findings.push({
            type: 'system_instability', source: 'system_telemetry', metric: 'error_count_24h',
            value: errorCount, message: `${errorCount} application errors in 24h`,
            severity: errorCount > 100 ? 'warning' : 'info',
            confidence: Math.round(Math.min(0.7, 0.2 + (errorCount / 500) * 0.5) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        if ((data.disk_usage_percent || 0) > 95) {
          findings.push({
            type: 'disk_space_critical', source: 'system_telemetry', metric: 'disk_usage',
            value: data.disk_usage_percent, message: `Disk ${data.disk_usage_percent}% full`,
            severity: 'warning', confidence: Math.round(Math.min(0.7, 0.3 + (data.disk_usage_percent - 95) / 5 * 0.4) * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
        if ((data.uptime_seconds || 0) > 2592000) {
          findings.push({
            type: 'uptime_warning', source: 'system_telemetry', metric: 'uptime',
            value: Math.round(data.uptime_seconds / 86400), message: `System up ${Math.round(data.uptime_seconds / 86400)} days without reboot`,
            severity: 'info', confidence: Math.round(0.3 * freshness * 100) / 100
          });
          evidenceCount.telemetry++;
        }
      }
    }
  }

  // 3. Correlate with repair history
  if (outcomes && outcomes.length > 0) {
    const recentFailures = outcomes.filter(o => !o.success && o.created_at > Date.now() - 86400000 * 365);
    if (recentFailures.length > 2) {
      const recencyBoost = Math.min(1, 1 + (recentFailures.filter(o => o.created_at > Date.now() - 86400000 * 30).length * 0.1));
      findings.push({
        type: 'repeated_failure', source: 'repair_history', metric: 'failed_attempts',
        value: recentFailures.length,
        message: `${recentFailures.length} failed repair attempt${recentFailures.length > 1 ? 's' : ''}`,
        severity: recentFailures.length > 5 ? 'critical' : 'medium',
        confidence: Math.round(Math.min(0.85, 0.4 + (recentFailures.length / 10) * 0.4) * recencyBoost * 100) / 100
      });
      evidenceCount.history++;
    }

    const recentSuccessful = outcomes.filter(o => o.success && o.created_at > Date.now() - 86400000 * 30);
    if (recentSuccessful.length > 0 && symptoms && symptoms.length > 0) {
      const matchingSymptoms = recentSuccessful.filter(o => {
        try {
          const oSymptoms = JSON.parse(o.symptoms || '[]');
          return symptoms.some(s =>
            oSymptoms.some(os => os.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(os.toLowerCase()))
          );
        } catch { return false; }
      });
      if (matchingSymptoms.length > 0) {
        const bestMatch = matchingSymptoms.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];
        findings.push({
          type: 'known_solution', source: 'repair_history', metric: 'similar_fix',
          value: bestMatch.fix_title,
          message: `Previously fixed: ${bestMatch.fix_title}`,
          severity: 'info', confidence: 0.7,
          fixUrl: bestMatch.fix_url,
        });
        evidenceCount.history++;
      }
    }

    const bothOutcomes = outcomes.filter(o => o.created_at > Date.now() - 86400000 * 90);
    const uniqueIssues = new Set(bothOutcomes.map(o => {
      try { return JSON.parse(o.symptoms || '[]').join(','); } catch { return ''; }
    }).filter(Boolean));
    if (uniqueIssues.size >= 3) {
      findings.push({
        type: 'recurring_issues', source: 'repair_history', metric: 'unique_problems',
        value: uniqueIssues.size, message: `${uniqueIssues.size} distinct issues reported for this device`,
        severity: 'info', confidence: Math.round(Math.min(0.6, 0.3 + uniqueIssues.size * 0.05) * 100) / 100
      });
      evidenceCount.history++;
    }
  }

  // 4. Symptom-based correlation with expanded pattern matching
  if (symptoms && symptoms.length > 0) {
    const symptomText = symptoms.join(' ').toLowerCase();

    const symptomPatterns = [
      { keywords: ['overheat', 'hot', 'thermal', 'fan noise', 'loud fan'], metric: 'overheating', messageBase: 'Overheating' },
      { keywords: ['battery', 'charge', 'charging', 'power', 'drain', 'die fast'], metric: 'power', messageBase: 'Power-related' },
      { keywords: ['slow', 'freeze', 'lag', 'hang', 'stutter', 'unresponsive'], metric: 'performance', messageBase: 'Performance' },
      { keywords: ['screen', 'display', 'flicker', 'black', 'dead pixel', 'cracked'], metric: 'display', messageBase: 'Display' },
      { keywords: ['sound', 'audio', 'speaker', 'noise', 'buzz', 'speaker'], metric: 'audio', messageBase: 'Audio' },
      { keywords: ['wifi', 'wi-fi', 'bluetooth', 'network', 'connect', 'signal'], metric: 'connectivity', messageBase: 'Connectivity' },
      { keywords: ['keyboard', 'key', 'type', 'button', 'stuck'], metric: 'input', messageBase: 'Input' },
      { keywords: ['water', 'liquid', 'spill', 'wet', 'damp'], metric: 'liquid_damage', messageBase: 'Liquid damage' },
      { keywords: ['boot', 'start', 'turn on', 'won\'t turn', 'no power', 'dead'], metric: 'power_on', messageBase: 'Power-on' },
      { keywords: ['blue screen', 'bsod', 'crash', 'restart', 'reboot'], metric: 'stability', messageBase: 'System stability' },
      { keywords: ['noise', 'rattl', 'click', 'vibrat'], metric: 'mechanical', messageBase: 'Mechanical' },
      { keywords: ['virus', 'malware', 'popup', 'adware', 'ransomware'], metric: 'security', messageBase: 'Security' },
      { keywords: ['update', 'upgrade', 'install', 'version'], metric: 'software', messageBase: 'Software' },
    ];

    for (const pattern of symptomPatterns) {
      if (pattern.keywords.some(kw => symptomText.includes(kw))) {
        const telemetryMatch = findings.some(f => {
          if (pattern.metric === 'overheating') return f.type === 'overheating' || f.type === 'thermal_throttling';
          if (pattern.metric === 'power') return f.type === 'battery_degradation' || f.type === 'battery_failure';
          if (pattern.metric === 'performance') return f.type === 'disk_failure_risk' || f.type === 'disk_space_critical';
          if (pattern.metric === 'stability') return f.type === 'system_instability';
          return false;
        });

        const historyMatch = findings.some(f => f.type === 'known_solution' || f.type === 'repeated_failure');

        let baseConfidence = 0.35;
        if (telemetryMatch) baseConfidence = bayesianUpdate(baseConfidence, 0.75);
        if (historyMatch) baseConfidence = bayesianUpdate(baseConfidence, 0.65);

        findings.push({
          type: 'symptom_match', source: 'symptom_analysis', metric: pattern.metric,
          value: symptomText,
          message: telemetryMatch
            ? `${pattern.messageBase} symptoms confirmed by telemetry`
            : historyMatch
              ? `${pattern.messageBase} symptoms match past repair history`
              : `${pattern.messageBase} symptoms reported`,
          severity: telemetryMatch ? 'warning' : 'info',
          confidence: Math.round(baseConfidence * 100) / 100,
          hasTelemetryEvidence: telemetryMatch,
          hasHistoryEvidence: historyMatch,
        });
        evidenceCount.symptoms++;
      }
    }
  }

  // 5. Cross-correlation: reinforce findings that point to same root cause
  const correlatedFindings = crossCorrelate(deduplicateFindings(findings));

  // 6. Calculate overall confidence using weighted combination
  const weightedConfidence = calculateOverallConfidence(correlatedFindings, evidenceCount);

  const criticalFindings = correlatedFindings.filter(f => f.severity === 'critical');
  const warnings = correlatedFindings.filter(f => f.severity === 'warning' || f.severity === 'medium');

  return {
    device, brand, model,
    correlationId: `corr_${Date.now()}`,
    timestamp: Date.now(),
    overallConfidence: weightedConfidence,
    evidenceCount,
    findings: correlatedFindings.sort((a, b) => {
      const sevOrder = { critical: 4, warning: 3, medium: 2, info: 1, ok: 0 };
      return (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0) || b.confidence - a.confidence;
    }),
    summary: generateSummary(weightedConfidence, criticalFindings.length, warnings.length, evidenceCount),
    recommendedActions: generateActions(correlatedFindings, evidenceCount),
  };
}

function crossCorrelate(findings) {
  const correlationGroups = {
    storage_failure: ['disk_failure_risk', 'disk_space_critical'],
    thermal_issue: ['overheating', 'thermal_throttling'],
    power_issue: ['battery_degradation', 'battery_failure', 'alert_correlation'],
    stability_issue: ['system_instability', 'alert_correlation'],
    user_reported: ['symptom_match'],
  };

  const groupMap = {};
  for (const [groupName, types] of Object.entries(correlationGroups)) {
    const groupFindings = findings.filter(f => types.includes(f.type));
    if (groupFindings.length >= 2) {
      groupMap[groupName] = groupFindings;
    }
  }

  const result = [...findings];

  for (const [, groupFindings] of Object.entries(groupMap)) {
    const avgConfidence = groupFindings.reduce((s, f) => s + f.confidence, 0) / groupFindings.length;
    const maxSeverity = groupFindings.reduce((best, f) =>
      SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[best] ? f.severity : best, 'info');
    const hasCritical = groupFindings.some(f => f.severity === 'critical');

    for (const f of groupFindings) {
      f.correlated = true;
      f.reinforcementCount = groupFindings.length;
      f.crossConfidence = Math.round(Math.min(0.98, avgConfidence + groupFindings.length * 0.05) * 100) / 100;
      if (!hasCritical && groupFindings.length >= 3 && f.severity === 'warning') {
        f.severity = 'critical';
        f.message += ' [escalated: multiple indicators]';
        f.escalated = true;
      }
    }
  }

  return result;
}

function calculateOverallConfidence(findings, evidenceCount) {
  if (findings.length === 0) return 0;

  const totalEvidence = evidenceCount.telemetry + evidenceCount.history + evidenceCount.symptoms + evidenceCount.alerts;
  if (totalEvidence === 0) return 0;

  const weights = { telemetry: 0.4, history: 0.15, alerts: 0.25, symptoms: 0.2 };
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (evidenceCount[key] > 0) {
      weightedSum += weight;
    }
    totalWeight += weight;
  }

  const evidenceScore = weightedSum / totalWeight;

  if (findings.length === 0) return Math.round(evidenceScore * 100) / 100;
  const avgConfidence = findings.reduce((s, f) => s + f.confidence, 0) / findings.length;
  const criticalRatio = findings.filter(f => f.severity === 'critical').length / findings.length;

  const combined = (evidenceScore * 0.4) + (avgConfidence * 0.4) + (criticalRatio * 0.2);

  return Math.round(Math.min(0.98, combined) * 100) / 100;
}

function generateSummary(confidence, criticalCount, warningCount, evidence) {
  let text = '';
  if (confidence > 0.7) text += `High confidence (${Math.round(confidence * 100)}%). `;
  else if (confidence > 0.4) text += `Moderate confidence (${Math.round(confidence * 100)}%). More data recommended. `;
  else text += `Limited data (${Math.round(confidence * 100)}%). `;

  if (criticalCount > 0) text += `${criticalCount} critical issue${criticalCount > 1 ? 's' : ''}. `;
  if (warningCount > 0) text += `${warningCount} warning${warningCount > 1 ? 's' : ''}. `;

  const parts = [];
  if (evidence.telemetry) parts.push(`${evidence.telemetry} telemetry`);
  if (evidence.history) parts.push(`${evidence.history} history records`);
  if (evidence.symptoms) parts.push(`${evidence.symptoms} symptom matches`);
  if (evidence.alerts) parts.push(`${evidence.alerts} alerts`);

  if (parts.length) text += `Based on ${parts.join(', ')}.`;
  return { text: text.trim(), confidence, criticalCount, warningCount };
}

function generateActions(findings, evidenceCount) {
  const actions = [];

  for (const f of findings) {
    const confidence = f.crossConfidence || f.confidence;

    if (f.type === 'disk_failure_risk') {
      if (f.severity === 'critical' || confidence > 0.75) {
        actions.push({ priority: 1, action: 'Back up all data immediately. Replace the drive.', category: 'critical' });
      } else {
        actions.push({ priority: 3, action: 'Back up critical data. Monitor SMART values.', category: 'preventive' });
      }
    }
    if (f.type === 'disk_space_critical') {
      actions.push({ priority: 2, action: 'Free up disk space. Remove temporary files and unused applications.', category: 'maintenance' });
    }
    if (f.type === 'overheating') {
      if (f.severity === 'critical') {
        actions.push({ priority: 1, action: 'Shut down device. Clean cooling system and replace thermal paste.', category: 'critical' });
      } else {
        actions.push({ priority: 2, action: 'Clean vents and fans. Ensure adequate airflow.', category: 'maintenance' });
      }
    }
    if (f.type === 'thermal_throttling') {
      actions.push({ priority: 2, action: 'Improve cooling. Check that all fans are operational.', category: 'maintenance' });
    }
    if (f.type === 'battery_failure') {
      actions.push({ priority: 1, action: 'Replace battery immediately due to safety risk (swelling/fire hazard).', category: 'critical' });
    }
    if (f.type === 'battery_degradation') {
      if (f.severity === 'critical') {
        actions.push({ priority: 1, action: 'Replace battery. Capacity critically low.', category: 'critical' });
      } else {
        actions.push({ priority: 3, action: 'Monitor battery health. Plan replacement within 3 months.', category: 'preventive' });
      }
    }
    if (f.type === 'system_instability') {
      if (f.severity === 'critical') {
        actions.push({ priority: 1, action: 'Check Windows Event Viewer for critical errors. Run SFC and DISM.', category: 'critical' });
      } else {
        actions.push({ priority: 3, action: 'Update all drivers. Run system file checker.', category: 'maintenance' });
      }
    }
    if (f.type === 'high_cpu_load') {
      actions.push({ priority: 4, action: 'Check task manager for resource-heavy processes.', category: 'diagnostic' });
    }
    if (f.type === 'uptime_warning') {
      actions.push({ priority: 5, action: 'Restart device to clear memory leaks and apply pending updates.', category: 'maintenance' });
    }
    if (f.type === 'repeated_failure') {
      actions.push({ priority: 2, action: 'Consider professional repair or device replacement. Multiple attempts failed.', category: 'recommendation' });
    }
    if (f.type === 'recurring_issues') {
      actions.push({ priority: 4, action: 'Comprehensive diagnostic recommended. Device has multiple distinct issues.', category: 'diagnostic' });
    }
    if (f.fixUrl) {
      actions.push({ priority: 1, action: `Apply known fix: ${f.fixUrl}`, category: 'fix' });
    }
  }

  const seen = new Set();
  const unique = actions.filter(a => {
    const key = a.action.slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort((a, b) => a.priority - b.priority);
}

module.exports = { correlate };
