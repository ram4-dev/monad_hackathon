'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCandidateTxDigest, DIGEST_VERSION } = require('../../src/digest');

test('digest is deterministic for the same canonical inputs', () => {
  const input = { chain_id: 10143, to: '0xABC', value: '1', data: '0xDEAD', tool_name: 'send_transaction' };
  const a = buildCandidateTxDigest(input);
  const b = buildCandidateTxDigest({ ...input });
  assert.equal(a.digest, b.digest);
  assert.equal(a.digest_version, DIGEST_VERSION);
  assert.match(a.digest, /^0x[0-9a-f]{64}$/);
});

test('covered_fields lists only present fields', () => {
  const { covered_fields } = buildCandidateTxDigest({ chain_id: 10143, to: '0x1', tool_name: 'transfer_token' });
  assert.deepEqual(covered_fields.sort(), ['chain_id', 'to', 'tool_name'].sort());
});

test('different value yields a different digest', () => {
  const base = { chain_id: 10143, to: '0x1', value: '1', tool_name: 't' };
  const a = buildCandidateTxDigest(base);
  const b = buildCandidateTxDigest({ ...base, value: '2' });
  assert.notEqual(a.digest, b.digest);
});

test('hex scalars are lowercased for stability', () => {
  const a = buildCandidateTxDigest({ to: '0xABCDEF', tool_name: 't' });
  const b = buildCandidateTxDigest({ to: '0xabcdef', tool_name: 't' });
  assert.equal(a.digest, b.digest);
});

test('bigint values are normalized to strings', () => {
  const a = buildCandidateTxDigest({ amount: 100n, tool_name: 't' });
  const b = buildCandidateTxDigest({ amount: '100', tool_name: 't' });
  assert.equal(a.digest, b.digest);
});
