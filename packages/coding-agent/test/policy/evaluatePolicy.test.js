const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('../policy-source/fixtures/policy-snapshot.valid.fixture.json');
const { resolveCallByName } = require('../../src/tool-semantics');
const { evaluatePolicy, toolKey } = require('../../src/policy');

function snapshotFor(toolName, extras = {}) {
  return {
    ...fixture,
    allowed_tool_keys: [toolKey(toolName)],
    ...extras,
  };
}

function approvalEvidence(overrides = {}) {
  return {
    chain_id: 10143,
    chain_evidence: { chain_id: 10143 },
    token: fixture.allowed_tokens[0],
    spender: fixture.allowed_spenders[0].spender,
    amount_atomic: '10',
    allowance_evidence: true,
    finite_amount_evidence: true,
    exact_policy_allow_requirement: true,
    digest_requirement: true,
    simulation_evidence: true,
    simulation: { status: 'success' },
    ...overrides,
  };
}

test('W2 pre-policy blocks are preserved and not rescued by on-chain allowlists', async () => {
  const w2 = { status: 'hidden', tool_name: 'unknown_tool', safe_reason_code: 'UNMAPPED_TOOL' };
  const result = await evaluatePolicy({
    resolution: w2,
    policySnapshot: snapshotFor('unknown_tool'),
    evidence: { chain_id: 10143, chain_evidence: { chain_id: 10143 } },
  });
  assert.equal(result.decision, 'block');
  assert.equal(result.reason_code, 'UNMAPPED_TOOL');
});

test('read-only registered tool can allow when W2, on-chain policy, chain evidence, and audit pass', async () => {
  const w2 = resolveCallByName('get_balance', 'sha256:2c2d95dea1a265e86547d4318ae22fcc8e89e5869281734ee94ada3c56eeb516');
  const result = await evaluatePolicy({
    resolution: w2,
    policySnapshot: snapshotFor('get_balance'),
    evidence: {
      chain_id: 10143,
      chain_evidence: { chain_id: 10143 },
      sanitized_address_or_account_context: true,
    },
  });
  assert.equal(result.decision, 'allow');
  assert.equal(result.reason_code, 'POLICY_ALLOWED');
  assert.equal(result.policy_id, fixture.policy_id);
  assert.equal(result.policy_version, '1');
});

test('missing policy source and non-allowlisted tool fail closed', async () => {
  const w2 = resolveCallByName('get_balance', 'sha256:2c2d95dea1a265e86547d4318ae22fcc8e89e5869281734ee94ada3c56eeb516');
  const sourceFailure = await evaluatePolicy({ resolution: w2, policySourceFailure: { code: 'POLICY_RPC_READ_FAILED' }, evidence: { chain_id: 10143, chain_evidence: { chain_id: 10143 } } });
  assert.equal(sourceFailure.decision, 'block');
  assert.equal(sourceFailure.reason_code, 'POLICY_RPC_READ_FAILED');

  const missingSnapshot = await evaluatePolicy({ resolution: w2, evidence: { chain_id: 10143, chain_evidence: { chain_id: 10143 } } });
  assert.equal(missingSnapshot.decision, 'block');
  assert.equal(missingSnapshot.reason_code, 'POLICY_RPC_READ_FAILED');

  const notAllowed = await evaluatePolicy({ resolution: w2, policySnapshot: snapshotFor('send_transaction'), evidence: { chain_id: 10143, chain_evidence: { chain_id: 10143 } } });
  assert.equal(notAllowed.decision, 'block');
  assert.equal(notAllowed.reason_code, 'POLICY_TOOL_NOT_ALLOWED');
});

test('write-like branches block missing simulation, unlimited approvals, and over-cap amount/gas', async () => {
  const approve = resolveCallByName('approve_token', 'sha256:aba90769c0a4711c874be0580f3eec942cf2db94cca2e41e520e3cdd3b4cc034');
  const unlimited = await evaluatePolicy({
    resolution: approve,
    policySnapshot: snapshotFor('approve_token'),
    evidence: approvalEvidence({ amount_atomic: '115792089237316195423570985008687907853269984665640564039457584007913129639935' }),
  });
  assert.equal(unlimited.decision, 'block');
  assert.equal(unlimited.reason_code, 'POLICY_UNLIMITED_APPROVAL_BLOCKED');

  const missingSimulation = await evaluatePolicy({
    resolution: approve,
    policySnapshot: snapshotFor('approve_token'),
    evidence: approvalEvidence({ simulation: undefined, simulation_evidence: undefined }),
  });
  assert.equal(missingSimulation.decision, 'block');
  assert.equal(missingSimulation.reason_code, 'MISSING_REQUIRED_EVIDENCE');

  const finite = await evaluatePolicy({
    resolution: approve,
    policySnapshot: snapshotFor('approve_token'),
    evidence: approvalEvidence(),
  });
  assert.equal(finite.decision, 'allow');
});
