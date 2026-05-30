'use strict';

// Wave 4 — LLM final safety review (veto-only, fail-closed).
// Runs ONLY after the deterministic floor returns allow. It can only block ("veto"); it can
// never widen a deterministic block into an allow. Any unavailability, error, timeout, or
// non-"safe"/malformed verdict results in a block.

const { buildLlmContext } = require('./sanitizeContext');
const { createAzureClientFromEnv } = require('./azureClient');

/**
 * @param {object} params
 * @param {object} params.context        sanitized context (from buildLlmContext)
 * @param {object} [params.client]       injectable client with async review(context) -> { verdict, reason }
 * @param {object} [params.env]          env for the default Azure client
 * @returns {Promise<{ ran: boolean, verdict: 'safe'|'unsafe'|'unavailable', reason_redacted: string, error_code?: string }>}
 */
async function finalSafetyReview({ context, client, env } = {}) {
  let reviewer = client;
  if (!reviewer) {
    try {
      reviewer = createAzureClientFromEnv(env || process.env);
    } catch (_err) {
      // No configured reviewer -> fail closed as unavailable.
      return { ran: false, verdict: 'unavailable', reason_redacted: 'reviewer unavailable', error_code: 'LLM_SAFETY_UNAVAILABLE' };
    }
  }

  let result;
  try {
    result = await reviewer.review(context);
  } catch (_err) {
    return { ran: true, verdict: 'unavailable', reason_redacted: 'reviewer error', error_code: 'LLM_SAFETY_UNAVAILABLE' };
  }

  const verdict = result && typeof result.verdict === 'string' ? result.verdict.toLowerCase() : null;
  const reason = result && typeof result.reason === 'string' ? result.reason.slice(0, 280) : '';

  if (verdict === 'safe') {
    return { ran: true, verdict: 'safe', reason_redacted: reason };
  }
  if (verdict === 'unsafe') {
    return { ran: true, verdict: 'unsafe', reason_redacted: reason, error_code: 'LLM_SAFETY_BLOCKED' };
  }
  // Malformed / ambiguous / empty -> fail closed.
  return { ran: true, verdict: 'unsafe', reason_redacted: 'ambiguous verdict', error_code: 'LLM_SAFETY_BLOCKED' };
}

module.exports = { finalSafetyReview, buildLlmContext };
