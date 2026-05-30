# Compass Monad — Operations Runbook (W6)

Reproducible setup for the demo on Monad Testnet (chain `10143`). No secrets are committed; all
credentials come from a local `.env` (git-ignored).

## 0. Prerequisites

- [Bun](https://bun.sh) (root proxy + tests), Node 18+ (coding-agent `node --test`).
- [Foundry](https://book.getfoundry.sh) (`forge`, `cast`) for the policy contract.
- A funded Monad Testnet account (faucet MON) for deployment. Monad Testnet may reset; if it does,
  redeploy and update the deployment artifact.

## 1. Environment (`.env`, git-ignored)

```bash
# Monad
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAIN_ID=10143
# Deployer (testnet, throwaway). Used only by forge broadcast; never logged/committed.
MONAD_DEPLOYER_PRIVATE_KEY=0x...
# Demo policy allowlists (finite transfer/approve demo)
COMPASS_DEMO_TOKEN=0x...
COMPASS_DEMO_RECIPIENT=0x...
COMPASS_DEMO_SPENDER=0x...
COMPASS_DEMO_APPROVE_MAX=1000000
COMPASS_DEMO_MAX_ERC20=1000000
COMPASS_DEMO_MAX_NATIVE=1000000000000000000
COMPASS_DEMO_MAX_GAS=100000000000000000
# Azure OpenAI (W4 final safety review)
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-12-01-preview
# Compass policy source binding (after deploy)
POLICY_CONTRACT_ADDRESS=0x...   # printed by the deploy step
```

## 2. Build + unit tests (no network)

```bash
# root proxy (W1) + bridges
bun install && bun run typecheck && bun test
# coding-agent (W2-W5)
cd packages/coding-agent && npm test
# policy contract
cd packages/coding-agent/contracts && forge build && forge test
```

## 3. Deploy the policy contract (Monad Testnet)

Verify chain id out-of-band first: `cast chain-id --rpc-url "$MONAD_RPC_URL"` must print `10143`.

```bash
cd packages/coding-agent/contracts
# Loads .env vars; broadcasts the demo policy. Owner = deployer address.
forge script script/DeployCompassPolicyLive.s.sol:DeployCompassPolicyLive \
  --rpc-url "$MONAD_RPC_URL" \
  --private-key "$MONAD_DEPLOYER_PRIVATE_KEY" \
  --broadcast
```

Record the deployed address into `POLICY_CONTRACT_ADDRESS` and the deployment artifact
`packages/coding-agent/deployments/monad-testnet/compass-policy.current.json` (sanitized fields
only: address, chain id, tx hash, block, owner, policy id/version/content hash, read checks).

## 4. Verify the on-chain policy (read-back)

```bash
cast call "$POLICY_CONTRACT_ADDRESS" "policyIdentity()(bytes32,uint64,bytes32,uint256,bytes32,uint64,bool)" \
  --rpc-url "$MONAD_RPC_URL"
# Expect: policyId, version=1, schemaId=keccak256("compass.policy.v1"), chainId=10143, contentHash, ...
node scripts/smoke-w6-read-policy.mjs   # reads via RPC and prints a sanitized summary
```

## 5. Monad RPC caveats (W0 evidence)

- Send validation is async — a tx hash does not imply inclusion; rely on receipts + idempotency.
- Do not depend on pending-tx lookup (`eth_getTransactionByHash`) for pending state.
- `latest` is provisional; use `finalized` for finality-sensitive reads.
- Full gas limit is charged; avoid oversized gas limits.
- Public RPC has rate limits (W0: QuickNode ~50 rps; Ankr 300/10s). Use a provider URL if needed.

## 6. Reset / redeploy

If `cast code "$POLICY_CONTRACT_ADDRESS"` is empty (testnet reset), Compass fails closed with
`POLICY_CONTRACT_STALE_OR_DEAD`. Redeploy (step 3), update the artifact, preserve prior audit logs.
