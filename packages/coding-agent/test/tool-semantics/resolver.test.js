const test = require('node:test');
const assert = require('node:assert/strict');

const w0Fixture = require('./fixtures/wallet-agent-tools-list.w0.fixture.json');
const driftedFixture = require('./fixtures/drifted-tools.fixture.json');
const blockedFixture = require('./fixtures/blocked-tools.fixture.json');
const {
  resolveToolDescriptor,
  resolveCallByName,
  filterVisibleTools,
} = require('../../src/tool-semantics');

function fixture(toolName) {
  return w0Fixture.tools.find((entry) => entry.name === toolName);
}

test('known W0 captured tools resolve visible only when schema-compatible', () => {
  for (const descriptor of w0Fixture.tools) {
    const result = resolveToolDescriptor(descriptor);
    assert.equal(result.status, 'visible', descriptor.name);
    assert.equal(result.tool_name, descriptor.name);
    assert.equal(result.matched_input_schema_hash, descriptor.input_schema_hash);
    assert.equal(result.semantics.tool_name, descriptor.name);
  }
});

test('schema drift and missing hashes disable captured tools before policy', () => {
  const drifted = resolveToolDescriptor(driftedFixture.tools[0]);
  assert.equal(drifted.status, 'disabled');
  assert.equal(drifted.safe_reason_code, 'SCHEMA_DRIFT');

  const missing = resolveToolDescriptor(driftedFixture.tools[1]);
  assert.equal(missing.status, 'disabled');
  assert.equal(missing.safe_reason_code, 'SCHEMA_DRIFT');
});

test('private-key and keystore tools are blocked before policy', () => {
  for (const descriptor of blockedFixture.tools.slice(0, 5)) {
    const result = resolveToolDescriptor(descriptor);
    assert.equal(result.status, 'blocked', descriptor.name);
    assert.equal(result.safe_reason_code, 'PRIVATE_KEY_MANAGEMENT_BLOCKED');
  }
});

test('dangerous and unmapped tools return safe block reason codes', () => {
  assert.equal(resolveToolDescriptor({ name: 'write_contract' }).safe_reason_code, 'DANGEROUS_TOOL_BLOCKED');
  assert.equal(resolveToolDescriptor({ name: 'unknown_read_helper' }).safe_reason_code, 'UNMAPPED_TOOL');
});

test('dry_run_transaction resolves unsupported before policy with blocker metadata', () => {
  const result = resolveCallByName('dry_run_transaction');
  assert.equal(result.status, 'unsupported');
  assert.equal(result.safe_reason_code, 'UNSUPPORTED_TOOL');
  assert.deepEqual(result.blocker_ids, ['W0-BLOCKER-009']);
});

test('filterVisibleTools returns only registered schema-compatible tools', () => {
  const all = [
    fixture('get_balance'),
    driftedFixture.tools[0],
    ...blockedFixture.tools,
    fixture('send_transaction'),
  ];
  const visible = filterVisibleTools(all);
  assert.deepEqual(visible.map((result) => result.tool_name).sort(), ['get_balance', 'send_transaction']);
  assert.ok(visible.every((result) => result.status === 'visible'));
});
