const test = require('node:test');
const assert = require('node:assert/strict');

const fixture = require('./fixtures/policy-snapshot.valid.fixture.json');
const { fetchPolicySnapshot } = require('../../src/policy-source');

function transport(overrides = {}) {
  const calls = [];
  const base = {
    async request({ method }) {
      calls.push(['request', method]);
      if (method === 'eth_chainId') return '0x279f';
      if (method === 'eth_getCode') return '0x60016000';
      if (method === 'eth_blockNumber') return '0x7b';
      throw new Error(`unexpected ${method}`);
    },
    async readContract({ functionName, args = [] }) {
      calls.push(['readContract', functionName, args]);
      switch (functionName) {
        case 'policyIdentity': return [fixture.policy_id, 1n, fixture.source.schema_id, 10143n, fixture.content_hash, 120n, false];
        case 'owner': return fixture.source.owner_address;
        case 'policyCaps': return [1000000000000000000n, 1000000n, 100000000000000000n, 0n];
        case 'policyFlags': return [true, false, true, false];
        case 'allowedToolCount': return 2n;
        case 'allowedTools': return args[0] === 0 ? [['0x' + '01'.repeat(32)], 1n] : [['0x' + '02'.repeat(32)], 2n];
        case 'allowedRecipientCount': return 1n;
        case 'allowedRecipients': return [fixture.allowed_recipients, 1n];
        case 'allowedTokenCount': return 1n;
        case 'allowedTokens': return [fixture.allowed_tokens, 1n];
        case 'spenderLimitCount': return 1n;
        case 'spenderLimits': return [[fixture.allowed_spenders[0]], 1n];
        case 'typedDataRuleCount': return 1n;
        case 'typedDataRules': return [[fixture.typed_data_rules[0]], 1n];
        default: throw new Error(`unexpected ${functionName}`);
      }
    },
    calls,
  };
  return Object.assign(base, overrides);
}

const config = {
  chain_id: 10143,
  rpc_url: 'mock://primary',
  rpc_fallback_urls: ['mock://fallback'],
  policy_contract_address: fixture.source.contract_address,
  expected_schema_id: fixture.source.schema_id,
  min_policy_version: '1',
  max_policy_version: null,
  read_timeout_ms: 50,
  retry_count_per_rpc: 0,
  retry_backoff_ms: 0,
};

test('mocked read-only ABI client fetches paginated policy snapshot without wallet/signer', async () => {
  const mock = transport();
  const result = await fetchPolicySnapshot({ config, transport: mock });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.source.chain_id, 10143);
  assert.deepEqual(result.snapshot.allowed_tool_keys, ['0x' + '01'.repeat(32), '0x' + '02'.repeat(32)]);
  assert.equal(mock.calls.some(([, fn]) => fn === 'sendTransaction' || fn === 'signTransaction'), false);
});

test('wrong chain, empty code, RPC error, and ABI decode failure fail closed', async () => {
  const wrongChain = await fetchPolicySnapshot({ config, transport: transport({ request: async ({ method }) => method === 'eth_chainId' ? '0x1' : '0x' }) });
  assert.equal(wrongChain.ok, false);
  assert.equal(wrongChain.error.code, 'POLICY_RPC_CHAIN_MISMATCH');

  const empty = await fetchPolicySnapshot({ config, transport: transport({ request: async ({ method }) => method === 'eth_chainId' ? '0x279f' : '0x' }) });
  assert.equal(empty.ok, false);
  assert.equal(empty.error.code, 'POLICY_CONTRACT_STALE_OR_DEAD');

  const rpc = await fetchPolicySnapshot({ config, transport: transport({ request: async () => { throw new Error('raw provider secret dump'); } }) });
  assert.equal(rpc.ok, false);
  assert.equal(rpc.error.code, 'POLICY_RPC_READ_FAILED');
  assert.doesNotMatch(JSON.stringify(rpc.error), /raw provider/);

  const abi = await fetchPolicySnapshot({ config, transport: transport({ readContract: async () => { throw new Error('decode stack trace'); } }) });
  assert.equal(abi.ok, false);
  assert.equal(abi.error.code, 'POLICY_ABI_DECODE_FAILED');
});
