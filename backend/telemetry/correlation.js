'use strict';

function correlate(device, brand, model, symptoms, telemetry, outcomes, alerts) {
  const findings = [];
  let overallConfidence = 0;
  const evidenceCount = { telemetry: 0, history: 0, symptoms: 0, alerts: 0 };

  // Correlate active alerts with symptoms
  if (alerts && alerts.length > 0 && symptoms && symptoms.length > 0) {
    const relevantAlerts = alerts.filter(a => !a.acknowledged);
    for (const alert of relevantAlerts) {
      const symptomMatch = symptoms.some(s =>
        s.toLowerCase().includes(alert.metric.toLowerCase()) ||
        alert.message.toLowerCase().includes(s.toLowerCase())
      );
      if (symptomMatch || alert.severity === 'critical') {
        findings.push({
          type: 'alert_correlation',
          source: 'telemetry_alert',
          metric: alert.metric,
          value: alert.value,
          message: alert.message,
          severity: alert.severity,
          confidence: alert.severity === 'critical' ? 0.85 : 0.6,
        });
        evidenceCount.alerts++;
      }
    }
  }

  // Check telemetry for anomalies
  if (telemetry) {
    for (const [dataType, report] of Object.entries(telemetry)) {
      if (!report || !report.data) continue;
      const data = report.data;

      if (dataType === 'smart') {
        if (data.remaining_life_percent < 20) {
          findings.push({ type: 'disk_failure_risk', source: 'smart', metric: 'remaining_life', value: data.remaining_life_percent, message: 'Drive nearing end of life', severity: 'critical', confidence: 0.9 });
          evidenceCount.telemetry++;
        }
        if ((data.reallocated_sectors || 0) > 5) {
          findings.push({ type: 'disk_failure_risk', source: 'smart', metric: 'reallocated_sectors', value: data.reallocated_sectors, message: 'Drive developing bad sectors', severity: 'warning', confidence: 0.75 });
          evidenceCount.telemetry++;
        }
      }

      if (dataType === 'battery') {
        if ((data.wear_level || 0) > 30) {
          findings.push({ type: 'battery_degradation', source: 'battery_telemetry', metric: 'wear_level', value: data.wear_level, message: 'Battery significantly degraded', severity: 'warning', confidence: 0.8 });
          evidenceCount.telemetry++;
        }
        if ((data.health_percent || 100) < 50) {
          findings.push({ type: 'battery_failure', source: 'battery_telemetry', metric: 'health', value: data.health_percent, message: 'Battery health critically low', severity: 'critical', confidence: 0.9 });
          evidenceCount.telemetry++;
        }
      }

      if (dataType === 'cpu') {
        if ((data.max_temperature || 0) > 90) {
          findings.push({ type: 'overheating', source: 'cpu_telemetry', metric: 'max_temperature', value: data.max_temperature, message: 'CPU reaching dangerous temperatures', severity: 'critical', confidence: 0.85 });
          evidenceCount.telemetry++;
        }
        if ((data.throttling_percent || 0) > 5) {
          findings.push({ type: 'thermal_throttling', source: 'cpu_telemetry', metric: 'throttling', value: data.throttling_percent, message: 'CPU throttling due to heat', severity: 'warning', confidence: 0.7 });
          evidenceCount.telemetry++;
        }
      }

      if (dataType === 'system') {
        if ((data.bsod_count_30days || 0) > 3) {
          findings.push({ type: 'system_instability', source: 'system_telemetry', metric: 'bsod_count', value: data.bsod_count_30days, message: 'Multiple blue screens in last 30 days', severity: 'warning', confidence: 0.65 });
          evidenceCount.telemetry++;
        }
      }
    }
  }

  // Correlate with repair history
  if (outcomes && outcomes.length > 0) {
    const failedFixes = outcomes.filter(o => !o.success);
    if (failedFixes.length > 2) {
      findings.push({
        type: 'repeated_failure',
        source: 'repair_history',
        metric: 'failed_attempts',
        value: failedFixes.length,
        message: `${failedFixes.length} previous repair attempts were unsuccessful`,
        severity: 'medium',
        confidence: 0.6,
      });
      evidenceCount.history++;
    }

    const recentSuccessful = outcomes.filter(o => o.success && o.created_at > Date.now() - 86400000 * 30);
    if (recentSuccessful.length > 0 && symptoms && symptoms.length > 0) {
      const matchingSymptoms = recentSuccessful.filter(o => {
        try {
          const oSymptoms = JSON.parse(o.symptoms || '[]');
          return symptoms.some(s => oSymptoms.some(os => os.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(os.toLowerCase())));
        } catch { return false; }
      });
      if (matchingSymptoms.length > 0) {
        findings.push({
          type: 'known_solution',
          source: 'repair_history',
          metric: 'similar_fix',
          value: matchingSymptoms[0].fix_title,
          message: `Similar issue was fixed before: ${matchingSymptoms[0].fix_title}`,
          severity: 'info',
          confidence: 0.7,
          fixUrl: matchingSymptoms[0].fix_url,
        });
        evidenceCount.history++;
      }
    }
  }

  // Symptom-based correlation
  if (symptoms && symptoms.length > 0) {
    const symptomText = symptoms.join(' ').toLowerCase();
    if (symptomText.includes('overheat') || symptomText.includes('hot') || symptomText.includes('thermal')) {
      const hasTelemetryEvidence = findings.some(f => f.type === 'overheating' || f.type === 'thermal_throttling');
      findings.push({
        type: 'symptom_match',
        source: 'symptom_analysis',
        metric: 'overheating',
        value: symptomText,
        message: hasTelemetryEvidence ? 'Overheating symptoms confirmed by telemetry' : 'Overheating reported but no telemetry confirmation',
        severity: hasTelemetryEvidence ? 'warning' : 'info',
        confidence: hasTelemetryEvidence ? 0.9 : 0.4,
      });
      evidenceCount.symptoms++;
    }
    if (symptomText.includes('battery') || symptomText.includes('charge') || symptomText.includes('power')) {
      findings.push({ type: 'symptom_match', source: 'symptom_analysis', metric: 'power', value: symptomText, message: 'Power-related symptoms reported', severity: 'info', confidence: 0.5 });
      evidenceCount.symptoms++;
    }
    if (symptomText.includes('slow') || symptomText.includes('freeze') || symptomText.includes('lag')) {
      const hasDiskIssue = findings.some(f => f.type === 'disk_failure_risk');
      findings.push({ type: 'symptom_match', source: 'symptom_analysis', metric: 'performance', value: symptomText, message: hasDiskIssue ? 'Performance issues likely related to failing drive' : 'Performance issues reported', severity: 'info', confidence: hasDiskIssue ? 0.75 : 0.4 });
      evidenceCount.symptoms++;
    }
  }

  const totalEvidence = evidenceCount.telemetry + evidenceCount.history + evidenceCount.symptoms + evidenceCount.alerts;
  overallConfidence = totalEvidence > 0 ? Math.min(Math.round(totalEvidence * 0.15), 0.95) : 0;

  const criticalFindings = findings.filter(f => f.severity === 'critical');
  const warnings = findings.filter(f => f.severity === 'warning' || f.severity === 'medium');

  return {
    device, brand, model,
    correlationId: `corr_${Date.now()}`,
    timestamp: Date.now(),
    overallConfidence,
    evidenceCount,
    findings: findings.sort((a, b) => {
      const sev = { critical: 3, warning: 2, medium: 1, info: 0 };
      return (sev[b.severity] || 0) - (sev[a.severity] || 0);
    }),
    summary: _generateSummary(overallConfidence, criticalFindings.length, warnings.length, evidenceCount),
    recommendedActions: _generateActions(findings),
  };
}

function _generateSummary(confidence, criticalCount, warningCount, evidence) {
  let text = `Telemetry correlation complete. `;
  if (confidence > 0.7) text += `High confidence diagnosis (${Math.round(confidence * 100)}%). `;
  else if (confidence > 0.4) text += `Moderate confidence (${Math.round(confidence * 100)}%). More data needed. `;
  else text += `Limited data available (${Math.round(confidence * 100)}%). `;

  if (criticalCount > 0) text += `${criticalCount} critical issue(s) detected. `;
  if (warningCount > 0) text += `${warningCount} warning(s). `;
  text += `Based on ${evidence.telemetry} telemetry metrics, ${evidence.history} history records, ${evidence.symptoms} symptom matches, ${evidence.alerts} active alerts.`;

  return { text, confidence, criticalCount, warningCount };
}

function _generateActions(findings) {
  const actions = [];
  for (const f of findings) {
    if (f.severity === 'critical') {
      if (f.type === 'disk_failure_risk') actions.push('Back up data immediately. Consider replacing the drive.');
      if (f.type === 'overheating') actions.push('Clean cooling system and replace thermal paste.');
      if (f.type === 'battery_failure') actions.push('Replace battery immediately due to safety risk.');
      if (f.type === 'alert_correlation' && f.metric === 'remaining_life') actions.push('Replace SSD. Data loss imminent.');
    }
    if (f.severity === 'warning') {
      if (f.type === 'battery_degradation') actions.push('Monitor battery health. Plan replacement.');
      if (f.type === 'thermal_throttling') actions.push('Improve cooling. Check fan operation.');
      if (f.type === 'system_instability') actions.push('Check Event Viewer. Run SFC scan. Update drivers.');
      if (f.type === 'disk_failure_risk') actions.push('Monitor SMART values. Backup critical data.');
    }
    if (f.fixUrl) {
      actions.push(`Try known fix: ${f.fixUrl}`);
    }
  }
  return [...new Set(actions)];
}

module.exports = { correlate };
