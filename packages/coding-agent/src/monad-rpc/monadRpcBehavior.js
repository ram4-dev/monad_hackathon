'use strict';

// Wave 5 — Monad Testnet RPC behavior handling (W0 evidence; official Monad docs).
// Encodes the Monad-specific caveats that differ from generic Ethereum so confirmation and
// idempotency stay correct: async send validation, no reliance on pending-tx lookup, provisional
// `latest`, gas-estimation caveats, and fail-closed + sanitized RPC errors.

const MONAD_TESTNET_CHAIN_ID = 10143;

// `latest` on Monad is provisional (speculative) state; reads tagged this way must be treated as
// non-final. Callers should prefer 'finalized' for finality-sensitive reads.
const PROVISIONAL_BLOCK_TAG = 'latest';
const FINALIZED_BLOCK_TAG = 'finalized';

// Methods that must NOT be relied upon for pending-state correctness on Monad.
const PENDING_LOOKUP_METHODS = new Set(['eth_getTransactionByHash']);

/**
 * Guard: W5 must not depend on a pending-tx lookup for correctness. Returns true if the given
 * method/blockTag combination would be relying on pending state.
 */
function reliesOnPendingLookup(method, blockTag) {
  if (PENDING_LOOKUP_METHODS.has(method)) return true;
  if (blockTag === 'pending') return true;
  return false;
}

// Monad validates sends asynchronously: a submitted tx hash does NOT imply inclusion/finality.
// W5 must treat a broadcast result as "submitted", relying on idempotency + receipts for
// confirmation rather than synchronous success.
function classifySendResult(rawResult) {
  return {
    status: 'submitted',
    synchronous_confirmation: false,
    tx_hash: typeof rawResult === 'string' ? rawResult : (rawResult && rawResult.tx_hash) || null,
    note: 'Monad send validation is async; confirm via receipt/idempotency, not pending lookup.',
  };
}

// Produce a safe, sanitized failure marker for an RPC error (never echo raw provider text).
function sanitizedRpcFailure(reasonCode) {
  return { ok: false, error_code: reasonCode || 'MONAD_RPC_UNAVAILABLE' };
}

module.exports = {
  MONAD_TESTNET_CHAIN_ID,
  PROVISIONAL_BLOCK_TAG,
  FINALIZED_BLOCK_TAG,
  PENDING_LOOKUP_METHODS,
  reliesOnPendingLookup,
  classifySendResult,
  sanitizedRpcFailure,
};
