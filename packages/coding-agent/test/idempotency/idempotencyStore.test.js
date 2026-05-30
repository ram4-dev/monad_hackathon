'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { IdempotencyStore } = require('../../src/idempotency');

test('runOnce executes the function once and returns its result', async () => {
  const store = new IdempotencyStore();
  let calls = 0;
  const { reused, result } = await store.runOnce('k1', async () => {
    calls += 1;
    return 'r';
  });
  assert.equal(calls, 1);
  assert.equal(reused, false);
  assert.equal(result, 'r');
});

test('a retry with the same key reuses the result and does not execute again', async () => {
  const store = new IdempotencyStore();
  let calls = 0;
  const fn = async () => {
    calls += 1;
    return calls;
  };
  const first = await store.runOnce('same', fn);
  const second = await store.runOnce('same', fn);
  assert.equal(calls, 1);
  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.equal(second.result, 1);
});

test('distinct keys each execute once', async () => {
  const store = new IdempotencyStore();
  let calls = 0;
  await store.runOnce('a', async () => { calls += 1; });
  await store.runOnce('b', async () => { calls += 1; });
  assert.equal(calls, 2);
});

test('concurrent calls with the same key execute the function once', async () => {
  const store = new IdempotencyStore();
  let calls = 0;
  const fn = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 5));
    return 'x';
  };
  const [a, b] = await Promise.all([store.runOnce('c', fn), store.runOnce('c', fn)]);
  assert.equal(calls, 1);
  assert.equal(a.result, 'x');
  assert.equal(b.result, 'x');
});

test('a non-string key is rejected', async () => {
  const store = new IdempotencyStore();
  await assert.rejects(() => store.runOnce(undefined, async () => 1));
});
