'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('../policy-source/fixtures/policy-snapshot.valid.fixture.json');
const semantics = require('../../src/tool-semantics');
const { toolKey: policyToolKey } = require('../../src/policy');
const { guardedForward } = require('../../src/guarded-forward');
const { IdempotencyStore } = require('../../src/idempotency');

const SAFE_LLM = { review: async () => ({ verdict: 'safe', reason: 'ok' }) };
const VETO_LLM = { review: async () => ({ verdict: 'unsafe', reason: 'blocked by reviewer' }) };
const DOWN_LLM = { review: async () => { throw new Error('llm down'); } };

function hashFor(toolName) {
  return semantics.getToolSemantics(toolName).input_schema_hash;
}

function snapshotFor(toolName, extras = {}) {
  return { ...fixture, allowed_tool_keys: [policyToolKey(toolName)], ...extras };
}

function spyForward() {
  const calls = [];
  const fn = async (toolName, args) => {
    calls.push({ toolName, args });
    return { upstream: 'ok' };
  };
  fn.calls = calls;
  return fn;
}

test('allowed read-only call forwards exactly once and records an allow decision', async () => {
  const forward = spyForward();
  const res = await guardedForward({
    call: { toolName: 'get_balance', inputSchemaHash: hashFor('get_balance'), args: { address: '0x9' } },
    evidence: { chain_id: 10143, chain_evidence: { chain_id: 10143 }, sanitized_address_or_account_context: true },
    policySource: { snapshot: snapshotFor('get_balance') },
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'allow');
  assert.equal(forward.calls.length, 1);
  assert.equal(res.result.upstream, 'ok');
  assert.equal(res.record.decision, 'allow');
  assert.equal(res.record.policy_source.policy_version, '1');
  assert.equal(res.record.llm_review.verdict, 'safe');
});

test('policy-source failure fails closed and never forwards', async () => {
  const forward = spyForward();
  const res = await guardedForward({
    call: { toolName: 'get_balance', inputSchemaHash: hashFor('get_balance'), args: {} },
    evidence: { chain_id: 10143, chain_evidence: { chain_id: 10143 } },
    policySource: { failure: { code: 'POLICY_RPC_READ_FAILED' } },
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'POLICY_RPC_READ_FAILED');
  assert.equal(forward.calls.length, 0);
});

test('missing policy source (no snapshot/failure/transport) fails closed', async () => {
  const forward = spyForward();
  const res = await guardedForward({
    call: { toolName: 'get_balance', inputSchemaHash: hashFor('get_balance'), args: {} },
    evidence: { chain_id: 10143, chain_evidence: { chain_id: 10143 } },
    policySource: {},
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'POLICY_CONTRACT_UNAVAILABLE');
  assert.equal(forward.calls.length, 0);
});

test('tool not allowlisted on-chain blocks before upstream', async () => {
  const forward = spyForward();
  const res = await guardedForward({
    call: { toolName: 'get_balance', inputSchemaHash: hashFor('get_balance'), args: {} },
    evidence: { chain_id: 10143, chain_evidence: { chain_id: 10143 }, sanitized_address_or_account_context: true },
    policySource: { snapshot: snapshotFor('send_transaction') }, // allowlists a different tool
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'POLICY_TOOL_NOT_ALLOWED');
  assert.equal(forward.calls.length, 0);
});

test('LLM veto blocks a deterministically-allowed call without forwarding', async () => {
  const forward = spyForward();
  const res = await guardedForward({
    call: { toolName: 'get_balance', inputSchemaHash: hashFor('get_balance'), args: {} },
    evidence: { chain_id: 10143, chain_evidence: { chain_id: 10143 }, sanitized_address_or_account_context: true },
    policySource: { snapshot: snapshotFor('get_balance') },
    llm: VETO_LLM,
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'LLM_SAFETY_BLOCKED');
  assert.equal(forward.calls.length, 0);
  assert.equal(res.record.llm_review.verdict, 'unsafe');
});

test('LLM unavailable fails closed (block) without forwarding', async () => {
  const forward = spyForward();
  const res = await guardedForward({
    call: { toolName: 'get_balance', inputSchemaHash: hashFor('get_balance'), args: {} },
    evidence: { chain_id: 10143, chain_evidence: { chain_id: 10143 }, sanitized_address_or_account_context: true },
    policySource: { snapshot: snapshotFor('get_balance') },
    llm: DOWN_LLM,
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'LLM_SAFETY_UNAVAILABLE');
  assert.equal(forward.calls.length, 0);
});

test('approve_token within policy builds a digest and is idempotent across retries', async () => {
  const forward = spyForward();
  const store = new IdempotencyStore();
  const call = {
    toolName: 'approve_token',
    inputSchemaHash: hashFor('approve_token'),
    args: { token: fixture.allowed_tokens[0], spender: fixture.allowed_spenders[0].spender, amount: '10' },
  };
  const evidence = {
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
  };
  const opts = { call, evidence, policySource: { snapshot: snapshotFor('approve_token') }, llm: SAFE_LLM, forward, idempotencyStore: store };

  const first = await guardedForward(opts);
  assert.equal(first.decision, 'allow', JSON.stringify(first.error || first.record.reason_code));
  assert.ok(first.digest, 'digest present for token_approval');
  assert.ok(first.idempotency_key, 'idempotency key present');

  const second = await guardedForward(opts);
  assert.equal(second.decision, 'allow');
  assert.equal(second.reused, true);
  assert.equal(forward.calls.length, 1, 'forward executed exactly once across retries');
});
