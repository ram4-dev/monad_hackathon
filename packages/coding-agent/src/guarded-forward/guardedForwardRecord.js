'use strict';

// Wave 4 — GuardedForwardRecord (constitution §8, extended with on-chain policy_source + llm_review).

const crypto = require('node:crypto');

function policySourceSnapshot(policySnapshot) {
  if (!policySnapshot || typeof policySnapshot !== 'object') return null;
  const source = policySnapshot.source || {};
  return {
    kind: 'onchain',
    policy_contract_address: source.contract_address || null,
    policy_chain_id: source.chain_id || null,
    policy_id: policySnapshot.policy_id || null,
    policy_version: policySnapshot.policy_version || null,
    content_hash: policySnapshot.content_hash || null,
    read_block_number: source.read_block_number || null,
  };
}

/**
 * @returns {object} sanitized GuardedForwardRecord
 */
function buildGuardedForwardRecord({
  toolName,
  toolClass,
  decision,
  reason_code,
  digest,
  covered_fields,
  digest_version,
  idempotency_key,
  policySnapshot,
  llmReview,
  auditEventId,
  now,
} = {}) {
  const clock = typeof now === 'function' ? now : () => Date.now();
  return {
    forward_id: `fwd_${crypto.randomBytes(8).toString('hex')}`,
    audit_event_id: auditEventId || null,
    tool_name: toolName || null,
    tool_class: toolClass || null,
    chain_id: 10143,
    decision: decision || null,
    reason_code: reason_code || null,
    digest_version: digest_version || null,
    candidate_tx_digest: digest || null,
    covered_fields: covered_fields || [],
    idempotency_key: idempotency_key || null,
    policy_source: policySourceSnapshot(policySnapshot),
    llm_review: llmReview
      ? { ran: !!llmReview.ran, verdict: llmReview.verdict || null, reason_redacted: llmReview.reason_redacted || '' }
      : null,
    created_at: new Date(clock()).toISOString(),
  };
}

module.exports = { buildGuardedForwardRecord, policySourceSnapshot };
