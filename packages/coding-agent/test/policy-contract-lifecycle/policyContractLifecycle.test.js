'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('../policy-source/fixtures/policy-snapshot.valid.fixture.json');
const { coverPolicyUpdate } = require('../../src/policy-contract-lifecycle');
const { IdempotencyStore } = require('../../src/idempotency');

const SAFE_LLM = { review: async () => ({ verdict: 'safe', reason: 'ok' }) };
const OWNER = fixture.source.owner_address;
const consent = { network: 'monad-testnet', account: OWNER, target: 'policy-contract', asset: 'policy', max_amount: '0' };

function spyForward() {
  const calls = [];
  const fn = async (kind, update) => { calls.push({ kind, update }); return { tx_hash: '0xabc' }; };
  fn.calls = calls;
  return fn;
}

test('owner update is allowed through the guard chain and records a version change', async () => {
  const forward = spyForward();
  const res = await coverPolicyUpdate({
    kind: 'update',
    requesterAddress: OWNER,
    currentPolicy: fixture,
    update: { new_policy_version: 2, content_hash: '0xnew' },
    consent,
    simulation: { status: 'success' },
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'allow', JSON.stringify(res.error || res.record));
  assert.equal(forward.calls.length, 1);
  assert.equal(res.record.prior_policy_version, '1');
  assert.equal(res.record.new_policy_version, '2');
  assert.ok(res.idempotency_key);
});

test('cross-user policy modification is blocked', async () => {
  const forward = spyForward();
  const res = await coverPolicyUpdate({
    kind: 'update',
    requesterAddress: '0x9999999999999999999999999999999999999999',
    currentPolicy: fixture,
    update: { new_policy_version: 2 },
    consent,
    simulation: { status: 'success' },
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'POLICY_OWNER_ONLY');
  assert.equal(forward.calls.length, 0);
});

test('update with no existing policy fails closed', async () => {
  const forward = spyForward();
  const res = await coverPolicyUpdate({
    kind: 'update',
    requesterAddress: OWNER,
    currentPolicy: undefined,
    update: { new_policy_version: 2 },
    consent,
    simulation: { status: 'success' },
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'USER_POLICY_UNRESOLVED');
  assert.equal(forward.calls.length, 0);
});

test('update without consent is skipped (not forwarded)', async () => {
  const forward = spyForward();
  const res = await coverPolicyUpdate({
    kind: 'update',
    requesterAddress: OWNER,
    currentPolicy: fixture,
    update: { new_policy_version: 2 },
    simulation: { status: 'success' },
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'skipped');
  assert.equal(forward.calls.length, 0);
});

test('update is idempotent across retries with the same store', async () => {
  const forward = spyForward();
  const store = new IdempotencyStore();
  const opts = {
    kind: 'update',
    requesterAddress: OWNER,
    currentPolicy: fixture,
    update: { new_policy_version: 2, content_hash: '0xnew' },
    consent,
    simulation: { status: 'success' },
    llm: SAFE_LLM,
    forward,
    idempotencyStore: store,
  };
  const first = await coverPolicyUpdate(opts);
  const second = await coverPolicyUpdate(opts);
  assert.equal(first.decision, 'allow');
  assert.equal(second.decision, 'allow');
  assert.equal(second.reused, true);
  assert.equal(forward.calls.length, 1);
});

test('bootstrap on a fresh user is allowed; bootstrap over existing policy blocks', async () => {
  const forward = spyForward();
  const fresh = await coverPolicyUpdate({
    kind: 'bootstrap',
    requesterAddress: OWNER,
    currentPolicy: undefined,
    update: { new_policy_version: 1 },
    consent,
    simulation: { status: 'success' },
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(fresh.decision, 'allow', JSON.stringify(fresh.error || fresh.record));

  const dup = await coverPolicyUpdate({
    kind: 'bootstrap',
    requesterAddress: OWNER,
    currentPolicy: fixture,
    update: { new_policy_version: 1 },
    consent,
    simulation: { status: 'success' },
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(dup.decision, 'block');
  assert.equal(dup.error.error_code, 'POLICY_OWNER_ONLY');
});

test('LLM veto blocks a policy update', async () => {
  const forward = spyForward();
  const res = await coverPolicyUpdate({
    kind: 'update',
    requesterAddress: OWNER,
    currentPolicy: fixture,
    update: { new_policy_version: 2 },
    consent,
    simulation: { status: 'success' },
    llm: { review: async () => ({ verdict: 'unsafe', reason: 'nope' }) },
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'LLM_SAFETY_BLOCKED');
  assert.equal(forward.calls.length, 0);
});
