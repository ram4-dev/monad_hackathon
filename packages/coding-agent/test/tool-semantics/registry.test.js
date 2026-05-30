const test = require('node:test');
const assert = require('node:assert/strict');

const manifest = require('./fixtures/w0-schema-hash-manifest.fixture.json');
const {
  WALLET_AGENT_REGISTRY,
  REGISTRY_VERSION,
  UNSUPPORTED_CAPABILITIES,
  getToolSemantics,
  getUnsupportedCapability,
} = require('../../src/tool-semantics');

const expectedMappedTools = [
  'add_custom_chain',
  'switch_chain',
  'get_wallet_info',
  'get_balance',
  'get_token_balance',
  'estimate_gas',
  'simulate_transaction',
  'send_transaction',
  'transfer_token',
  'approve_token',
  'sign_typed_data',
];

function manifestEntry(toolName) {
  return manifest.entries.find((entry) => entry.tool_name === toolName);
}

test('registry maps exactly the 11 W0-captured P0 tools with exact hashes', () => {
  assert.equal(REGISTRY_VERSION, 'wallet_agent.tool_semantics.v1');
  assert.deepEqual(Object.keys(WALLET_AGENT_REGISTRY).sort(), expectedMappedTools.slice().sort());

  for (const toolName of expectedMappedTools) {
    const entry = getToolSemantics(toolName);
    const source = manifestEntry(toolName);
    assert.ok(entry, `${toolName} registry entry exists`);
    assert.equal(entry.registry_version, REGISTRY_VERSION);
    assert.equal(entry.upstream, 'wallet_agent');
    assert.equal(entry.tool_name, toolName);
    assert.equal(entry.exposed_name, toolName);
    assert.equal(entry.input_schema_hash, source.input_schema_hash);
    assert.equal(entry.upstream_schema_hash, source.upstream_schema_hash);
    assert.ok(Array.isArray(entry.required_fields));
    assert.ok(Array.isArray(entry.required_evidence));
    assert.ok(Array.isArray(entry.policy_checks));
    assert.ok(entry.evidence_refs.some((ref) => ref.endsWith(source.fixture_path)));
  }
});

test('write-like tools default block and require downstream evidence before forwarding', () => {
  for (const toolName of ['send_transaction', 'transfer_token', 'approve_token', 'sign_typed_data']) {
    const entry = getToolSemantics(toolName);
    assert.equal(entry.default_decision, 'block');
    assert.equal(entry.requires_simulation, true);
    assert.ok(entry.required_evidence.some((name) => name.includes('simulation') || name.includes('typed-data')));
    assert.ok(entry.policy_checks.includes('policy_allow_required') || entry.policy_checks.includes('digest_required'));
  }
});

test('read and simulation tools keep no state-effect semantics and do not imply forwarding', () => {
  for (const toolName of ['get_wallet_info', 'get_balance', 'get_token_balance', 'estimate_gas', 'simulate_transaction']) {
    const entry = getToolSemantics(toolName);
    assert.equal(entry.state_effect, 'none');
    assert.match(entry.notes, /does not imply forwarding/i);
  }
});

test('chain management entries default block until allowlist evidence exists downstream', () => {
  for (const toolName of ['add_custom_chain', 'switch_chain']) {
    const entry = getToolSemantics(toolName);
    assert.equal(entry.tool_class, 'chain_management');
    assert.equal(entry.state_effect, 'local_chain_config');
    assert.equal(entry.default_decision, 'block');
    assert.ok(entry.policy_checks.includes('chain_allowlist'));
    assert.ok(entry.policy_checks.includes('monad_testnet_only'));
  }
});

test('dry_run_transaction is unsupported with W0-BLOCKER-009 and no fake hashes', () => {
  assert.equal(WALLET_AGENT_REGISTRY.dry_run_transaction, undefined);
  const unsupported = getUnsupportedCapability('dry_run_transaction');
  assert.equal(UNSUPPORTED_CAPABILITIES.dry_run_transaction, unsupported);
  assert.equal(unsupported.status, 'absent');
  assert.equal(unsupported.safe_reason_code, 'UNSUPPORTED_TOOL');
  assert.deepEqual(unsupported.blocker_ids, ['W0-BLOCKER-009']);
  assert.equal(unsupported.input_schema_hash, null);
  assert.equal(unsupported.upstream_schema_hash, null);
});
