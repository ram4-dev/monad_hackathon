'use strict';

const { SAFE_REASON_CODES } = require('./types');

const W0_BASE = 'openspec/changes/wave-0-upstream-monad-poc/evidence/upstream';

const UNSUPPORTED_CAPABILITIES = Object.freeze({
  dry_run_transaction: Object.freeze({
    upstream: 'wallet_agent',
    tool_name: 'dry_run_transaction',
    status: 'absent',
    blocker_ids: ['W0-BLOCKER-009'],
    input_schema_hash: null,
    upstream_schema_hash: null,
    evidence_refs: [
      `${W0_BASE}/schema-hash-manifest.json`,
      `${W0_BASE}/registry-readiness.md`,
      `${W0_BASE}/tools/dry_run_transaction.schema.json`,
    ],
    safe_reason_code: SAFE_REASON_CODES.UNSUPPORTED_TOOL,
  }),
});

function getUnsupportedCapability(toolName) {
  return UNSUPPORTED_CAPABILITIES[toolName];
}

module.exports = {
  UNSUPPORTED_CAPABILITIES,
  getUnsupportedCapability,
};
