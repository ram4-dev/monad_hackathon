'use strict';

class PolicyCache {
  constructor({ ttlMs = 0, now = () => Date.now() } = {}) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.entries = new Map();
  }

  keyOf(config) {
    return `${config.chain_id}:${String(config.policy_contract_address).toLowerCase()}:${String(config.expected_schema_id).toLowerCase()}`;
  }

  get(config) {
    if (!this.ttlMs) return { status: 'disabled' };
    const entry = this.entries.get(this.keyOf(config));
    if (!entry) return { status: 'miss' };
    if (this.now() - entry.createdAt > this.ttlMs) return { status: 'stale' };
    return { status: 'hit', snapshot: entry.snapshot };
  }

  set(config, snapshot) {
    if (!this.ttlMs) return;
    this.entries.set(this.keyOf(config), { snapshot, createdAt: this.now() });
  }
}

module.exports = { PolicyCache };
