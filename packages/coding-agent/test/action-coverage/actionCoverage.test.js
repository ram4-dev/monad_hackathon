'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('../policy-source/fixtures/policy-snapshot.valid.fixture.json');
const { toolKey } = require('../../src/policy');
const { coverToolCall } = require('../../src/action-coverage');

const SAFE_LLM = { review: async () => ({ verdict: 'safe', reason: 'ok' }) };

function snapshotFor(toolName, extras = {}) {
  return { ...fixture, allowed_tool_keys: [toolKey(toolName)], ...extras };
}

function spyForward() {
  const calls = [];
  const fn = async (toolName, args) => { calls.push({ toolName, args }); return { upstream: 'ok' }; };
  fn.calls = calls;
  return fn;
}

const fullConsent = { network: 'monad-testnet', account: '0xacc', target: '0xdef', asset: 'MON', max_amount: '1000' };

test('read-only get_balance flows through coverage and forwards once', async () => {
  const forward = spyForward();
  const res = await coverToolCall({
    toolName: 'get_balance',
    args: { address: '0x9' },
    ctx: { chainId: 10143, account: '0x9' },
    policySource: { snapshot: snapshotFor('get_balance') },
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'allow');
  assert.equal(forward.calls.length, 1);
});

test('transfer without consent is skipped and not forwarded', async () => {
  const forward = spyForward();
  const res = await coverToolCall({
    toolName: 'transfer_token',
    args: { to: fixture.allowed_recipients[0], token: fixture.allowed_tokens[0], amount: '10' },
    ctx: { chainId: 10143 },
    policySource: { snapshot: snapshotFor('transfer_token') },
    simulation: { status: 'success' },
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'skipped');
  assert.equal(res.reason, 'consent_required');
  assert.equal(forward.calls.length, 0);
});

test('transfer with consent + simulation forwards once', async () => {
  const forward = spyForward();
  const res = await coverToolCall({
    toolName: 'transfer_token',
    args: { to: fixture.allowed_recipients[0], token: fixture.allowed_tokens[0], amount: '10' },
    ctx: { chainId: 10143 },
    policySource: { snapshot: snapshotFor('transfer_token') },
    simulation: { status: 'success' },
    consent: fullConsent,
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'allow', JSON.stringify(res.error || res.record));
  assert.equal(forward.calls.length, 1);
  assert.ok(res.digest);
});

test('transfer with consent but missing simulation fails closed (no forward)', async () => {
  const forward = spyForward();
  const res = await coverToolCall({
    toolName: 'transfer_token',
    args: { to: fixture.allowed_recipients[0], token: fixture.allowed_tokens[0], amount: '10' },
    ctx: { chainId: 10143 },
    policySource: { snapshot: snapshotFor('transfer_token') },
    consent: fullConsent,
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'SIMULATION_UNAVAILABLE');
  assert.equal(forward.calls.length, 0);
});

test('unlimited approve_token is blocked before upstream', async () => {
  const forward = spyForward();
  const res = await coverToolCall({
    toolName: 'approve_token',
    args: { token: fixture.allowed_tokens[0], spender: fixture.allowed_spenders[0].spender, amount: 'uint256.max' },
    ctx: { chainId: 10143 },
    policySource: { snapshot: snapshotFor('approve_token') },
    simulation: { status: 'success' },
    consent: fullConsent,
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'POLICY_UNLIMITED_APPROVAL_BLOCKED');
  assert.equal(forward.calls.length, 0);
});

test('finite approve_token with exact on-chain match is allowed', async () => {
  const forward = spyForward();
  const res = await coverToolCall({
    toolName: 'approve_token',
    args: { token: fixture.allowed_tokens[0], spender: fixture.allowed_spenders[0].spender, amount: '10' },
    ctx: { chainId: 10143 },
    policySource: { snapshot: snapshotFor('approve_token') },
    simulation: { status: 'success' },
    consent: fullConsent,
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'allow', JSON.stringify(res.error || res.record));
  assert.equal(forward.calls.length, 1);
});

test('non-allowlisted recipient transfer blocks', async () => {
  const forward = spyForward();
  const res = await coverToolCall({
    toolName: 'transfer_token',
    args: { to: '0x9999999999999999999999999999999999999999', token: fixture.allowed_tokens[0], amount: '10' },
    ctx: { chainId: 10143 },
    policySource: { snapshot: snapshotFor('transfer_token') },
    simulation: { status: 'success' },
    consent: fullConsent,
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'POLICY_RECIPIENT_NOT_ALLOWED');
  assert.equal(forward.calls.length, 0);
});

test('unmapped tool is blocked', async () => {
  const forward = spyForward();
  const res = await coverToolCall({
    toolName: 'totally_unknown_tool',
    args: {},
    policySource: { snapshot: fixture },
    llm: SAFE_LLM,
    forward,
  });
  assert.equal(res.decision, 'block');
  assert.equal(res.error.error_code, 'UNMAPPED_TOOL');
  assert.equal(forward.calls.length, 0);
});
