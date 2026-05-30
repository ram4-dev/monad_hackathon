'use strict';

// Wave 5 — minimal JSON-RPC transport for Monad Testnet reads/sends.
// Implements the `request({ method, params })` half of the transport interface used across the
// codebase (the policy-source readContract/ABI half is provided separately). Uses fetch; never
// logs secrets or raw provider errors. Refuses pending-tx lookups (Monad caveat).

const { reliesOnPendingLookup } = require('./monadRpcBehavior');

/**
 * @param {object} opts
 * @param {string} opts.rpcUrl                 Monad Testnet RPC URL (from env/config; not committed)
 * @param {function} [opts.fetchImpl]          fetch implementation (default: global fetch)
 * @param {number} [opts.timeoutMs]
 * @returns {{ request: (req: {method: string, params?: any[]}) => Promise<any> }}
 */
function createJsonRpcTransport({ rpcUrl, fetchImpl, timeoutMs = 15000 } = {}) {
  if (!rpcUrl || typeof rpcUrl !== 'string') throw new Error('rpcUrl required');
  const doFetch = fetchImpl || globalThis.fetch;
  if (typeof doFetch !== 'function') throw new Error('no fetch available');
  let id = 0;

  async function request({ method, params = [] }) {
    if (reliesOnPendingLookup(method, Array.isArray(params) ? params[params.length - 1] : undefined)) {
      // Fail closed rather than depend on pending state for correctness.
      throw new Error('pending-state lookup not supported on Monad');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
      });
      if (!res.ok) throw new Error(`rpc status ${res.status}`);
      const data = await res.json();
      if (data && data.error) throw new Error('rpc error');
      return data ? data.result : undefined;
    } finally {
      clearTimeout(timer);
    }
  }

  return { request };
}

module.exports = { createJsonRpcTransport };
