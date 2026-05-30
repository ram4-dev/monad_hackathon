'use strict';

const MASK_64 = (1n << 64n) - 1n;
const RHO = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];
const RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];

function rot(value, shift) {
  const n = BigInt(shift % 64);
  if (n === 0n) return value & MASK_64;
  return ((value << n) | (value >> (64n - n))) & MASK_64;
}

function keccakF(state) {
  for (const rc of RC) {
    const c = new Array(5).fill(0n);
    const d = new Array(5).fill(0n);
    for (let x = 0; x < 5; x++) c[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
    for (let x = 0; x < 5; x++) d[x] = c[(x + 4) % 5] ^ rot(c[(x + 1) % 5], 1);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) state[x + 5 * y] = (state[x + 5 * y] ^ d[x]) & MASK_64;
    const b = new Array(25).fill(0n);
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        b[y + 5 * ((2 * x + 3 * y) % 5)] = rot(state[x + 5 * y], RHO[x][y]);
      }
    }
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        state[x + 5 * y] = (b[x + 5 * y] ^ ((~b[((x + 1) % 5) + 5 * y]) & b[((x + 2) % 5) + 5 * y])) & MASK_64;
      }
    }
    state[0] = (state[0] ^ rc) & MASK_64;
  }
}

function keccak256(data) {
  const bytes = Buffer.isBuffer(data) ? Buffer.from(data) : Buffer.from(String(data), 'utf8');
  const rate = 136;
  const state = new Array(25).fill(0n);
  for (let offset = 0; offset < bytes.length; offset += rate) {
    const block = bytes.subarray(offset, Math.min(offset + rate, bytes.length));
    for (let i = 0; i < block.length; i++) state[Math.floor(i / 8)] ^= BigInt(block[i]) << (8n * BigInt(i % 8));
    if (block.length === rate) keccakF(state);
  }
  const rem = bytes.length % rate;
  state[Math.floor(rem / 8)] ^= 0x01n << (8n * BigInt(rem % 8));
  state[Math.floor((rate - 1) / 8)] ^= 0x80n << (8n * BigInt((rate - 1) % 8));
  keccakF(state);
  const out = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) out[i] = Number((state[Math.floor(i / 8)] >> (8n * BigInt(i % 8))) & 0xffn);
  return `0x${out.toString('hex')}`;
}

module.exports = { keccak256 };
