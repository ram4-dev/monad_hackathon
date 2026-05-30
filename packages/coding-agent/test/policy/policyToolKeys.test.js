const test = require('node:test');
const assert = require('node:assert/strict');
const { toolKey } = require('../../src/policy');

const expected = {
  get_balance: '0x3b9e11d48192e4333233c7eb19d10ad67c362bb28580c604d67884c85da39695',
  send_transaction: '0x83427d2bfd20cff280c206c9779035545297cda55c4d0ff78a5b27c80db08ef5',
  approve_token: '0x0198775c2a9614eed591b305eb6ddc76a6b7d3ff3c508f047dd78fc89a2f5e72',
};

test('tool keys are deterministic Ethereum keccak256 hashes of UTF-8 names', () => {
  for (const [name, key] of Object.entries(expected)) {
    assert.equal(toolKey(name), key);
  }
});
