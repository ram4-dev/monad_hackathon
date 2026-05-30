'use strict';

const SECRET_KEY_RE = /(secret|token|password|private[_-]?key|keystore|credential|rpc_?url|api[_-]?key|stack|raw|payload)/i;
const URL_SECRET_RE = /^https?:\/\//i;
const PRIVATE_HEX_RE = /^0x[a-fA-F0-9]{64}$/;

function redactValue(value, depth = 0) {
  if (depth > 8) return '[redacted]';
  if (value instanceof Error) return '[redacted]';
  if (typeof value === 'string') {
    if (URL_SECRET_RE.test(value) || PRIVATE_HEX_RE.test(value)) return '[redacted]';
    return value;
  }
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, depth + 1));
  if (value && typeof value === 'object') {
    const redacted = {};
    for (const [key, entry] of Object.entries(value)) {
      redacted[key] = SECRET_KEY_RE.test(key) ? '[redacted]' : redactValue(entry, depth + 1);
    }
    return redacted;
  }
  return value;
}

module.exports = { redactValue };
