'use strict';

// Wave 4 — sanitized context builder for the LLM final safety review.
// The LLM receives ONLY non-secret context: tool name + registry semantics summary, normalized
// args, candidate_tx_digest, simulation summary, and the on-chain policy snapshot summary.
// Secrets, private keys, seeds, mnemonics, tokens, api keys and raw credential payloads are
// stripped. tx fields (to/value/data/amount/recipient) are NOT secrets and are kept so the LLM
// can reason about the action.

const SECRET_KEY_RE = /(private[-_]?key|privatekey|secret|seed|mnemonic|passphrase|password|api[-_]?key|apikey|credential|keystore|authorization|bearer|access[-_]?token)/i;

function stripSecrets(value, depth = 0) {
  if (depth > 8) return '[redacted-depth]';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => stripSecrets(v, depth + 1));
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SECRET_KEY_RE.test(k)) {
      out[k] = '[redacted]';
      continue;
    }
    out[k] = stripSecrets(v, depth + 1);
  }
  return out;
}

function semanticsSummary(semantics) {
  if (!semantics || typeof semantics !== 'object') return null;
  return {
    tool_name: semantics.tool_name,
    tool_class: semantics.tool_class,
    state_effect: semantics.state_effect,
    requires_simulation: semantics.requires_simulation,
    required_fields: semantics.required_fields,
    required_evidence: semantics.required_evidence,
  };
}

function policySummary(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  return {
    policy_id: snapshot.policy_id,
    policy_version: snapshot.policy_version,
    chain_id: snapshot.source && snapshot.source.chain_id,
    contract_address: snapshot.source && snapshot.source.contract_address,
    flags: snapshot.flags,
    caps: snapshot.caps,
  };
}

/**
 * Build the sanitized context object that is sent to the LLM.
 * @returns {object}
 */
function buildLlmContext({ toolName, semantics, args, digest, covered_fields, evidence, policySnapshot } = {}) {
  return {
    tool_name: toolName,
    semantics: semanticsSummary(semantics),
    args: stripSecrets(args || {}),
    candidate_tx_digest: digest || null,
    covered_fields: covered_fields || [],
    simulation: evidence && evidence.simulation ? stripSecrets(evidence.simulation) : null,
    action_evidence: evidence
      ? stripSecrets({
          chain_id: evidence.chain_id,
          recipient: evidence.recipient,
          token: evidence.token,
          spender: evidence.spender,
          amount: evidence.amount,
          amount_atomic: evidence.amount_atomic,
          amount_wei: evidence.amount_wei,
          estimated_gas_cost_wei: evidence.estimated_gas_cost_wei,
        })
      : null,
    policy: policySummary(policySnapshot),
  };
}

module.exports = { buildLlmContext, stripSecrets, SECRET_KEY_RE };
