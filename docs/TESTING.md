# Compass Monad — How to test everything

Four layers: unit (JS), proxy (TS), contract (Solidity), and live end-to-end on Monad Testnet.

## Prerequisites

- Bun, Node 18+, Foundry (`forge`/`cast`), and a `.env` (git-ignored) — see the W6 runbook
  (`openspec/changes/wave-6-demo-hardening/runbook.md`) for the full `.env`.
- `~/.bun/bin` on PATH so the proxy can spawn `bunx wallet-agent@latest`:
  `export PATH="$HOME/.bun/bin:$PATH"`.

## 1. Unit tests — security logic (W2–W5)

```bash
cd packages/coding-agent && npm test       # node --test, 82 tests
```
Covers: tool-semantics registry/drift, on-chain policy read + fail-closed, risk checks, safe
errors, audit redaction (W2/W3); guarded-forward order + digest + idempotency + LLM veto (W4);
action coverage + consent gate + policy-contract lifecycle (W5).

## 2. Proxy tests — runtime (W1/W2 + wiring)

```bash
bun run typecheck      # tsc --noEmit, exit 0
bun test               # 109 tests across the proxy + bridges
```
Covers: stdio MCP server, empty/registry-gated tools/list, upstream adapter, meta-tools, safe
errors, audit; the guarded pipeline is feature-flagged so these stay deterministic.

## 3. Contract tests — CompassPolicy (W3)

```bash
cd packages/coding-agent/contracts && forge build && forge test   # 4 tests
```

## 4. Live end-to-end — Monad Testnet (W6, the full gate)

The policy contract is deployed at `0xf46fE939a947b6b300D9727ef94A2AbbCE07586C` (chain 10143).

Read the on-chain policy:
```bash
POLICY_CONTRACT_ADDRESS=0xf46fE939a947b6b300D9727ef94A2AbbCE07586C \
MONAD_RPC_URL=https://testnet-rpc.monad.xyz \
  node scripts/smoke-w6-read-policy.mjs
```

Full pipeline through the live proxy (reads on-chain policy + LLM veto + forwards to wallet-agent):
```bash
# .env must have AZURE_OPENAI_*, MONAD_RPC_URL, POLICY_CONTRACT_ADDRESS
bun run scripts/smoke-w6-e2e.mjs
```
Expected:
- `compass_status.upstream.connected = true` (wallet-agent, 42 tools); guarded pipeline enabled.
- `get_balance` (allowlisted on-chain, read-only): passes registry → on-chain policy `allow` → LLM
  `safe` → forwards to wallet-agent. (If wallet-agent has no chain/account set up, the upstream
  itself may return an error — the gate still passed; that is upstream state, not a Compass block.)
- `send_transaction` (write): blocked before the upstream.

To enable the guarded pipeline when running the proxy directly, set `POLICY_CONTRACT_ADDRESS` and
`MONAD_RPC_URL`; otherwise the proxy keeps the W1/W2 registry-gated behavior (no on-chain read).

## What "passing" proves

- Deterministic floor authoritative; LLM veto-only + fail-closed; on-chain policy fail-closed.
- Mutations require consent or are skipped; unlimited approvals + non-allowlisted recipients block.
- No secrets in audit/errors; idempotent broadcasts; per-user policy isolation.
