# Change: W0 Upstream + Monad PoC

## Intent

Establish the external evidence Compass needs before implementing the MCP security proxy. This W0 change validates Wallet Agent as the first upstream MCP candidate for Monad Testnet, captures the upstream tool schemas and hashes needed by the future semantics registry, records Monad runtime/RPC facts, and identifies blockers before W2/W4/W5 depend on real upstream behavior.

W0 is an evidence-gathering wave, not an implementation wave.

## Context and Sources

Local sources of truth:

- `docs/constitution.md`
- `docs/development-waves.md`
- `compass_product_spec_monad_mcp_proxy_v0.2.md`
- `openspec/config.yaml`

Wallet Agent upstream source for W0:

- `https://github.com/wallet-agent/wallet-agent`

Official Monad docs cited for W0 assumptions:

- `https://docs.monad.xyz/llms.txt`
- `https://docs.monad.xyz/developer-essentials/testnets.md`
- `https://docs.monad.xyz/reference/json-rpc/overview.md`
- `https://docs.monad.xyz/developer-essentials/gas-pricing.md`
- `https://docs.monad.xyz/developer-essentials/transactions.md`
- `https://docs.monad.xyz/guides/monad-mcp.md`

Known Monad facts to validate or account for during W0:

- Monad Testnet uses `chain_id=10143` and native currency `MON`.
- Public RPC candidates include `https://testnet-rpc.monad.xyz`, `https://rpc.ankr.com/monad_testnet`, and `https://rpc-testnet.monadinfra.com`.
- Monad RPC behavior differs from generic Ethereum assumptions: async send validation, no pending transaction query through `eth_getTransactionByHash`, provisional `latest`, provider-specific `eth_call` and `eth_estimateGas` limits, full gas limit charged, EIP-1559-compatible pricing, and unsupported type 3 blob transactions.

## Scope

### In Scope

- Install and run `bunx wallet-agent@latest` locally as the candidate upstream MCP from `https://github.com/wallet-agent/wallet-agent` during the later apply phase.
- Capture Wallet Agent `tools/list` output for P0 candidate tools as sanitized fixtures.
- Compute and record provisional `input_schema_hash` and `upstream_schema_hash` values for each captured P0 tool schema.
- Validate Wallet Agent custom-chain flow for Monad Testnet:
  - `add_custom_chain` with `chain_id=10143`, `MON`, and an allowlisted/configured RPC URL;
  - `switch_chain` to Monad Testnet.
- Validate read-only Wallet Agent behavior against Monad Testnet, including at least `get_wallet_info` and `get_balance` when a safe testnet account is available.
- Validate simulation/read-like behavior against Monad Testnet, including `estimate_gas` and either `simulate_transaction` or `dry_run_transaction`, or document a required Compass fallback if upstream simulation is insufficient.
- Select a demo `MONAD_RPC_URL` provider and record rate-limit, gas-estimation, latency, reliability, and finality caveats.
- Determine whether Wallet Agent exposes enough information for future Compass inspection, simulation, `candidate_tx_digest`, idempotency, policy, and audit requirements.
- Record blockers and ADR candidates before W4/W5 depend on missing capabilities.
- Confirm the intended demo boundary: the host MCP configuration should expose Compass only, not Wallet Agent directly.
- Treat any external state mutation, including a Monad Testnet transfer or approval attempt, as requiring explicit user consent during apply.

### Non-Goals

- No Compass proxy implementation.
- No tool semantics registry implementation.
- No policy, risk, digest, idempotency, audit, or guarded forwarding implementation.
- No direct Wallet Agent host configuration; Wallet Agent remains an upstream candidate behind Compass only.
- No UI, dashboard, browser approval flow, manual approval surface, or external approval workflow.
- No mainnet support and no multi-chain production behavior.
- No secrets, private keys, seed phrases, API tokens, delegated credentials, `.env` values, or secret-manager outputs.
- No production transfers, production token approvals, x402 payments, or delegated execution.
- No assumption that Wallet Agent or Monad runtime behavior is final until W0 evidence is captured and reviewed.

## Capabilities

These domains should be used by `sdd-spec` to infer detailed requirements and acceptance scenarios.

| Capability Domain                 | Type | Purpose                                                                                                                                                                        |
| --------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wallet-agent-upstream-discovery` | New  | Capture Wallet Agent from `https://github.com/wallet-agent/wallet-agent`, its `tools/list`, P0 tool inventory, schema fixtures, schema hashes, and schema drift/blocker notes. |
| `monad-testnet-chain-validation`  | New  | Prove runtime compatibility for Monad Testnet custom-chain setup, `chain_id=10143`, `MON`, and chain switching.                                                                |
| `monad-rpc-provider-evidence`     | New  | Choose and document the demo RPC provider, provider limits, gas/pricing caveats, finality caveats, and fallback candidates.                                                    |
| `wallet-agent-read-poc`           | New  | Validate read-only calls through Wallet Agent against Monad Testnet with sanitized evidence.                                                                                   |
| `wallet-agent-simulation-poc`     | New  | Validate `estimate_gas`, `simulate_transaction`, or `dry_run_transaction`, and identify when Compass must provide fallback simulation.                                         |
| `external-mutation-consent-gate`  | New  | Require explicit user consent before any testnet transfer, approval, or other state-mutating action during apply.                                                              |
| `upstream-blocker-register`       | New  | Record missing upstream payloads, unsupported tools, schema instability, RPC failures, or ADR candidates before implementation waves depend on them.                           |
| `mcp-host-no-bypass-evidence`     | New  | Document the no-bypass assumption that demo hosts should configure Compass only, not Wallet Agent directly.                                                                    |

## Affected Areas

- OpenSpec artifacts under `openspec/changes/wave-0-upstream-monad-poc/`.
- Planned W0 evidence artifacts such as sanitized schema fixtures, schema hash manifests, RPC/provider notes, command transcripts, and blocker notes.
- Future W2 registry work, which depends on real Wallet Agent schemas and hashes.
- Future W3 gas/RPC policy tuning, which depends on selected provider behavior and Monad RPC caveats.
- Future W4/W5 guarded forwarding and action coverage, which depend on real simulation/read/write constraints discovered in W0.
- External local tooling used only during apply: Wallet Agent, Monad Testnet RPC, and safe testnet accounts/faucet funds if the user explicitly consents.

No application source code is affected by this proposal.

## Safety and Consent Requirements

- Do not read `.env`, private keys, tokens, credentials, delegated payloads, secret-manager output, or any file likely to contain secrets.
- Do not log or persist secret values in evidence artifacts.
- Redact account-specific or machine-specific output unless it is explicitly needed and safe to keep.
- Any state-mutating action requires a separate explicit user consent step during apply, including testnet transfers, token approvals, contract writes, or broadcasts.
- Consent for a testnet mutation must identify the network, RPC provider, account/source constraints, recipient/target, asset, maximum amount, and expected evidence to record.
- If consent is not granted, mutation evidence is recorded as skipped by consent gate and any downstream dependency is marked as blocked or pending.

## Risks

- Wallet Agent is beta and may change schemas or behavior between captures.
- Wallet Agent may not expose enough transaction payload detail for Compass to build reliable digests, simulations, or policy decisions.
- Wallet Agent custom-chain support may not work end-to-end with Monad Testnet.
- Upstream simulation/dry-run may be missing, unreliable, or insufficient, requiring a future Compass RPC/viem fallback.
- Monad RPC behavior differs from generic Ethereum behavior and can affect broadcast confirmation, gas policy, pending transaction lookup, and finality assumptions.
- Public RPC providers may impose rate limits, non-obvious gas/`eth_call` limits, latency, or availability issues.
- Current repo scaffolding has no package manifest or test runner; W0 verification is evidence-based and `strict_tdd` remains false until implementation scaffolding exists.
- External state mutation on testnet is irreversible at the chain level even when value is minimal.
- Host no-bypass proof is partly operational in W0; implementation waves still need enforceable configuration guidance and tests.
- Evidence collection can accidentally capture sensitive local paths, addresses, or command output unless redaction is deliberate.

## Rollback

- Revert or delete OpenSpec W0 artifacts if the proposal direction changes.
- Discard regenerated schema fixtures, hashes, provider notes, and transcripts if they are incomplete or accidentally include sensitive data.
- Remove any local Wallet Agent or Compass PoC configuration created during apply; do not commit host-specific MCP configuration.
- Change the selected RPC provider by updating the evidence artifact and blocker notes; no source-code rollback is expected in W0.
- If an explicitly consented testnet transaction occurs, it cannot be rolled back on-chain. The rollback path is to stop further mutation, record the transaction evidence and limitation, and continue with fresh faucet funds or a new testnet account if needed.

## Success Criteria

W0 is successful when:

- Wallet Agent P0 tool schemas are captured as sanitized fixtures.
- Provisional `input_schema_hash` and `upstream_schema_hash` values are recorded for each captured P0 tool.
- Monad Testnet runtime evidence confirms `chain_id=10143` and `MON` for the selected RPC/provider path, or a blocker is recorded.
- A demo RPC provider is selected with documented caveats and fallback candidates.
- At least one read-only call and one gas/simulation/dry-run path are validated against Monad Testnet, or missing capabilities are documented as blockers/fallback requirements.
- Any state-mutating testnet action is either explicitly consented to and recorded safely, or explicitly skipped by the consent gate with downstream impact documented.
- Known upstream, RPC, schema, and no-bypass blockers are recorded before W2/W4/W5 depend on them.
- No secrets are read, logged, or persisted.
- No proxy/runtime implementation is introduced as part of W0.
