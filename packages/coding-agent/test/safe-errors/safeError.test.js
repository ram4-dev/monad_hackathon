const test = require('node:test');
const assert = require('node:assert/strict');

const { createSafeError, redactValue } = require('../../src/safe-errors');

test('policy-source errors are stable and sanitized', () => {
  const a = createSafeError('POLICY_ABI_DECODE_FAILED', { rawError: new Error('stack trace with https://secret.example/rpc') });
  const b = createSafeError('POLICY_ABI_DECODE_FAILED', { rawError: 'different raw payload' });
  assert.equal(a.error_code, b.error_code);
  assert.equal(a.error_code, 'POLICY_ABI_DECODE_FAILED');
  assert.doesNotMatch(JSON.stringify(a), /secret\.example|stack trace|raw payload/);
});

test('redaction excludes rpc urls, private keys, env-looking tokens, and unredacted args', () => {
  const redacted = redactValue({
    rpc_url: 'https://api-key.example/rpc?token=secret',
    private_key: '0x' + '11'.repeat(32),
    stack: 'at secret stack',
    keep: 'safe',
    nested: { password: 'secret', chain_id: 10143 },
  });
  assert.equal(redacted.keep, 'safe');
  assert.equal(redacted.nested.chain_id, 10143);
  assert.equal(redacted.rpc_url, '[redacted]');
  assert.equal(redacted.private_key, '[redacted]');
  assert.equal(redacted.stack, '[redacted]');
  assert.equal(redacted.nested.password, '[redacted]');
});

test('generic redactValue still redacts 32-byte hex strings', () => {
  const redacted = redactValue({
    tx_like: '0x' + 'ab'.repeat(32),
    nested: ['0x' + 'cd'.repeat(32)],
  });
  assert.equal(redacted.tx_like, '[redacted]');
  assert.equal(redacted.nested[0], '[redacted]');
});
