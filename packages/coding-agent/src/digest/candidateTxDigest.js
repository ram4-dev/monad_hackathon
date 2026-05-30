'use strict';

// Wave 4 — canonical candidate transaction digest (constitution §8).
// Builds a deterministic keccak256 digest over the fields that define the effect/cost of a
// transaction, signature, or broadcast, so the reviewed payload matches what is executed.

const { keccak256 } = require('../policy/keccak256');

const DIGEST_VERSION = 'compass-candidate-v1';

// Canonical field order. Only fields present in the input are included in the digest, and the
// included field names are reported as covered_fields.
const DIGEST_FIELDS = Object.freeze([
  'chain_id',
  'account',
  'to',
  'value',
  'data',
  'tool_name',
  'args',
  'token',
  'spender',
  'amount',
  'max_fee_per_gas_wei',
  'max_priority_fee_per_gas_wei',
  'gas_limit',
  'estimated_gas_cost_wei',
]);

// Deterministic JSON: object keys sorted recursively, arrays preserve order, no whitespace.
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value === undefined ? null : value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`);
  return `{${parts.join(',')}}`;
}

function normalizeScalar(v) {
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'string') return v.toLowerCase ? v : v;
  return v;
}

/**
 * @param {object} input  candidate transaction fields (any subset of DIGEST_FIELDS)
 * @returns {{ digest: string, covered_fields: string[], digest_version: string }}
 */
function buildCandidateTxDigest(input = {}) {
  const ordered = {};
  const covered = [];
  for (const field of DIGEST_FIELDS) {
    const value = input[field];
    if (value === undefined || value === null) continue;
    // Lowercase address-like / hex scalars for stability; leave structured args as-is.
    if (typeof value === 'string') {
      ordered[field] = /^0x[0-9a-fA-F]+$/.test(value) ? value.toLowerCase() : value;
    } else if (typeof value === 'bigint') {
      ordered[field] = value.toString();
    } else {
      ordered[field] = value;
    }
    covered.push(field);
  }
  const payload = canonicalJson({ digest_version: DIGEST_VERSION, fields: ordered });
  return {
    digest: keccak256(payload),
    covered_fields: covered,
    digest_version: DIGEST_VERSION,
  };
}

module.exports = { buildCandidateTxDigest, canonicalJson, normalizeScalar, DIGEST_VERSION, DIGEST_FIELDS };
