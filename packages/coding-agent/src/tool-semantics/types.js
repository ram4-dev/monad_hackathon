'use strict';

const REGISTRY_VERSION = 'wallet_agent.tool_semantics.v1';

const SAFE_REASON_CODES = Object.freeze({
  UNMAPPED_TOOL: 'UNMAPPED_TOOL',
  UNSUPPORTED_TOOL: 'UNSUPPORTED_TOOL',
  PRIVATE_KEY_MANAGEMENT_BLOCKED: 'PRIVATE_KEY_MANAGEMENT_BLOCKED',
  DANGEROUS_TOOL_BLOCKED: 'DANGEROUS_TOOL_BLOCKED',
  SCHEMA_DRIFT: 'SCHEMA_DRIFT',
});

const TOOL_CLASSES = Object.freeze({
  CHAIN_MANAGEMENT: 'chain_management',
  READ_ONLY: 'read_only',
  SIMULATION: 'simulation',
  TRANSACTION_EXECUTE: 'transaction_execute',
  TOKEN_APPROVAL: 'token_approval',
  SIGNATURE: 'signature',
});

const STATE_EFFECTS = Object.freeze({
  NONE: 'none',
  LOCAL_CHAIN_CONFIG: 'local_chain_config',
  CHAIN_STATE: 'chain_state',
  SIGNATURE: 'signature',
  KEY_MATERIAL: 'key_material',
});

module.exports = {
  REGISTRY_VERSION,
  SAFE_REASON_CODES,
  TOOL_CLASSES,
  STATE_EFFECTS,
};
