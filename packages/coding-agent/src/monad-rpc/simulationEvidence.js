'use strict';

// Wave 5 — build simulation/gas evidence for write/approval/signature classes from Monad RPC.
// Uses eth_call (revert inspection) + eth_estimateGas. Fail-closed: any RPC failure yields a
// simulation status of 'unavailable' so the guarded pipeline blocks rather than forwarding blind.

const { MONAD_TESTNET_CHAIN_ID } = require('./monadRpcBehavior');

function hexToBigInt(hex) {
  if (typeof hex !== 'string') return null;
  try {
    return BigInt(hex);
  } catch (_e) {
    return null;
  }
}

/**
 * @param {object} params
 * @param {{ request: Function }} params.transport
 * @param {{ from?: string, to?: string, value?: string, data?: string }} params.tx
 * @param {{ maxFeePerGasWei?: string | bigint }} [params.fee]
 * @returns {Promise<{ simulation: { status: 'success'|'failed'|'unavailable' }, estimated_gas_cost_wei?: string, gas_limit?: string }>}
 */
async function buildSimulationEvidence({ transport, tx, fee = {} } = {}) {
  if (!transport || typeof transport.request !== 'function' || !tx) {
    return { simulation: { status: 'unavailable' } };
  }
  const call = {
    ...(tx.from ? { from: tx.from } : {}),
    ...(tx.to ? { to: tx.to } : {}),
    ...(tx.value ? { value: tx.value } : {}),
    ...(tx.data ? { data: tx.data } : {}),
  };
  try {
    // 1. eth_call against provisional latest to surface reverts without broadcasting.
    await transport.request({ method: 'eth_call', params: [call, 'latest'] });
  } catch (_e) {
    return { simulation: { status: 'failed' } };
  }
  try {
    // 2. eth_estimateGas; Monad charges the full gas limit, so use the estimate as the cost basis.
    const gasHex = await transport.request({ method: 'eth_estimateGas', params: [call] });
    const gas = hexToBigInt(gasHex);
    if (gas == null) return { simulation: { status: 'unavailable' } };
    const feeWei = fee.maxFeePerGasWei != null ? BigInt(fee.maxFeePerGasWei) : null;
    const out = { simulation: { status: 'success' }, gas_limit: gas.toString() };
    if (feeWei != null) out.estimated_gas_cost_wei = (gas * feeWei).toString();
    return out;
  } catch (_e) {
    return { simulation: { status: 'unavailable' } };
  }
}

module.exports = { buildSimulationEvidence, MONAD_TESTNET_CHAIN_ID };
