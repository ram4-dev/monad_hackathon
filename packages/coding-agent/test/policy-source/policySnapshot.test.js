const test = require('node:test');
const assert = require('node:assert/strict');

const valid = require('./fixtures/policy-snapshot.valid.fixture.json');
const { normalizePolicySnapshot, validatePolicySnapshot, DEFAULT_SCHEMA_ID } = require('../../src/policy-source');

test('valid on-chain policy snapshot normalizes decimal strings and addresses', () => {
  const result = normalizePolicySnapshot(valid);
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.source.chain_id, 10143);
  assert.equal(result.snapshot.source.schema_id, DEFAULT_SCHEMA_ID);
  assert.equal(result.snapshot.policy_version, '1');
  assert.equal(result.snapshot.flags.block_unlimited_token_approvals, true);
  assert.equal(result.snapshot.allowed_recipients[0], valid.allowed_recipients[0].toLowerCase());
});

test('invalid flags, duplicates, and over-bound lists fail closed', () => {
  for (const patch of [
    { flags: { ...valid.flags, allow_unknown_tools: true } },
    { flags: { ...valid.flags, block_unlimited_token_approvals: false } },
    { flags: { ...valid.flags, require_simulation_for_writes: false } },
    { allowed_recipients: [valid.allowed_recipients[0], valid.allowed_recipients[0].toUpperCase()] },
    { allowed_tool_keys: Array.from({ length: 65 }, (_, i) => `0x${String(i).padStart(64, '0')}`) },
  ]) {
    const result = normalizePolicySnapshot({ ...valid, ...patch });
    assert.equal(result.ok, false, JSON.stringify(patch));
    assert.equal(result.error.code, 'POLICY_SCHEMA_INVALID');
  }
});

test('frozen policy returns POLICY_FROZEN', () => {
  const result = normalizePolicySnapshot({ ...valid, flags: { ...valid.flags, frozen: true } });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'POLICY_FROZEN');
});

test('unsupported versions fail closed', () => {
  const result = validatePolicySnapshot({ ...valid, policy_version: '0' }, { min_policy_version: '1' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'POLICY_VERSION_UNSUPPORTED');
});
