'use strict';

const fs = require('node:fs');
const { POLICY_SOURCE_ERROR_CODES, policySourceError } = require('./policySourceErrors');

const MONAD_TESTNET_CHAIN_ID = 10143;
const DEFAULT_SCHEMA_ID = '0xbff749158587599401933b69539ef72bfaebb403678a1d1db445a6e9a3bac599';
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function splitList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

function loadArtifact(path) {
  if (!path) return {};
  const parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
  return {
    policy_contract_address: parsed.contract && parsed.contract.address,
    chain_id: parsed.network && parsed.network.chain_id,
  };
}

function createPolicySourceConfig(input = {}, options = {}) {
  const env = options.env || process.env;
  let artifact = {};
  try {
    artifact = loadArtifact(input.deployment_artifact_path || env.COMPASS_POLICY_DEPLOYMENT_ARTIFACT);
  } catch {
    artifact = {};
  }

  const config = {
    chain_id: Number(input.chain_id || artifact.chain_id || MONAD_TESTNET_CHAIN_ID),
    network_name: input.network_name || 'Monad Testnet',
    rpc_url: input.rpc_url || env.COMPASS_POLICY_RPC_URL || env.MONAD_RPC_URL,
    rpc_fallback_urls: splitList(input.rpc_fallback_urls || env.COMPASS_POLICY_RPC_FALLBACK_URLS),
    policy_contract_address: input.policy_contract_address || artifact.policy_contract_address || env.COMPASS_POLICY_CONTRACT_ADDRESS,
    expected_schema_id: input.expected_schema_id || DEFAULT_SCHEMA_ID,
    min_policy_version: String(input.min_policy_version || '1'),
    max_policy_version: input.max_policy_version == null ? null : String(input.max_policy_version),
    read_timeout_ms: Number(input.read_timeout_ms || 3000),
    retry_count_per_rpc: Number(input.retry_count_per_rpc == null ? 1 : input.retry_count_per_rpc),
    retry_backoff_ms: Number(input.retry_backoff_ms || 250),
    cache_ttl_ms: Number(input.cache_ttl_ms || 0),
  };

  if (config.chain_id !== MONAD_TESTNET_CHAIN_ID || !ADDRESS_RE.test(config.policy_contract_address || '') || !config.rpc_url) {
    return {
      ok: false,
      error: policySourceError(POLICY_SOURCE_ERROR_CODES.POLICY_SOURCE_BINDING_INVALID, {
        chain_id: config.chain_id,
        has_rpc_url: Boolean(config.rpc_url),
        has_policy_contract_address: Boolean(config.policy_contract_address),
      }),
    };
  }
  return { ok: true, config };
}

module.exports = {
  MONAD_TESTNET_CHAIN_ID,
  DEFAULT_SCHEMA_ID,
  ADDRESS_RE,
  createPolicySourceConfig,
};
