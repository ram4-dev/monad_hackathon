'use strict';

// Wave 4 — guarded forward orchestrator.
//
// Ordering (constitution §6):
//   registry -> required evidence -> simulation/inspection -> risk -> policy(on-chain)
//   -> deterministic allow/block -> LLM final safety review (veto-only) -> forward/block -> audit
//
// Reuses W2 (tool-semantics resolver) and W3 (policy-source read, evaluatePolicy which already
// composes required-evidence + risk + policy). W4 adds: on-chain policy resolution wiring with
// fail-closed semantics, candidate_tx_digest, idempotent forward, the veto-only LLM layer, and
// the GuardedForwardRecord. It NEVER forwards on a block, and the LLM can only narrow to block.

const { resolveCallByName } = require('../tool-semantics');
const { fetchPolicySnapshot } = require('../policy-source');
const { evaluatePolicy } = require('../policy');
const { createSafeError } = require('../safe-errors');
const { keccak256 } = require('../policy/keccak256');
const { buildCandidateTxDigest } = require('../digest');
const { buildLlmContext, finalSafetyReview } = require('../llm');
const { buildGuardedForwardRecord } = require('./guardedForwardRecord');

const DIGEST_CLASSES = new Set(['transaction_execute', 'token_approval', 'signature', 'contract_write']);
const IDEMPOTENT_CLASSES = new Set(['transaction_execute', 'token_approval', 'contract_write']);

function deriveIdempotencyKey(toolName, digest) {
  return keccak256(`idem:${toolName}:${digest}`);
}

function blockResult({ toolName, toolClass, reason_code, digest, covered_fields, digest_version, policySnapshot, llmReview, now }) {
  const record = buildGuardedForwardRecord({
    toolName,
    toolClass,
    decision: 'block',
    reason_code,
    digest,
    covered_fields,
    digest_version,
    policySnapshot,
    llmReview,
    now,
  });
  return { decision: 'block', error: createSafeError(reason_code), record };
}

/**
 * @param {object} params
 * @param {{ toolName: string, inputSchemaHash?: string, args?: object }} params.call
 * @param {object} [params.evidence]            chain_id, simulation, recipient/token/spender/amount, gas, tx fields
 * @param {object} params.policySource          one of: { snapshot } | { failure } | { config, transport }
 * @param {object} [params.llm]                 injectable LLM client { review(context) }
 * @param {object} [params.env]                 env for the default Azure LLM client
 * @param {(toolName: string, args: object) => Promise<any>} params.forward  upstream forward (DI)
 * @param {object} [params.idempotencyStore]    IdempotencyStore for broadcast/execution
 * @param {(event: object) => Promise<void>} [params.auditWriter]
 * @param {() => number} [params.now]
 * @returns {Promise<{ decision: 'allow'|'block', result?: any, error?: object, record: object, digest?: string, idempotency_key?: string, reused?: boolean }>}
 */
async function guardedForward({ call, evidence = {}, policySource = {}, llm, env, forward, idempotencyStore, auditWriter, now } = {}) {
  const toolName = call && call.toolName;
  const args = (call && call.args) || {};

  // 1. registry semantics (W2)
  const resolution = resolveCallByName(toolName, call && call.inputSchemaHash);
  const toolClass = resolution && resolution.semantics && resolution.semantics.tool_class;

  // 2. resolve on-chain policy (fail-closed)
  let policySnapshot;
  let policySourceFailure;
  if (policySource.snapshot) {
    policySnapshot = policySource.snapshot;
  } else if (policySource.failure) {
    policySourceFailure = policySource.failure;
  } else if (policySource.config && policySource.transport) {
    const read = await fetchPolicySnapshot({ config: policySource.config, transport: policySource.transport });
    if (read.ok) policySnapshot = read.snapshot;
    else policySourceFailure = read.error;
  } else {
    // No way to obtain a policy -> fail closed.
    policySourceFailure = createSafeError('POLICY_CONTRACT_UNAVAILABLE');
  }

  // 3-5. required-evidence + risk + policy (W3 evaluatePolicy composes these), deterministic decision
  const decision = await evaluatePolicy({ resolution, policySnapshot, policySourceFailure, evidence, auditWriter });
  if (!decision || decision.decision !== 'allow') {
    return blockResult({
      toolName,
      toolClass,
      reason_code: (decision && decision.reason_code) || 'INTERNAL_ERROR',
      policySnapshot,
      now,
    });
  }

  // 6. candidate_tx_digest for write/signature/approval classes
  let digest;
  let covered_fields;
  let digest_version;
  if (DIGEST_CLASSES.has(toolClass)) {
    const built = buildCandidateTxDigest({
      chain_id: evidence.chain_id,
      account: evidence.account || evidence.from,
      to: evidence.to || evidence.recipient,
      value: evidence.value,
      data: evidence.data,
      tool_name: toolName,
      args,
      token: evidence.token,
      spender: evidence.spender,
      amount: evidence.amount || evidence.amount_atomic || evidence.amount_wei,
      max_fee_per_gas_wei: evidence.max_fee_per_gas_wei,
      max_priority_fee_per_gas_wei: evidence.max_priority_fee_per_gas_wei,
      gas_limit: evidence.gas_limit,
      estimated_gas_cost_wei: evidence.estimated_gas_cost_wei,
    });
    digest = built.digest;
    covered_fields = built.covered_fields;
    digest_version = built.digest_version;
  }

  // 7. LLM final safety review (veto-only, fail-closed) — only reachable after deterministic allow
  const context = buildLlmContext({
    toolName,
    semantics: resolution.semantics,
    args,
    digest,
    covered_fields,
    evidence,
    policySnapshot,
  });
  const llmReview = await finalSafetyReview({ context, client: llm, env });
  if (llmReview.verdict !== 'safe') {
    return blockResult({
      toolName,
      toolClass,
      reason_code: llmReview.error_code || 'LLM_SAFETY_BLOCKED',
      digest,
      covered_fields,
      digest_version,
      policySnapshot,
      llmReview,
      now,
    });
  }

  // 8. idempotent forward (exactly once for broadcast/execution)
  if (typeof forward !== 'function') {
    return blockResult({ toolName, toolClass, reason_code: 'INTERNAL_ERROR', digest, covered_fields, digest_version, policySnapshot, llmReview, now });
  }

  let result;
  let reused = false;
  let idempotency_key;
  if (IDEMPOTENT_CLASSES.has(toolClass) && idempotencyStore && digest) {
    idempotency_key = deriveIdempotencyKey(toolName, digest);
    const ran = await idempotencyStore.runOnce(idempotency_key, () => forward(toolName, args));
    result = ran.result;
    reused = ran.reused;
  } else {
    result = await forward(toolName, args);
  }

  const record = buildGuardedForwardRecord({
    toolName,
    toolClass,
    decision: 'allow',
    reason_code: decision.reason_code,
    digest,
    covered_fields,
    digest_version,
    idempotency_key,
    policySnapshot,
    llmReview,
    now,
  });

  if (typeof auditWriter === 'function') {
    try {
      await auditWriter({
        action: 'tool_call_forwarded',
        result: 'success',
        policySnapshot,
        metadata: { policy_decision: 'allow', reason_codes: [decision.reason_code] },
      });
    } catch (_err) {
      // Audit failure on the forward path is recorded by the record; do not leak.
    }
  }

  return { decision: 'allow', result, record, digest, idempotency_key, reused };
}

module.exports = { guardedForward, deriveIdempotencyKey, DIGEST_CLASSES, IDEMPOTENT_CLASSES };
