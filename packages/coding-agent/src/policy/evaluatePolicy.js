'use strict';

const { assessRisk } = require('../risk');
const { policyDecision } = require('./policyDecision');

function firstBlock(risk) {
  return risk.blocking_findings && risk.blocking_findings[0];
}

async function evaluatePolicy({ resolution, policySnapshot, policySourceFailure, evidence = {}, auditWriter } = {}) {
  if (resolution && resolution.status !== 'visible') {
    return policyDecision({ decision: 'block', reason_code: resolution.safe_reason_code || 'UNMAPPED_TOOL', explanation: 'Blocked by W2 before policy.' });
  }
  if (policySourceFailure) {
    return policyDecision({ decision: 'block', reason_code: policySourceFailure.code || policySourceFailure.error_code || 'POLICY_RPC_READ_FAILED', explanation: 'Policy source failed closed.' });
  }
  if (!policySnapshot) {
    return policyDecision({ decision: 'block', reason_code: 'POLICY_RPC_READ_FAILED', explanation: 'Policy snapshot missing; fail closed.' });
  }
  const risk = assessRisk({ resolution, policySnapshot, evidence });
  const block = firstBlock(risk);
  if (block) return policyDecision({ decision: 'block', reason_code: block.code, policySnapshot, explanation: block.message });
  if (auditWriter) {
    try { await auditWriter({ action: 'policy_evaluated', result: 'success', policySnapshot, risk }); }
    catch { return policyDecision({ decision: 'block', reason_code: 'AUDIT_WRITE_FAILED', policySnapshot, explanation: 'Audit failed closed.' }); }
  }
  return policyDecision({ decision: 'allow', reason_code: 'POLICY_ALLOWED', policySnapshot, matched_policies: ['onchain-policy'], explanation: 'On-chain policy and risk checks allowed the request.' });
}

module.exports = { evaluatePolicy };
