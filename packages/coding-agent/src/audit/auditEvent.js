'use strict';

const crypto = require('node:crypto');
const { redactAuditMetadata } = require('./auditRedaction');

function eventId() { return `audit_${crypto.randomBytes(8).toString('hex')}`; }

function buildAuditEvent({ action, result, metadata = {}, source = 'system', policySnapshot, risk_level, policy_decision } = {}) {
  const merged = { ...metadata };
  if (policySnapshot) {
    merged.chain_id = policySnapshot.source.chain_id;
    merged.policy_contract_address = policySnapshot.source.contract_address;
    merged.policy_id = policySnapshot.policy_id;
    merged.policy_version = policySnapshot.policy_version;
    merged.content_hash = policySnapshot.content_hash;
  }
  return {
    event_id: eventId(),
    timestamp: new Date().toISOString(),
    source,
    action,
    risk_level,
    policy_decision,
    result,
    metadata: redactAuditMetadata(action, merged),
  };
}

module.exports = { buildAuditEvent };
