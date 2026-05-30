'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createJsonRpcTransport } = require('../../src/monad-rpc/jsonRpcTransport');
const { reliesOnPendingLookup, classifySendResult } = require('../../src/monad-rpc/monadRpcBehavior');
const { buildSimulationEvidence } = require('../../src/monad-rpc/simulationEvidence');

function mockFetch(responder) {
  return async (_url, init) => {
    const body = JSON.parse(init.body);
    const result = await responder(body.method, body.params);
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: body.id, result }) };
  };
}

test('json-rpc transport issues a request and returns result', async () => {
  const t = createJsonRpcTransport({ rpcUrl: 'https://rpc.example', fetchImpl: mockFetch(async (m) => (m === 'eth_chainId' ? '0x279f' : '0x0')) });
  const chain = await t.request({ method: 'eth_chainId', params: [] });
  assert.equal(chain, '0x279f');
});

test('pending-tx lookup is refused (Monad caveat)', async () => {
  const t = createJsonRpcTransport({ rpcUrl: 'https://rpc.example', fetchImpl: mockFetch(async () => '0x1') });
  await assert.rejects(() => t.request({ method: 'eth_getTransactionByHash', params: ['0xabc'] }));
  assert.equal(reliesOnPendingLookup('eth_getTransactionByHash'), true);
  assert.equal(reliesOnPendingLookup('eth_call', 'pending'), true);
  assert.equal(reliesOnPendingLookup('eth_call', 'latest'), false);
});

test('send result is classified as async submitted, not synchronously confirmed', () => {
  const r = classifySendResult('0xdeadbeef');
  assert.equal(r.status, 'submitted');
  assert.equal(r.synchronous_confirmation, false);
  assert.equal(r.tx_hash, '0xdeadbeef');
});

test('simulation evidence is success with gas cost when RPC succeeds', async () => {
  const t = createJsonRpcTransport({
    rpcUrl: 'https://rpc.example',
    fetchImpl: mockFetch(async (m) => (m === 'eth_estimateGas' ? '0x5208' : '0x')), // 21000
  });
  const ev = await buildSimulationEvidence({ transport: t, tx: { to: '0x1', value: '0x1' }, fee: { maxFeePerGasWei: 1000n } });
  assert.equal(ev.simulation.status, 'success');
  assert.equal(ev.gas_limit, '21000');
  assert.equal(ev.estimated_gas_cost_wei, '21000000');
});

test('simulation evidence fails closed when eth_call reverts', async () => {
  const t = createJsonRpcTransport({
    rpcUrl: 'https://rpc.example',
    fetchImpl: async () => ({ ok: true, json: async () => ({ jsonrpc: '2.0', id: 1, error: { message: 'revert' } }) }),
  });
  const ev = await buildSimulationEvidence({ transport: t, tx: { to: '0x1' } });
  assert.equal(ev.simulation.status, 'failed');
});

test('simulation evidence is unavailable without a transport', async () => {
  const ev = await buildSimulationEvidence({ tx: { to: '0x1' } });
  assert.equal(ev.simulation.status, 'unavailable');
});
