'use strict';

// Wave 5 — per-user policy contract lifecycle as a guarded on-chain action.
// Deploying/bootstrapping and updating a user's policy contract is itself a guarded mutation: it
// requires owner authorization (policy-over-policy), explicit consent, successful simulation, a
// candidate digest, the veto-only LLM review, idempotency, and a sanitized audit recording the
// before/after policy version. Reuses W4 digest/idempotency/LLM and W3 safe-errors/audit.

const crypto = require('node:crypto');
const { createSafeError } = require('../safe-errors');
const { keccak256 } = require('../policy/keccak256');
const { buildCandidateTxDigest, canonicalJson } = require('../digest');
const { buildLlmContext, finalSafetyReview, stripSecrets } = require('../llm');
const { checkConsent } = require('../action-coverage/consentGate');

function lower(v) {
  return typeof v === 'string' ? v.toLowerCase() : v;
}

function block(reason_code, extra = {}) {
  return { decision: 'block', error: createSafeError(reason_code), record: { decision: 'block', reason_code, chain_id: 10143, ...extra } };
}

/**
 * @param {object} params
 * @param {'bootstrap'|'update'} params.kind
 * @param {string} params.requesterAddress
 * @param {object} [params.currentPolicy]        current PolicySnapshot (undefined if none yet)
 * @param {object} params.update                 proposed policy content (e.g. { new_policy_version, content_hash, ... })
 * @param {object} [params.consent]              explicit consent (network/account/target/asset/max_amount)
 * @param {object} [params.simulation]           real simulation result { status }
 * @param {object} [params.llm]                  injectable LLM client
 * @param {object} [params.env]
 * @param {(kind: string, update: object) => Promise<any>} params.forward
 * @param {object} [params.idempotencyStore]
 * @param {(event: object) => Promise<void>} [params.auditWriter]
 * @param {() => number} [params.now]
 */
async function coverPolicyUpdate({ kind, requesterAddress, currentPolicy, update = {}, consent, simulation, llm, env, forward, idempotencyStore, auditWriter, now } = {}) {
  const clock = typeof now === 'function' ? now : () => Date.now();

  // 1. Authorization (policy-over-policy).
  if (kind === 'update') {
    if (!currentPolicy) return block('USER_POLICY_UNRESOLVED'); // nothing to update -> fail closed
    const owner = currentPolicy.source && currentPolicy.source.owner_address;
    if (!requesterAddress || lower(requesterAddress) !== lower(owner)) return block('POLICY_OWNER_ONLY');
  } else if (kind === 'bootstrap') {
    if (currentPolicy) return block('POLICY_OWNER_ONLY', { reason: 'already_bootstrapped' });
    if (!requesterAddress) return block('USER_POLICY_UNRESOLVED');
  } else {
    return block('INTERNAL_ERROR');
  }

  // 2. Consent required (this is a real on-chain mutation).
  const consentCheck = checkConsent(consent);
  if (!consentCheck.ok) {
    return { decision: 'skipped', reason: 'consent_required', missing_consent: consentCheck.missing, record: { decision: 'skipped', reason_code: 'CONSENT_REQUIRED', chain_id: 10143 } };
  }

  // 3. Simulation required (write).
  if (!simulation || simulation.status !== 'success') {
    return block(simulation && simulation.status === 'failed' ? 'SIMULATION_FAILED' : 'SIMULATION_UNAVAILABLE');
  }

  // 4. Candidate digest over the proposed update.
  const { digest, covered_fields, digest_version } = buildCandidateTxDigest({
    chain_id: 10143,
    account: requesterAddress,
    tool_name: `compass_policy_${kind}`,
    data: canonicalJson(update),
  });

  // 5. Veto-only LLM final safety review.
  const context = buildLlmContext({
    toolName: `compass_policy_${kind}`,
    semantics: { tool_name: `compass_policy_${kind}`, tool_class: 'policy_admin' },
    args: stripSecrets(update),
    digest,
    covered_fields,
    policySnapshot: currentPolicy,
  });
  const llmReview = await finalSafetyReview({ context, client: llm, env });
  if (llmReview.verdict !== 'safe') {
    return { decision: 'block', error: createSafeError(llmReview.error_code || 'LLM_SAFETY_BLOCKED'), record: { decision: 'block', reason_code: llmReview.error_code || 'LLM_SAFETY_BLOCKED', chain_id: 10143, digest, llm_review: llmReview } };
  }

  if (typeof forward !== 'function') return block('INTERNAL_ERROR');

  // 6. Idempotent forward.
  const idempotency_key = keccak256(`policy:${kind}:${lower(requesterAddress)}:${digest}`);
  let result;
  let reused = false;
  if (idempotencyStore) {
    const ran = await idempotencyStore.runOnce(idempotency_key, () => forward(kind, update));
    result = ran.result;
    reused = ran.reused;
  } else {
    result = await forward(kind, update);
  }

  // 7. Record with before/after version snapshot.
  const record = {
    forward_id: `pol_${crypto.randomBytes(8).toString('hex')}`,
    tool_name: `compass_policy_${kind}`,
    tool_class: 'policy_admin',
    chain_id: 10143,
    decision: 'allow',
    reason_code: 'POLICY_ALLOWED',
    digest_version,
    candidate_tx_digest: digest,
    covered_fields,
    idempotency_key,
    prior_policy_version: (currentPolicy && currentPolicy.policy_version) || null,
    new_policy_version: update.new_policy_version != null ? String(update.new_policy_version) : null,
    owner_address: currentPolicy && currentPolicy.source ? currentPolicy.source.owner_address : lower(requesterAddress),
    llm_review: { ran: !!llmReview.ran, verdict: llmReview.verdict, reason_redacted: llmReview.reason_redacted || '' },
    created_at: new Date(clock()).toISOString(),
  };

  if (typeof auditWriter === 'function') {
    try {
      await auditWriter({ action: 'policy_update_observed', result: 'success', metadata: { policy_version: record.new_policy_version, reason_codes: ['POLICY_ALLOWED'] } });
    } catch (_e) {
      /* audit failure must not leak; recorded in record */
    }
  }

  return { decision: 'allow', result, record, digest, idempotency_key, reused };
}

module.exports = { coverPolicyUpdate };
