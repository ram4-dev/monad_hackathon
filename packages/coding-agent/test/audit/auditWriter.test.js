const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { appendAuditEvent, buildAuditEvent } = require('../../src/audit');

test('audit writer appends JSONL events in order', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'compass-audit-')), 'audit.jsonl');
  appendAuditEvent(file, buildAuditEvent({ action: 'policy_evaluated', result: 'success', metadata: { policy_version: '1' } }));
  appendAuditEvent(file, buildAuditEvent({ action: 'tool_call_blocked', result: 'blocked', metadata: { reason_codes: ['POLICY_TOOL_NOT_ALLOWED'] } }));
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(lines.length, 2);
  assert.equal(lines[0].action, 'policy_evaluated');
  assert.equal(lines[1].action, 'tool_call_blocked');
});

test('audit metadata is allowlisted and redacted before persistence', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'compass-audit-')), 'audit.jsonl');
  appendAuditEvent(file, buildAuditEvent({
    action: 'policy_source_read_failed',
    result: 'blocked',
    metadata: {
      chain_id: 10143,
      policy_contract_address: '0x1111111111111111111111111111111111111111',
      failure_code: 'POLICY_RPC_READ_FAILED',
      rpc_url: 'https://secret.example/rpc',
      stack: 'secret stack',
      raw_payload: { token: 'secret' },
    },
  }));
  const contents = fs.readFileSync(file, 'utf8');
  assert.match(contents, /POLICY_RPC_READ_FAILED/);
  assert.doesNotMatch(contents, /secret\.example|secret stack|raw_payload/);
});
