const test = require('node:test');
const assert = require('node:assert/strict');

const { redactAuditMetadata } = require('../../src/audit');

test('policy source audit action keeps only allowlisted metadata', () => {
  const metadata = redactAuditMetadata('policy_source_read', {
    chain_id: 10143,
    policy_contract_address: '0x1111111111111111111111111111111111111111',
    policy_id: '0x' + 'aa'.repeat(32),
    policy_version: '1',
    schema_id: '0x' + 'bb'.repeat(32),
    content_hash: '0x' + 'cc'.repeat(32),
    rpc_url: 'https://secret.example/rpc',
    provider_payload: { secret: true },
  });
  assert.equal(metadata.chain_id, 10143);
  assert.equal(metadata.policy_version, '1');
  assert.equal(metadata.policy_id, '0x' + 'aa'.repeat(32));
  assert.equal(metadata.schema_id, '0x' + 'bb'.repeat(32));
  assert.equal(metadata.content_hash, '0x' + 'cc'.repeat(32));
  assert.equal(metadata.rpc_url, undefined);
  assert.equal(metadata.provider_payload, undefined);
});

test('policy update audit preserves public identifiers and excludes secrets', () => {
  const metadata = redactAuditMetadata('policy_update_observed', {
    chain_id: 10143,
    policy_contract_address: '0x1111111111111111111111111111111111111111',
    policy_id: '0x' + 'dd'.repeat(32),
    policy_version: '2',
    content_hash: '0x' + 'ee'.repeat(32),
    tx_hash: '0x' + 'ff'.repeat(32),
    owner_address: '0x2222222222222222222222222222222222222222',
    private_key: '0x' + '11'.repeat(32),
    rpc_url: 'https://secret.example/rpc',
  });
  assert.equal(metadata.policy_id, '0x' + 'dd'.repeat(32));
  assert.equal(metadata.content_hash, '0x' + 'ee'.repeat(32));
  assert.equal(metadata.tx_hash, '0x' + 'ff'.repeat(32));
  assert.equal(metadata.private_key, undefined);
  assert.equal(metadata.rpc_url, undefined);
});
