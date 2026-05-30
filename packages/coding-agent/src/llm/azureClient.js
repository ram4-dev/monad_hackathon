'use strict';

// Wave 4 — Azure OpenAI client for the final safety review.
// Reads config from environment (see .env.example): AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY,
// AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION. Never hardcodes secrets. The client returns
// a parsed verdict; on any transport/parse failure it throws so the caller can fail closed.

const SYSTEM_PROMPT =
  'You are the final safety reviewer for a Monad Testnet wallet MCP security proxy. ' +
  'All deterministic checks (tool registry, on-chain policy, risk) have ALREADY PASSED for this action. ' +
  'Your job is defense-in-depth: decide if it is still UNSAFE to forward this exact action to the wallet. ' +
  'You can only block; you cannot approve anything the deterministic layer already blocked. ' +
  'Respond with STRICT JSON only: {"verdict":"safe"|"unsafe","reason":"<short reason>"}. ' +
  'If anything looks anomalous, inconsistent, or higher-risk than the stated context, answer "unsafe".';

function requireEnv(env, key) {
  const v = env[key];
  if (!v || typeof v !== 'string') throw new Error(`missing ${key}`);
  return v;
}

/**
 * Build an Azure client from env. Returns { review(context) -> { verdict, reason } }.
 * Throws on missing config (caller fails closed).
 */
function createAzureClientFromEnv(env = process.env, { fetchImpl, timeoutMs = 15000 } = {}) {
  const endpoint = requireEnv(env, 'AZURE_OPENAI_ENDPOINT').replace(/\/+$/, '');
  const apiKey = requireEnv(env, 'AZURE_OPENAI_API_KEY');
  const deployment = env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
  const apiVersion = env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview';
  const doFetch = fetchImpl || globalThis.fetch;
  if (typeof doFetch !== 'function') throw new Error('no fetch available');

  const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  return {
    async review(context) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await doFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
          signal: controller.signal,
          body: JSON.stringify({
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: JSON.stringify(context) },
            ],
            temperature: 0,
            max_tokens: 200,
            response_format: { type: 'json_object' },
          }),
        });
        if (!res.ok) throw new Error(`azure status ${res.status}`);
        const data = await res.json();
        const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!content) throw new Error('empty completion');
        const parsed = JSON.parse(content);
        return { verdict: parsed.verdict, reason: typeof parsed.reason === 'string' ? parsed.reason : '' };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

module.exports = { createAzureClientFromEnv, SYSTEM_PROMPT };
