const test = require('node:test');
const assert = require('node:assert/strict');

const { createPolicySourceConfig, POLICY_SOURCE_ERROR_CODES, DEFAULT_SCHEMA_ID } = require('../../src/policy-source');

test('explicit valid policy source config binds Monad Testnet address without hardcoded RPC default', () => {
  const result = createPolicySourceConfig({
    chain_id: 10143,
    rpc_url: 'https://safe.example/rpc',
    policy_contract_address: '0x1111111111111111111111111111111111111111',
  });

  assert.equal(result.ok, true);
  assert.equal(result.config.chain_id, 10143);
  assert.equal(result.config.cache_ttl_ms, 0);
  assert.equal(result.config.rpc_fallback_urls.length, 0);
});

test('missing and malformed binding fails closed with safe code', () => {
  const missing = createPolicySourceConfig({ chain_id: 10143 });
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, POLICY_SOURCE_ERROR_CODES.POLICY_SOURCE_BINDING_INVALID);

  const wrongChain = createPolicySourceConfig({
    chain_id: 1,
    rpc_url: 'https://safe.example/rpc',
    policy_contract_address: '0x1111111111111111111111111111111111111111',
  });
  assert.equal(wrongChain.ok, false);
  assert.equal(wrongChain.error.code, POLICY_SOURCE_ERROR_CODES.POLICY_SOURCE_BINDING_INVALID);

  const badAddress = createPolicySourceConfig({
    chain_id: 10143,
    rpc_url: 'https://safe.example/rpc',
    policy_contract_address: 'not-an-address',
  });
  assert.equal(badAddress.ok, false);
  assert.equal(badAddress.error.code, POLICY_SOURCE_ERROR_CODES.POLICY_SOURCE_BINDING_INVALID);
});

test('default schema id matches Solidity EXPECTED_SCHEMA_ID', () => {
  assert.equal(DEFAULT_SCHEMA_ID, '0xbff749158587599401933b69539ef72bfaebb403678a1d1db445a6e9a3bac599');
});

test('environment source order redacts configured RPC values from errors', () => {
  const result = createPolicySourceConfig({}, {
    env: {
      COMPASS_POLICY_CONTRACT_ADDRESS: '0x1111111111111111111111111111111111111111',
      COMPASS_POLICY_RPC_URL: 'https://api-key.example/rpc?token=secret',
      COMPASS_POLICY_RPC_FALLBACK_URLS: 'https://fallback.example/rpc',
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.config.rpc_url, 'https://api-key.example/rpc?token=secret');

  const bad = createPolicySourceConfig({}, { env: { COMPASS_POLICY_RPC_URL: 'https://secret.example/rpc' } });
  assert.equal(bad.ok, false);
  assert.match(JSON.stringify(bad.error), /redacted|POLICY_SOURCE_BINDING_INVALID/);
  assert.doesNotMatch(JSON.stringify(bad.error), /secret\.example/);
});
