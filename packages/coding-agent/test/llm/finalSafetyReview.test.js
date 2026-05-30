'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { finalSafetyReview, buildLlmContext, stripSecrets } = require('../../src/llm');

test('safe verdict passes through', async () => {
  const client = { review: async () => ({ verdict: 'safe', reason: 'looks fine' }) };
  const r = await finalSafetyReview({ context: {}, client });
  assert.equal(r.verdict, 'safe');
  assert.equal(r.ran, true);
  assert.equal(r.error_code, undefined);
});

test('unsafe verdict blocks with LLM_SAFETY_BLOCKED', async () => {
  const client = { review: async () => ({ verdict: 'unsafe', reason: 'suspicious recipient' }) };
  const r = await finalSafetyReview({ context: {}, client });
  assert.equal(r.verdict, 'unsafe');
  assert.equal(r.error_code, 'LLM_SAFETY_BLOCKED');
});

test('malformed verdict fails closed (blocks)', async () => {
  const client = { review: async () => ({ verdict: 'maybe', reason: '' }) };
  const r = await finalSafetyReview({ context: {}, client });
  assert.equal(r.verdict, 'unsafe');
  assert.equal(r.error_code, 'LLM_SAFETY_BLOCKED');
});

test('a throwing client fails closed as unavailable', async () => {
  const client = { review: async () => { throw new Error('network'); } };
  const r = await finalSafetyReview({ context: {}, client });
  assert.equal(r.verdict, 'unavailable');
  assert.equal(r.error_code, 'LLM_SAFETY_UNAVAILABLE');
});

test('no client and no env fails closed as unavailable', async () => {
  const r = await finalSafetyReview({ context: {}, env: {} });
  assert.equal(r.verdict, 'unavailable');
  assert.equal(r.error_code, 'LLM_SAFETY_UNAVAILABLE');
});

test('sanitized context strips secret-looking keys but keeps tx fields', () => {
  const ctx = buildLlmContext({
    toolName: 'transfer_token',
    semantics: { tool_name: 'transfer_token', tool_class: 'transaction_execute' },
    args: { to: '0xRecipient', value: '1', privateKey: '0xSECRET', api_key: 'abc' },
    digest: '0xdig',
    evidence: { chain_id: 10143, recipient: '0xRecipient' },
  });
  assert.equal(ctx.args.to, '0xRecipient');
  assert.equal(ctx.args.value, '1');
  assert.equal(ctx.args.privateKey, '[redacted]');
  assert.equal(ctx.args.api_key, '[redacted]');
  assert.equal(ctx.candidate_tx_digest, '0xdig');
  assert.equal(ctx.action_evidence.chain_id, 10143);
});

test('stripSecrets redacts nested secret keys', () => {
  const out = stripSecrets({ a: { mnemonic: 'x y z', ok: 1 } });
  assert.equal(out.a.mnemonic, '[redacted]');
  assert.equal(out.a.ok, 1);
});
