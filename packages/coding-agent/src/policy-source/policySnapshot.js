'use strict';

const { POLICY_SOURCE_ERROR_CODES, policySourceError } = require('./policySourceErrors');
const { ADDRESS_RE, MONAD_TESTNET_CHAIN_ID } = require('./policySourceConfig');

const HASH_RE = /^0x[a-fA-F0-9]{64}$/;
const LIMITS = Object.freeze({ tools: 64, recipients: 256, tokens: 128, spenders: 256, typedDataRules: 64 });

function lowerAddress(address) {
  return typeof address === 'string' && ADDRESS_RE.test(address) ? address.toLowerCase() : null;
}

function lowerHash(hash) {
  return typeof hash === 'string' && HASH_RE.test(hash) ? hash.toLowerCase() : null;
}

function decimalString(value) {
  if (typeof value === 'bigint') return value.toString(10);
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return String(value);
  if (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)) return value;
  return null;
}

function unique(values) {
  return new Set(values).size === values.length;
}

function fail(code, reason) {
  return { ok: false, error: policySourceError(code, { reason }) };
}

function normalizePolicySnapshot(input, options = {}) {
  try {
    const source = input.source || {};
    const snapshot = {
      source: {
        chain_id: Number(source.chain_id),
        network_name: source.network_name || 'Monad Testnet',
        contract_address: lowerAddress(source.contract_address),
        schema_id: lowerHash(source.schema_id || input.schema_id || options.expected_schema_id),
        deployment_chain_id: Number(source.deployment_chain_id),
        owner_address: lowerAddress(source.owner_address),
        read_status: source.read_status || 'success',
        read_block_number: decimalString(source.read_block_number || '0'),
        last_updated_block: decimalString(source.last_updated_block || '0'),
      },
      policy_id: lowerHash(input.policy_id),
      policy_version: decimalString(input.policy_version),
      content_hash: lowerHash(input.content_hash),
      flags: {
        block_unlimited_token_approvals: Boolean(input.flags && input.flags.block_unlimited_token_approvals),
        allow_unknown_tools: Boolean(input.flags && input.flags.allow_unknown_tools),
        require_simulation_for_writes: Boolean(input.flags && input.flags.require_simulation_for_writes),
        frozen: Boolean(input.flags && input.flags.frozen),
      },
      caps: {
        max_native_transfer_wei: decimalString(input.caps && input.caps.max_native_transfer_wei),
        max_erc20_transfer_atomic: decimalString(input.caps && input.caps.max_erc20_transfer_atomic),
        max_gas_cost_wei: decimalString(input.caps && input.caps.max_gas_cost_wei),
        max_fee_per_gas_wei: decimalString(input.caps && input.caps.max_fee_per_gas_wei),
      },
      allowed_tool_keys: (input.allowed_tool_keys || []).map(lowerHash),
      allowed_recipients: (input.allowed_recipients || []).map(lowerAddress),
      allowed_tokens: (input.allowed_tokens || []).map(lowerAddress),
      allowed_spenders: (input.allowed_spenders || []).map((entry) => ({
        token: lowerAddress(entry.token),
        spender: lowerAddress(entry.spender),
        max_amount_atomic: decimalString(entry.max_amount_atomic),
        enabled: Boolean(entry.enabled),
      })),
      typed_data_rules: (input.typed_data_rules || []).map((entry) => ({
        domain_separator_hash: lowerHash(entry.domain_separator_hash),
        verifying_contract: lowerAddress(entry.verifying_contract),
        primary_type_hash: lowerHash(entry.primary_type_hash),
        enabled: Boolean(entry.enabled),
      })),
    };
    return validatePolicySnapshot(snapshot, options);
  } catch {
    return fail(POLICY_SOURCE_ERROR_CODES.POLICY_SCHEMA_INVALID, 'normalization_exception');
  }
}

function validatePolicySnapshot(snapshot, options = {}) {
  if (snapshot.source.chain_id !== MONAD_TESTNET_CHAIN_ID || snapshot.source.deployment_chain_id !== MONAD_TESTNET_CHAIN_ID) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_RPC_CHAIN_MISMATCH, 'wrong_chain');
  if (!snapshot.source.contract_address || !snapshot.source.owner_address || !snapshot.source.schema_id || !snapshot.policy_id || !snapshot.content_hash) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_SCHEMA_INVALID, 'missing_identity');
  if (options.expected_schema_id && snapshot.source.schema_id !== options.expected_schema_id.toLowerCase()) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_SCHEMA_INVALID, 'schema_mismatch');
  const version = BigInt(snapshot.policy_version || 0);
  if (version < BigInt(options.min_policy_version || 1) || (options.max_policy_version && version > BigInt(options.max_policy_version))) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_VERSION_UNSUPPORTED, 'version');
  if (snapshot.flags.frozen) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_FROZEN, 'frozen');
  if (!snapshot.flags.block_unlimited_token_approvals || snapshot.flags.allow_unknown_tools || !snapshot.flags.require_simulation_for_writes) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_SCHEMA_INVALID, 'unsafe_flags');
  for (const [key, value] of Object.entries(snapshot.caps)) if (value == null) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_SCHEMA_INVALID, `bad_cap_${key}`);
  if (snapshot.allowed_tool_keys.length > LIMITS.tools || snapshot.allowed_recipients.length > LIMITS.recipients || snapshot.allowed_tokens.length > LIMITS.tokens || snapshot.allowed_spenders.length > LIMITS.spenders || snapshot.typed_data_rules.length > LIMITS.typedDataRules) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_SCHEMA_INVALID, 'over_bound');
  if ([...snapshot.allowed_tool_keys, ...snapshot.allowed_recipients, ...snapshot.allowed_tokens].some((v) => !v)) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_SCHEMA_INVALID, 'invalid_list_entry');
  if (!unique(snapshot.allowed_tool_keys) || !unique(snapshot.allowed_recipients) || !unique(snapshot.allowed_tokens)) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_SCHEMA_INVALID, 'duplicates');
  const spenderKeys = snapshot.allowed_spenders.map((entry) => `${entry.token}:${entry.spender}`);
  if (!unique(spenderKeys) || snapshot.allowed_spenders.some((entry) => !entry.token || !entry.spender || entry.max_amount_atomic == null)) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_SCHEMA_INVALID, 'bad_spender');
  return { ok: true, snapshot };
}

module.exports = {
  LIMITS,
  normalizePolicySnapshot,
  validatePolicySnapshot,
  lowerAddress,
  lowerHash,
  decimalString,
};
