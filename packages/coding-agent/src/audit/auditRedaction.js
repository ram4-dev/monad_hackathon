'use strict';

const { redactValue } = require('../safe-errors');

const PRESERVE_PUBLIC_HEX_FIELDS = new Set(['policy_id', 'schema_id', 'content_hash', 'tx_hash']);

const COMMON = new Set(['chain_id', 'tool_name', 'tool_class', 'policy_id', 'policy_version', 'reason_codes']);
const ACTION_ALLOWLISTS = Object.freeze({
  policy_source_read: ['chain_id', 'policy_contract_address', 'policy_id', 'policy_version', 'schema_id', 'content_hash', 'owner_address', 'read_status', 'read_block_number', 'last_updated_block', 'cache_status', 'reason_codes'],
  policy_source_read_failed: ['chain_id', 'policy_contract_address', 'failure_code', 'read_status', 'rpc_provider_index', 'cache_status', 'reason_codes'],
  policy_snapshot_validated: ['chain_id', 'policy_contract_address', 'policy_id', 'policy_version', 'schema_id', 'content_hash', 'last_updated_block'],
  risk_scored: ['chain_id', 'policy_id', 'policy_version', 'risk_level', 'reason_codes'],
  policy_evaluated: ['chain_id', 'policy_contract_address', 'policy_id', 'policy_version', 'policy_decision', 'reason_codes', 'content_hash'],
  tool_call_blocked: ['chain_id', 'policy_contract_address', 'policy_id', 'policy_version', 'failure_code', 'reason_codes'],
  policy_update_observed: ['chain_id', 'policy_contract_address', 'policy_id', 'policy_version', 'content_hash', 'owner_address', 'tx_hash', 'block_number'],
});

function redactAuditMetadata(action, metadata = {}) {
  const allowed = new Set([...(ACTION_ALLOWLISTS[action] || []), ...COMMON]);
  const output = {};
  for (const [key, value] of Object.entries(metadata || {})) {
    if (!allowed.has(key)) continue;
    if (PRESERVE_PUBLIC_HEX_FIELDS.has(key) && typeof value === 'string') {
      output[key] = value;
      continue;
    }
    output[key] = redactValue(value);
  }
  return output;
}

module.exports = { ACTION_ALLOWLISTS, redactAuditMetadata };
