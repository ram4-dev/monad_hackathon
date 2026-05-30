#!/usr/bin/env node
// W6 smoke: read the deployed CompassPolicy contract on Monad Testnet and print a sanitized
// summary, proving the on-chain policy source is live and readable. Uses foundry `cast` for ABI
// decoding (no extra deps). Reads POLICY_CONTRACT_ADDRESS + MONAD_RPC_URL from the environment.
//
// Usage:
//   POLICY_CONTRACT_ADDRESS=0x... MONAD_RPC_URL=https://testnet-rpc.monad.xyz \
//     node scripts/smoke-w6-read-policy.mjs

import { execFileSync } from 'node:child_process';

const RPC = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
const ADDR = process.env.POLICY_CONTRACT_ADDRESS;
const CAST = process.env.CAST_BIN || `${process.env.HOME}/.foundry/bin/cast`;

if (!ADDR) {
  console.error('POLICY_CONTRACT_ADDRESS is required');
  process.exit(2);
}

function cast(args) {
  return execFileSync(CAST, args, { encoding: 'utf8' }).trim();
}

try {
  const chainId = cast(['chain-id', '--rpc-url', RPC]);
  if (chainId !== '10143') {
    console.error(`FAIL: chain id is ${chainId}, expected 10143 (Monad Testnet)`);
    process.exit(1);
  }

  const code = cast(['code', ADDR, '--rpc-url', RPC]);
  if (!code || code === '0x') {
    console.error('FAIL: no contract code at POLICY_CONTRACT_ADDRESS (reset? wrong address?) — Compass fails closed (POLICY_CONTRACT_STALE_OR_DEAD)');
    process.exit(1);
  }

  const identity = cast([
    'call', ADDR,
    'policyIdentity()(bytes32,uint64,bytes32,uint256,bytes32,uint64,bool)',
    '--rpc-url', RPC,
  ]).split('\n').map((s) => s.trim());

  const toolCount = cast(['call', ADDR, 'allowedToolCount()(uint256)', '--rpc-url', RPC]);

  console.log('Compass on-chain policy — live read OK');
  console.log(JSON.stringify({
    chain_id: Number(chainId),
    contract_address: ADDR,
    code_present: true,
    policy_id: identity[0],
    policy_version: identity[1],
    schema_id: identity[2],
    identity_chain_id: identity[3],
    content_hash: identity[4],
    frozen: identity[6],
    allowed_tool_count: toolCount,
  }, null, 2));
  process.exit(0);
} catch (err) {
  console.error('FAIL: error reading policy contract (sanitized):', err && err.message ? err.message.split('\n')[0] : 'unknown');
  process.exit(1);
}
