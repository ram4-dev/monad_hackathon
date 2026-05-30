'use strict';

function policyDecision({ decision, reason_code, policySnapshot, explanation, matched_policies = [] }) {
  return {
    decision,
    reason_code,
    matched_policies,
    policy_id: policySnapshot ? policySnapshot.policy_id : undefined,
    policy_version: policySnapshot ? policySnapshot.policy_version : undefined,
    content_hash: policySnapshot ? policySnapshot.content_hash : undefined,
    policy_source: policySnapshot ? {
      chain_id: policySnapshot.source.chain_id,
      contract_address: policySnapshot.source.contract_address,
      schema_id: policySnapshot.source.schema_id,
    } : undefined,
    explanation: explanation || reason_code,
  };
}

module.exports = { policyDecision };
