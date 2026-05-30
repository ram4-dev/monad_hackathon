'use strict';

const LEVEL_SCORE = Object.freeze({ low: 10, medium: 35, high: 70, critical: 100 });

function riskReason(code, level, category, message, evidence = {}) {
  return { code, level, category, message, evidence };
}

function summarizeRisk(reasons) {
  const blocking_findings = reasons
    .filter((reason) => reason.level === 'high' || reason.level === 'critical')
    .sort((a, b) => (LEVEL_SCORE[b.level] || 0) - (LEVEL_SCORE[a.level] || 0));
  const score = reasons.reduce((max, reason) => Math.max(max, LEVEL_SCORE[reason.level] || 0), 0);
  const level = score >= 100 ? 'critical' : score >= 70 ? 'high' : score >= 35 ? 'medium' : 'low';
  return { score, level, reasons, blocking_findings };
}

module.exports = { riskReason, summarizeRisk };
