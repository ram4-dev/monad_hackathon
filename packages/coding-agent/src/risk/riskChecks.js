'use strict';

const { riskReason, summarizeRisk } = require('./riskTypes');
const { toolKey } = require('../policy/policyToolKeys');

const UINT256_MAX = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
const PRE_POLICY_CODES = new Set(['UNMAPPED_TOOL', 'UNSUPPORTED_TOOL', 'PRIVATE_KEY_MANAGEMENT_BLOCKED', 'DANGEROUS_TOOL_BLOCKED', 'SCHEMA_DRIFT']);

function normalizeAddress(value) { return typeof value === 'string' ? value.toLowerCase() : value; }
function amountBigInt(value) {
  if (value === 'uint256.max') return BigInt(UINT256_MAX);
  if (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)) return BigInt(value);
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return BigInt(value);
  return null;
}
function hasEvidence(evidence, name) {
  if (!name || name.endsWith('?')) return true;
  if (name === 'amount') return evidence.amount != null || evidence.amount_atomic != null || evidence.amount_wei != null;
  return evidence[name] != null || evidence[name.replace(/_.*/, '')] != null;
}
function add(reasons, code, level, category, message, evidence = {}) { reasons.push(riskReason(code, level, category, message, evidence)); }

function assessRisk({ resolution, policySnapshot, policySourceFailure, evidence = {} } = {}) {
  const reasons = [];
  if (policySourceFailure) add(reasons, policySourceFailure.code || policySourceFailure.error_code || 'POLICY_RPC_READ_FAILED', 'critical', 'policy', 'Policy source failure.');
  if (resolution && resolution.status !== 'visible') {
    add(reasons, resolution.safe_reason_code || 'UNMAPPED_TOOL', 'critical', 'tool_semantics', 'W2 blocked before policy.');
    return summarizeRisk(reasons);
  }
  if (!policySnapshot) return summarizeRisk(reasons);
  const semantics = resolution && resolution.semantics;
  if (!semantics) return summarizeRisk(reasons);

  if (evidence.chain_id != null && Number(evidence.chain_id) !== 10143) add(reasons, 'POLICY_RPC_CHAIN_MISMATCH', 'critical', 'chain', 'Wrong chain.');
  if (policySnapshot.allowed_tool_keys && !policySnapshot.allowed_tool_keys.includes(toolKey(semantics.tool_name))) add(reasons, 'POLICY_TOOL_NOT_ALLOWED', 'high', 'policy', 'Tool key not allowlisted.');
  for (const required of semantics.required_fields || []) if (!hasEvidence(evidence, required)) add(reasons, 'MISSING_REQUIRED_EVIDENCE', 'high', 'tool_semantics', `Missing ${required}.`);
  for (const required of semantics.required_evidence || []) if (!hasEvidence(evidence, required)) add(reasons, 'MISSING_REQUIRED_EVIDENCE', 'high', 'tool_semantics', `Missing ${required}.`);

  const cls = semantics.tool_class;
  if (['transaction_execute', 'token_approval', 'signature', 'contract_write'].includes(cls) || semantics.requires_simulation) {
    if (!evidence.simulation) add(reasons, 'SIMULATION_UNAVAILABLE', 'high', 'simulation', 'Simulation missing.');
    else if (evidence.simulation.status === 'failed') add(reasons, 'SIMULATION_FAILED', 'high', 'simulation', 'Simulation failed.');
    else if (evidence.simulation.status === 'unavailable') add(reasons, 'SIMULATION_UNAVAILABLE', 'high', 'simulation', 'Simulation unavailable.');
  }
  if (evidence.recipient && policySnapshot.allowed_recipients && !policySnapshot.allowed_recipients.includes(normalizeAddress(evidence.recipient))) add(reasons, 'POLICY_RECIPIENT_NOT_ALLOWED', 'high', 'recipient', 'Recipient not allowlisted.');
  if (evidence.token && policySnapshot.allowed_tokens && !policySnapshot.allowed_tokens.includes(normalizeAddress(evidence.token))) add(reasons, 'POLICY_TOKEN_NOT_ALLOWED', 'high', 'token', 'Token not allowlisted.');

  const amount = amountBigInt(evidence.amount_atomic || evidence.amount_wei || evidence.amount);
  if (amount != null) {
    const cap = cls === 'transaction_execute' && !evidence.token ? BigInt(policySnapshot.caps.max_native_transfer_wei) : BigInt(policySnapshot.caps.max_erc20_transfer_atomic);
    if (amount > cap) add(reasons, 'POLICY_AMOUNT_OVER_CAP', 'high', 'amount', 'Amount over cap.');
  }
  if (evidence.estimated_gas_cost_wei && amountBigInt(evidence.estimated_gas_cost_wei) > BigInt(policySnapshot.caps.max_gas_cost_wei)) add(reasons, 'POLICY_GAS_OVER_CAP', 'high', 'policy', 'Gas over cap.');

  if (cls === 'token_approval') {
    if (String(evidence.amount_atomic || evidence.amount).toLowerCase() === 'uint256.max' || String(evidence.amount_atomic || evidence.amount) === UINT256_MAX) add(reasons, 'POLICY_UNLIMITED_APPROVAL_BLOCKED', 'critical', 'token_approval', 'Unlimited approval.');
    const token = normalizeAddress(evidence.token);
    const spender = normalizeAddress(evidence.spender);
    const limit = (policySnapshot.allowed_spenders || []).find((entry) => entry.enabled && entry.token === token && entry.spender === spender);
    if (!limit) add(reasons, 'POLICY_SPENDER_NOT_ALLOWED', 'high', 'token_approval', 'Spender not allowlisted.');
    else if (amount != null && amount > BigInt(limit.max_amount_atomic)) add(reasons, 'POLICY_AMOUNT_OVER_CAP', 'high', 'token_approval', 'Approval amount over cap.');
  }
  if (cls === 'signature' && !evidence.typed_data_rule_key) add(reasons, 'POLICY_TYPED_DATA_NOT_ALLOWED', 'high', 'signature', 'Typed data rule missing.');

  return summarizeRisk(reasons.filter((reason, index, arr) => arr.findIndex((other) => other.code === reason.code) === index));
}

module.exports = { UINT256_MAX, PRE_POLICY_CODES, assessRisk };
