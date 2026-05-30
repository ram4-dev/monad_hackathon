# CompassPolicy Monad Testnet Contract

Wave 3 uses `CompassPolicy` as the on-chain source of truth for Compass policy on Monad Testnet.

## Official Monad docs refreshed for this implementation

- Docs index: https://docs.monad.xyz/llms.txt
- Monad Testnet facts/reset caveat: https://docs.monad.xyz/developer-essentials/testnets.md
- Foundry deployment and keystore guidance: https://docs.monad.xyz/guides/deploy-smart-contract/foundry.md
- Monad EVM/gas differences and Monad Foundry recommendation: https://docs.monad.xyz/developer-essentials/differences.md

Relevant facts used here:

- Monad Testnet chain id is `10143`; currency symbol is `MON`.
- Monad docs show Foundry configuration with `chain_id = 10143` for Monad Testnet.
- Monad docs recommend keystores over private keys for contract deployment.
- Monad docs note transactions are charged based on gas limit, so deploy/runbooks should avoid arbitrary oversized gas limits.
- Monad Testnet may reset; if the configured policy address has no code or wrong ABI after reset, Compass must fail closed until redeployed/configured.

## Local unit tests

```bash
cd packages/coding-agent/contracts
forge test
forge build
```

These commands are local only. They do not deploy to Monad Testnet.

## Live deploy gate

Do **not** deploy during normal Wave 3 apply. Live deployment requires explicit approval and public parameters:

- owner public address;
- approved initial tool keys, recipients, tokens, spender limits, typed-data rules;
- caps and manifest/content hash;
- RPC endpoint source and explorer/verification target;
- secret-safe account/keystore workflow.

## Secret-safe deployment template

Use a Foundry account/keystore or other prompt-based secure signer. Do not paste or commit private keys, keystore contents, passwords, API-key-bearing RPC URLs, raw signed transactions, or `.env` files.

Example template with placeholders only:

```bash
cd packages/coding-agent/contracts
forge build
# Verify chain id out-of-band is Monad Testnet (10143 / 0x279f) before broadcast.
# Use a local keystore/account name prepared outside the repo.
forge script script/DeployCompassPolicy.s.sol \
  --rpc-url '<MONAD_TESTNET_RPC_URL>' \
  --account '<FOUNDRY_ACCOUNT_NAME>' \
  --broadcast
```

If verification tooling is available for the chosen Monad Testnet explorer, submit source verification and record only public references in OpenSpec evidence.

## Evidence checklist

After an approved deploy, write sanitized JSON evidence under:

- `openspec/changes/wave-3-policy-risk-audit-foundation/evidence/deployments/monad-testnet/`
- `packages/coding-agent/deployments/monad-testnet/compass-policy.current.json`

Required evidence fields: contract address, chain id `10143`, tx hash, block, ABI/source hashes, owner public address, policy id/version/content hash, post-deploy read checks, verification status/reference, and safety booleans confirming no secret material was logged.

## Reset/redeploy procedure

If Monad Testnet resets or `eth_getCode(policy_address)` returns empty, Compass blocks with `POLICY_CONTRACT_STALE_OR_DEAD`. Redeploy the immutable contract, capture new evidence, update runtime config/current deployment artifact, and preserve old audit logs tied to the old address/version.
