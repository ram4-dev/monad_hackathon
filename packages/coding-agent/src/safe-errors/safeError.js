'use strict';

const crypto = require('node:crypto');
const { redactValue } = require('./redact');

const SAFE_MESSAGES = Object.freeze({
  POLICY_SOURCE_BINDING_INVALID: 'Policy source binding is invalid or incomplete.',
  POLICY_RPC_CHAIN_MISMATCH: 'Policy source is not bound to Monad Testnet.',
  POLICY_RPC_READ_FAILED: 'Policy source could not be read safely.',
  POLICY_ABI_DECODE_FAILED: 'Policy contract response could not be decoded safely.',
  POLICY_SCHEMA_INVALID: 'Policy contract state failed schema validation.',
  POLICY_VERSION_UNSUPPORTED: 'Policy version is not supported by this evaluator.',
  POLICY_CONTRACT_STALE_OR_DEAD: 'Policy contract address has no readable policy code.',
  POLICY_FROZEN: 'Policy is frozen and blocks policy-gated calls.',
  POLICY_TOOL_NOT_ALLOWED: 'Tool is not allowed by policy.',
  POLICY_RECIPIENT_NOT_ALLOWED: 'Recipient is not allowed by policy.',
  POLICY_TOKEN_NOT_ALLOWED: 'Token is not allowed by policy.',
  POLICY_SPENDER_NOT_ALLOWED: 'Spender is not allowed by policy.',
  POLICY_AMOUNT_OVER_CAP: 'Amount exceeds policy cap.',
  POLICY_GAS_OVER_CAP: 'Gas cost exceeds policy cap.',
  POLICY_UNLIMITED_APPROVAL_BLOCKED: 'Unlimited token approval is blocked.',
  POLICY_TYPED_DATA_NOT_ALLOWED: 'Typed data signature is not allowed by policy.',
  MISSING_REQUIRED_EVIDENCE: 'Required evidence is missing.',
  SIMULATION_UNAVAILABLE: 'Required simulation is unavailable.',
  SIMULATION_FAILED: 'Simulation failed.',
  AUDIT_WRITE_FAILED: 'Audit write failed; request blocked.',
  INTERNAL_ERROR: 'Internal policy evaluation error.',
  UNMAPPED_TOOL: 'Tool is not registered in Compass semantics.',
  UNSUPPORTED_TOOL: 'Tool is unsupported by current Compass evidence.',
  PRIVATE_KEY_MANAGEMENT_BLOCKED: 'Private-key or keystore management tools are blocked.',
  DANGEROUS_TOOL_BLOCKED: 'Dangerous tool is blocked before policy.',
  SCHEMA_DRIFT: 'Tool schema drifted from the registry.',
  POLICY_ALLOWED: 'Policy allowed the request.',
  // Wave 4 — guarded forward pipeline
  USER_POLICY_UNRESOLVED: 'User policy could not be resolved.',
  POLICY_CONTRACT_UNAVAILABLE: 'Policy contract is unavailable.',
  DIGEST_MISMATCH: 'Candidate transaction digest did not match.',
  LLM_SAFETY_BLOCKED: 'Final safety review blocked the request.',
  LLM_SAFETY_UNAVAILABLE: 'Final safety review is unavailable; request blocked.',
  UPSTREAM_UNAVAILABLE: 'The upstream is not available.',
  UPSTREAM_ERROR: 'The upstream returned an error.',
});

function debugRef(code) {
  return crypto.createHash('sha256').update(`${code}:${Date.now()}:${Math.random()}`).digest('hex').slice(0, 12);
}

function createSafeError(code, details = {}) {
  return {
    code: code || 'INTERNAL_ERROR',
    error_code: code || 'INTERNAL_ERROR',
    safe_message: SAFE_MESSAGES[code] || SAFE_MESSAGES.INTERNAL_ERROR,
    debug_ref: details.debug_ref || debugRef(code || 'INTERNAL_ERROR'),
    details: redactValue(details.safeDetails || {}),
  };
}

module.exports = {
  SAFE_MESSAGES,
  createSafeError,
};
