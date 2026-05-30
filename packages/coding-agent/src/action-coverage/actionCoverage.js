'use strict';

// Wave 5 — action coverage: flow each P0 Wallet Agent tool through the W4 guarded pipeline.
// Resolves the registry input-schema hash, applies the consent gate for mutations, builds the
// per-tool evidence, then delegates to the W4 guardedForward orchestrator.

const { getToolSemantics } = require('../tool-semantics');
const { guardedForward } = require('../guarded-forward');
const { extractEvidence } = require('./evidenceExtractors');
const { requiresConsent, checkConsent } = require('./consentGate');

/**
 * @param {object} params
 * @param {string} params.toolName
 * @param {object} [params.args]
 * @param {object} [params.ctx]                 { chainId, account, typedDataRuleKey }
 * @param {object} params.policySource          { snapshot } | { failure } | { config, transport }
 * @param {object} [params.simulation]          real simulation result for write classes
 * @param {object} [params.consent]             explicit consent for mutations
 * @param {object} [params.llm]                 injectable LLM client
 * @param {object} [params.env]
 * @param {function} params.forward             upstream forward (DI)
 * @param {object} [params.idempotencyStore]
 * @param {function} [params.auditWriter]
 * @param {function} [params.now]
 * @returns {Promise<object>} guardedForward result, or { decision: 'skipped', reason, record }
 */
async function coverToolCall({ toolName, args = {}, ctx = {}, policySource, simulation, consent, llm, env, forward, idempotencyStore, auditWriter, now } = {}) {
  const semantics = getToolSemantics(toolName);
  const toolClass = semantics && semantics.tool_class;
  const inputSchemaHash = semantics && semantics.input_schema_hash;

  // Consent gate for real mutations: skip (do not forward) when consent is missing/incomplete.
  if (requiresConsent(toolClass)) {
    const consentCheck = checkConsent(consent);
    if (!consentCheck.ok) {
      return {
        decision: 'skipped',
        reason: 'consent_required',
        missing_consent: consentCheck.missing,
        record: {
          tool_name: toolName,
          tool_class: toolClass,
          decision: 'skipped',
          reason_code: 'CONSENT_REQUIRED',
          chain_id: 10143,
        },
      };
    }
  }

  const evidence = extractEvidence({ toolName, semantics, args, ctx, simulation });

  return guardedForward({
    call: { toolName, inputSchemaHash, args },
    evidence,
    policySource,
    llm,
    env,
    forward,
    idempotencyStore,
    auditWriter,
    now,
  });
}

module.exports = { coverToolCall };
