'use strict';

// Wave 4 — idempotency store (constitution invariant 19, §12 PoC step 13).
// Ensures a broadcast/execution intent runs at most once: a retry with the same key reuses the
// stored result instead of forwarding again. In-memory by default; pluggable clock for tests.

class IdempotencyStore {
  constructor({ now } = {}) {
    this._map = new Map(); // key -> { status: 'pending'|'done'|'failed', result?, error?, at }
    this._now = typeof now === 'function' ? now : () => Date.now();
  }

  has(key) {
    return this._map.has(key);
  }

  get(key) {
    return this._map.get(key);
  }

  /**
   * Run `fn` at most once per key. Concurrent or later calls with the same key reuse the first
   * result and never invoke `fn` a second time.
   * @param {string} key
   * @param {() => Promise<any>} fn  the side-effecting forward (executed at most once)
   * @returns {Promise<{ reused: boolean, result: any }>}
   */
  async runOnce(key, fn) {
    if (!key || typeof key !== 'string') {
      throw new Error('idempotency key must be a non-empty string');
    }
    const existing = this._map.get(key);
    if (existing) {
      if (existing.status === 'pending') {
        const result = await existing.promise;
        return { reused: true, result };
      }
      if (existing.status === 'done') {
        return { reused: true, result: existing.result };
      }
      // failed: do not silently re-execute a broadcast; surface the prior failure.
      throw existing.error;
    }
    const entry = { status: 'pending', at: this._now() };
    entry.promise = Promise.resolve().then(fn);
    this._map.set(key, entry);
    try {
      const result = await entry.promise;
      this._map.set(key, { status: 'done', result, at: this._now() });
      return { reused: false, result };
    } catch (err) {
      this._map.set(key, { status: 'failed', error: err, at: this._now() });
      throw err;
    }
  }
}

module.exports = { IdempotencyStore };
