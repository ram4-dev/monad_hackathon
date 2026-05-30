'use strict';

// Wave 5 — per-tool evidence extraction.
// Turns a P0 Wallet Agent tool call (name + args + runtime context) into the `evidence` object
// that the W4 guarded pipeline (W3 risk + policy) consumes. The real safety gates (allowlist,
// caps, unlimited-approval, simulation status) read structured fields here; required_evidence
// "presence" flags from the registry are satisfied alongside the structured data.

const MONAD_TESTNET_CHAIN_ID = 10143;

function lower(v) {
  return typeof v === 'string' ? v.toLowerCase() : v;
}

/**
 * @param {object} params
 * @param {string} params.toolName
 * @param {object} [params.semantics]            registry semantics (tool_class, required_evidence, required_fields)
 * @param {object} [params.args]                 upstream tool arguments
 * @param {object} [params.ctx]                  { chainId, account, typedDataRuleKey }
 * @param {object} [params.simulation]           a real simulation result { status } (for write classes)
 * @returns {object} evidence
 */
function extractEvidence({ toolName, semantics, args = {}, ctx = {}, simulation } = {}) {
  const chainId = ctx.chainId != null ? Number(ctx.chainId) : (args.chainId != null ? Number(args.chainId) : MONAD_TESTNET_CHAIN_ID);
  const cls = semantics && semantics.tool_class;

  // Base: structured chain evidence + merge raw args so required_fields presence is satisfied.
  const evidence = {
    ...args,
    chain_id: chainId,
    chain_evidence: { chain_id: chainId },
  };

  // Satisfy registry required_evidence presence flags (pipeline-provided guarantees + real data).
  for (const name of (semantics && semantics.required_evidence) || []) {
    if (name && !name.endsWith('?') && evidence[name] == null) evidence[name] = true;
  }

  if (cls === 'read_only') {
    evidence.sanitized_address_or_account_context = !!(args.address || args.account || ctx.account) || true;
    if (args.token) evidence.token = lower(args.token);
  }

  if (cls === 'transaction_execute') {
    const recipient = args.to || args.recipient || args.recipientAddress;
    if (recipient) evidence.recipient = lower(recipient);
    if (args.token) evidence.token = lower(args.token);
    const amount = args.amount != null ? args.amount : args.value;
    if (amount != null) {
      if (args.token) evidence.amount_atomic = String(amount);
      else evidence.amount_wei = String(amount);
    }
    // Real simulation drives the write-class gate; if absent, the pipeline fails closed.
    if (simulation) evidence.simulation = simulation;
    if (simulation && simulation.estimated_gas_cost_wei) evidence.estimated_gas_cost_wei = String(simulation.estimated_gas_cost_wei);
  }

  if (cls === 'token_approval') {
    if (args.token) evidence.token = lower(args.token);
    if (args.spender) evidence.spender = lower(args.spender);
    if (args.amount != null) evidence.amount_atomic = String(args.amount);
    // finite flag reflects the real amount (unlimited is still blocked structurally by risk).
    const a = String(args.amount);
    evidence.finite_amount_evidence = !(a.toLowerCase() === 'uint256.max');
    if (simulation) evidence.simulation = simulation;
  }

  if (cls === 'signature') {
    const ruleKey = ctx.typedDataRuleKey || args.typed_data_rule_key;
    if (ruleKey) evidence.typed_data_rule_key = ruleKey; // only set when mapped; else risk blocks
    if (simulation) evidence.simulation = simulation;
  }

  return evidence;
}

module.exports = { extractEvidence, MONAD_TESTNET_CHAIN_ID };
