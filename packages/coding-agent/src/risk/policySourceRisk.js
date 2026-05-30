'use strict';

const { riskReason, summarizeRisk } = require('./riskTypes');

function assessPolicySourceRisk(policySourceFailure) {
  if (!policySourceFailure) return summarizeRisk([]);
  const code = policySourceFailure.code || policySourceFailure.error_code || 'POLICY_RPC_READ_FAILED';
  return summarizeRisk([riskReason(code, 'critical', 'policy', 'Policy source failed closed.')]);
}

module.exports = { assessPolicySourceRisk };
