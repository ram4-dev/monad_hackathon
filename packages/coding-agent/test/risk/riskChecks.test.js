const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('../policy-source/fixtures/policy-snapshot.valid.fixture.json');
const { resolveCallByName } = require('../../src/tool-semantics');
const { toolKey } = require('../../src/policy');
const { assessRisk } = require('../../src/risk');

function snapshot(toolName) {
  return { ...fixture, allowed_tool_keys: [toolKey(toolName)] };
}

test('policy-source failures produce critical blocking findings', () => {
  const risk = assessRisk({ policySourceFailure: { code: 'POLICY_RPC_READ_FAILED' } });
  assert.equal(risk.level, 'critical');
  assert.equal(risk.blocking_findings[0].code, 'POLICY_RPC_READ_FAILED');
});

test('same W2/policy/evidence inputs produce stable risk output', () => {
  const resolution = resolveCallByName('get_balance', 'sha256:2c2d95dea1a265e86547d4318ae22fcc8e89e5869281734ee94ada3c56eeb516');
  const input = { resolution, policySnapshot: snapshot('get_balance'), evidence: { chain_id: 10143 } };
  assert.deepEqual(assessRisk(input), assessRisk(input));
});

test('wrong chain, missing evidence, and non-allowlisted entities block', () => {
  const resolution = resolveCallByName('transfer_token', 'sha256:948b940f8aa1919b8f8eaba7c6d599f0f2adccd00c1e2f37294211c1cdaf2f1c');
  const wrongChain = assessRisk({ resolution, policySnapshot: snapshot('transfer_token'), evidence: { chain_id: 1 } });
  assert.ok(wrongChain.blocking_findings.some((finding) => finding.code === 'POLICY_RPC_CHAIN_MISMATCH'));

  const missing = assessRisk({ resolution, policySnapshot: snapshot('transfer_token'), evidence: { chain_id: 10143 } });
  assert.ok(missing.blocking_findings.some((finding) => finding.code === 'MISSING_REQUIRED_EVIDENCE'));

  const requiredEvidenceOnly = assessRisk({
    resolution: {
      status: 'visible',
      semantics: {
        tool_name: 'transfer_token',
        tool_class: 'transaction_execute',
        required_fields: [],
        required_evidence: ['chain_evidence', 'simulation'],
        requires_simulation: false,
      },
    },
    policySnapshot: snapshot('transfer_token'),
    evidence: { chain_id: 10143 },
  });
  assert.ok(requiredEvidenceOnly.blocking_findings.some((finding) => finding.code === 'MISSING_REQUIRED_EVIDENCE'));

  const recipient = assessRisk({ resolution, policySnapshot: snapshot('transfer_token'), evidence: { chain_id: 10143, recipient: '0x9999999999999999999999999999999999999999', token: fixture.allowed_tokens[0], amount_atomic: '1', simulation: { status: 'success' } } });
  assert.ok(recipient.blocking_findings.some((finding) => finding.code === 'POLICY_RECIPIENT_NOT_ALLOWED'));
});

test('unlimited approval and failed simulation block deterministically', () => {
  const resolution = resolveCallByName('approve_token', 'sha256:aba90769c0a4711c874be0580f3eec942cf2db94cca2e41e520e3cdd3b4cc034');
  const unlimited = assessRisk({ resolution, policySnapshot: snapshot('approve_token'), evidence: { chain_id: 10143, token: fixture.allowed_tokens[0], spender: fixture.allowed_spenders[0].spender, amount_atomic: 'uint256.max', simulation: { status: 'success' } } });
  assert.ok(unlimited.blocking_findings.some((finding) => finding.code === 'POLICY_UNLIMITED_APPROVAL_BLOCKED'));

  const failedSimulation = assessRisk({ resolution, policySnapshot: snapshot('approve_token'), evidence: { chain_id: 10143, token: fixture.allowed_tokens[0], spender: fixture.allowed_spenders[0].spender, amount_atomic: '1', simulation: { status: 'failed' } } });
  assert.ok(failedSimulation.blocking_findings.some((finding) => finding.code === 'SIMULATION_FAILED'));
});
