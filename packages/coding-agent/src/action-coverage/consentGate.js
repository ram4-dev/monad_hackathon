'use strict';

// Wave 5 — explicit consent gate for real testnet mutations.
// A broadcast/approval/signature must carry explicit consent identifying network, account
// constraints, recipient/target, asset, and max amount. Without it, the action is SKIPPED and
// recorded (never forwarded). Read-only/simulation/chain-management do not require consent.

const MUTATION_CLASSES = new Set(['transaction_execute', 'token_approval', 'signature', 'contract_write']);

function requiresConsent(toolClass) {
  return MUTATION_CLASSES.has(toolClass);
}

/**
 * Consent must identify: network, account/source constraint, recipient/target, asset, max amount.
 * @returns {{ ok: boolean, missing?: string[] }}
 */
function checkConsent(consent) {
  if (!consent || typeof consent !== 'object') return { ok: false, missing: ['consent'] };
  const required = ['network', 'account', 'target', 'asset', 'max_amount'];
  const missing = required.filter((k) => consent[k] == null || consent[k] === '');
  return { ok: missing.length === 0, missing };
}

module.exports = { MUTATION_CLASSES, requiresConsent, checkConsent };
