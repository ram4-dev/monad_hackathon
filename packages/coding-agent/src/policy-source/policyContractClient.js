'use strict';

const { normalizePolicySnapshot } = require('./policySnapshot');
const { POLICY_SOURCE_ERROR_CODES, policySourceError } = require('./policySourceErrors');
const { MONAD_TESTNET_CHAIN_ID } = require('./policySourceConfig');

function asNumber(value) {
  return typeof value === 'bigint' ? Number(value) : Number(value);
}
function asDecimal(value) {
  return typeof value === 'bigint' ? value.toString(10) : String(value);
}
function isEmptyCode(value) {
  return !value || value === '0x' || value === '0X';
}
function fail(code, reason) {
  return { ok: false, error: policySourceError(code, { reason }) };
}

async function requestWithFailureMap(fn, code) {
  try {
    return { ok: true, value: await fn() };
  } catch {
    return fail(code, 'read_failed');
  }
}

async function readPaged(transport, countName, pageName, pageSize = 64) {
  const count = asNumber(await transport.readContract({ functionName: countName, args: [] }));
  const values = [];
  let cursor = 0;
  while (cursor < count) {
    const [page, nextCursor] = await transport.readContract({ functionName: pageName, args: [cursor, Math.min(pageSize, count - cursor)] });
    values.push(...page);
    const next = asNumber(nextCursor);
    if (next <= cursor && count > cursor) throw new Error('pagination_stalled');
    cursor = next;
  }
  return values;
}

async function fetchPolicySnapshot({ config, transport }) {
  if (!transport || typeof transport.request !== 'function' || typeof transport.readContract !== 'function') {
    return fail(POLICY_SOURCE_ERROR_CODES.POLICY_RPC_READ_FAILED, 'missing_transport');
  }

  const chain = await requestWithFailureMap(() => transport.request({ method: 'eth_chainId', params: [] }), POLICY_SOURCE_ERROR_CODES.POLICY_RPC_READ_FAILED);
  if (!chain.ok) return chain;
  if (Number.parseInt(chain.value, 16) !== MONAD_TESTNET_CHAIN_ID) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_RPC_CHAIN_MISMATCH, 'wrong_rpc_chain');

  const code = await requestWithFailureMap(() => transport.request({ method: 'eth_getCode', params: [config.policy_contract_address, 'latest'] }), POLICY_SOURCE_ERROR_CODES.POLICY_RPC_READ_FAILED);
  if (!code.ok) return code;
  if (isEmptyCode(code.value)) return fail(POLICY_SOURCE_ERROR_CODES.POLICY_CONTRACT_STALE_OR_DEAD, 'empty_code');

  try {
    const [policyId, version, schemaId, deploymentChainId, contentHash, lastUpdatedBlock, frozen] = await transport.readContract({ functionName: 'policyIdentity', args: [] });
    const owner = await transport.readContract({ functionName: 'owner', args: [] });
    const caps = await transport.readContract({ functionName: 'policyCaps', args: [] });
    const flags = await transport.readContract({ functionName: 'policyFlags', args: [] });
    const [allowedToolKeys, allowedRecipients, allowedTokens, allowedSpenders, typedDataRules] = await Promise.all([
      readPaged(transport, 'allowedToolCount', 'allowedTools'),
      readPaged(transport, 'allowedRecipientCount', 'allowedRecipients'),
      readPaged(transport, 'allowedTokenCount', 'allowedTokens'),
      readPaged(transport, 'spenderLimitCount', 'spenderLimits'),
      readPaged(transport, 'typedDataRuleCount', 'typedDataRules'),
    ]);
    const block = await requestWithFailureMap(() => transport.request({ method: 'eth_blockNumber', params: [] }), POLICY_SOURCE_ERROR_CODES.POLICY_RPC_READ_FAILED);
    const raw = {
      source: {
        chain_id: MONAD_TESTNET_CHAIN_ID,
        network_name: 'Monad Testnet',
        contract_address: config.policy_contract_address,
        schema_id: schemaId,
        deployment_chain_id: asNumber(deploymentChainId),
        owner_address: owner,
        read_status: 'success',
        read_block_number: block.ok ? String(Number.parseInt(block.value, 16)) : '0',
        last_updated_block: asDecimal(lastUpdatedBlock),
      },
      policy_id: policyId,
      policy_version: asDecimal(version),
      content_hash: contentHash,
      flags: {
        block_unlimited_token_approvals: Boolean(flags[0]),
        allow_unknown_tools: Boolean(flags[1]),
        require_simulation_for_writes: Boolean(flags[2]),
        frozen: Boolean(frozen || flags[3]),
      },
      caps: {
        max_native_transfer_wei: asDecimal(caps[0]),
        max_erc20_transfer_atomic: asDecimal(caps[1]),
        max_gas_cost_wei: asDecimal(caps[2]),
        max_fee_per_gas_wei: asDecimal(caps[3]),
      },
      allowed_tool_keys: allowedToolKeys,
      allowed_recipients: allowedRecipients,
      allowed_tokens: allowedTokens,
      allowed_spenders: allowedSpenders.map((entry) => ({
        token: entry.token || entry[0],
        spender: entry.spender || entry[1],
        max_amount_atomic: asDecimal(entry.maxAmountAtomic == null ? (entry.max_amount_atomic == null ? entry[2] : entry.max_amount_atomic) : entry.maxAmountAtomic),
        enabled: Boolean(entry.enabled == null ? entry[3] : entry.enabled),
      })),
      typed_data_rules: typedDataRules.map((entry) => ({
        domain_separator_hash: entry.domainSeparatorHash || entry.domain_separator_hash || entry[0],
        verifying_contract: entry.verifyingContract || entry.verifying_contract || entry[1],
        primary_type_hash: entry.primaryTypeHash || entry.primary_type_hash || entry[2],
        enabled: Boolean(entry.enabled == null ? entry[3] : entry.enabled),
      })),
    };
    const normalized = normalizePolicySnapshot(raw, config);
    if (!normalized.ok) return normalized;
    return { ok: true, snapshot: normalized.snapshot };
  } catch {
    return fail(POLICY_SOURCE_ERROR_CODES.POLICY_ABI_DECODE_FAILED, 'abi_decode');
  }
}

module.exports = { fetchPolicySnapshot };
