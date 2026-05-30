# Design: W0 Upstream + Monad PoC

## Status and intent

W0 is an evidence-gathering wave. It must not implement the Compass proxy, registry, policy engine, guarded forwarding, wallet logic, or host MCP configuration. Its output is a reviewable, sanitized evidence package proving what Wallet Agent and Monad Testnet can do today, or explicitly recording blockers before W2/W3/W4/W5 depend on those assumptions.

This design follows the local sources of truth in `docs/constitution.md`, `docs/development-waves.md`, and the W0 proposal/specs. The Wallet Agent MCP upstream for W0 is explicitly `https://github.com/wallet-agent/wallet-agent` and should be run via the documented `bunx wallet-agent@latest` command shape. Official Monad references are the proposal-cited URLs only:

- `https://docs.monad.xyz/llms.txt`
- `https://docs.monad.xyz/developer-essentials/testnets.md`
- `https://docs.monad.xyz/reference/json-rpc/overview.md`
- `https://docs.monad.xyz/developer-essentials/gas-pricing.md`
- `https://docs.monad.xyz/developer-essentials/transactions.md`
- `https://docs.monad.xyz/guides/monad-mcp.md`

## Design principles

1. **Evidence, not implementation:** W0 may add OpenSpec evidence artifacts only. No runtime/source-code changes are required or intended.
2. **Compass boundary preserved:** Wallet Agent is evaluated only as a future upstream behind Compass. W0 must not authorize host direct access to Wallet Agent.
3. **Secret-safe by construction:** W0 must not read `.env`, private keys, seed phrases, tokens, credentials, delegated payloads, secret-manager output, shell history, or secret-bearing config values.
4. **Command templates over values:** Evidence records command shapes, MCP method names, provider labels, and sanitized outputs. It never records secret values or raw credentialed URLs.
5. **Mutation blocked by default:** Any transfer, approval, broadcast, signature, or other external state mutation is skipped unless the user gives explicit, complete consent during apply for that exact action.
6. **Missing evidence is visible:** Every unavailable tool, ambiguous chain result, insufficient payload, RPC failure, consent skip, or no-bypass uncertainty becomes a blocker/limitation entry.

## Artifact layout

W0 apply should write artifacts under `openspec/changes/wave-0-upstream-monad-poc/evidence/`:

```text
openspec/changes/wave-0-upstream-monad-poc/
├── design.md
└── evidence/
    ├── README.md
    ├── manifest.json
    ├── commands/
    │   └── safe-command-log.md
    ├── contracts/
    │   ├── tool-schema-fixture.schema.json
    │   ├── schema-hash-manifest.schema.json
    │   ├── chain-validation.schema.json
    │   ├── rpc-provider-evidence.schema.json
    │   ├── read-evidence.schema.json
    │   ├── simulation-evidence.schema.json
    │   ├── consent-record.schema.json
    │   ├── blocker-entry.schema.json
    │   └── host-no-bypass.schema.json
    ├── upstream/
    │   ├── wallet-agent-tools-list.sanitized.json
    │   ├── schema-hash-manifest.json
    │   ├── registry-readiness.md
    │   └── tools/
    │       ├── add_custom_chain.schema.json
    │       ├── switch_chain.schema.json
    │       ├── get_wallet_info.schema.json
    │       ├── get_balance.schema.json
    │       ├── get_token_balance.schema.json
    │       ├── estimate_gas.schema.json
    │       ├── simulate_transaction.schema.json
    │       ├── dry_run_transaction.schema.json
    │       ├── send_transaction.schema.json
    │       ├── transfer_token.schema.json
    │       ├── approve_token.schema.json
    │       └── sign_typed_data.schema.json
    ├── chain/
    │   ├── monad-testnet-validation.md
    │   └── monad-testnet-validation.json
    ├── rpc/
    │   ├── provider-evidence.md
    │   └── provider-behavior.json
    ├── reads/
    │   ├── get_wallet_info.json
    │   ├── get_balance.json
    │   └── get_token_balance.json
    ├── simulation/
    │   ├── estimate_gas.json
    │   ├── simulate_transaction.json
    │   ├── dry_run_transaction.json
    │   └── payload-inspectability.md
    ├── consent/
    │   ├── mutation-consent-records.jsonl
    │   └── mutation-skips.jsonl
    ├── blockers/
    │   ├── blocker-register.md
    │   └── blocker-register.jsonl
    └── host/
        ├── no-bypass.md
        └── host-visible-tools.sanitized.json
```

Files for unavailable optional paths should still exist with `status: "skipped"`, `status: "unavailable"`, or a reference to a blocker id. This avoids silent success.

## Evidence contracts

All JSON artifacts should include `schema_version`, `capture_id`, `captured_at`, `sanitization`, and `evidence_refs` when applicable. Timestamps should be ISO-8601 UTC. Secret-bearing values must be omitted or replaced with placeholders such as `<redacted>`, `<provider-label>`, `<safe-testnet-account>`, or `<not-recorded>`.

### Tool schema fixture

Each `upstream/tools/*.schema.json` records one sanitized Wallet Agent tool descriptor:

```json
{
  "schema_version": "w0.tool_schema_fixture.v1",
  "upstream": "wallet_agent",
  "tool_name": "get_balance",
  "tool_present": true,
  "descriptor": {
    "name": "get_balance",
    "description": "<safe upstream description if retained>",
    "inputSchema": {}
  },
  "sanitization": {
    "redactions_applied": [],
    "secret_sources_read": false
  },
  "readiness": {
    "registry_ready": true,
    "missing_fields": [],
    "blocker_ids": []
  }
}
```

If a P0 candidate tool is missing, the file should set `tool_present: false`, omit `descriptor`, and point to a blocker entry.

### Schema hash manifest

`upstream/schema-hash-manifest.json` records provisional W2 registry inputs:

```json
{
  "schema_version": "w0.schema_hash_manifest.v1",
  "canonicalization": "canonical_json_v1",
  "hash_algorithm": "sha256",
  "entries": [
    {
      "tool_name": "get_balance",
      "fixture_path": "evidence/upstream/tools/get_balance.schema.json",
      "input_schema_hash": "sha256:<64 lowercase hex>",
      "upstream_schema_hash": "sha256:<64 lowercase hex>",
      "status": "captured"
    }
  ]
}
```

`canonical_json_v1` means: sanitize first, recursively sort object keys, preserve array order, encode as UTF-8 JSON with no insignificant whitespace, and hash the exact fixture data used for review. `input_schema_hash` is over the sanitized MCP `inputSchema` object. `upstream_schema_hash` is over the sanitized full tool descriptor retained in the fixture.

### Chain/RPC evidence

Chain validation records whether Wallet Agent can `add_custom_chain` and `switch_chain` to Monad Testnet `chain_id=10143` with native symbol `MON`, citing `https://docs.monad.xyz/developer-essentials/testnets.md`. Runtime chain confirmation must be tied to sanitized Wallet Agent output and/or safe RPC checks.

RPC provider evidence records a **provider label**, selected/fallback status, safe method observations, caveats, and missing observations. If an RPC URL contains a key or token, only the provider label is persisted. Notes should cite the proposal-listed Monad RPC/gas/transaction URLs when interpreting async send validation, pending transaction visibility, provisional `latest`, provider-specific `eth_call`/`eth_estimateGas` limits, full gas-limit charging, fee behavior, EIP-1559 compatibility, or unsupported type 3 blob transactions.

### Read evidence

Read evidence files cover `get_wallet_info`, `get_balance`, and optional `get_token_balance`. They must classify the call as read-only, tie it to `chain_id=10143` when available, and state whether the response includes enough safe chain/account context for future audit and registry planning.

### Simulation evidence

Simulation evidence covers `estimate_gas` and either `simulate_transaction` or `dry_run_transaction`. It must include sanitized candidate context, gas/simulation outcome, caveats, and a payload-inspectability judgment for future `candidate_tx_digest`, policy, risk, audit, and idempotency work. Any tool that may broadcast or mutate must be removed from simulation evidence and routed through the consent gate.

### Consent records and skips

`consent/mutation-consent-records.jsonl` is append-only for explicit user consent during apply. Each consent record must include:

- network and chain id (`Monad Testnet`, `10143`);
- provider label;
- safe account/source constraints;
- recipient/target;
- asset;
- maximum amount;
- maximum gas/cost boundary when applicable;
- action type;
- expected evidence to record;
- expiration/single-use boundary;
- statement that W0 consent is not a P0 product approval UI.

If any field is missing, consent is not granted. `consent/mutation-skips.jsonl` records skipped transfers, approvals, broadcasts, signatures, or writes with downstream impact.

### Blocker register

Each blocker entry includes:

```json
{
  "schema_version": "w0.blocker_entry.v1",
  "blocker_id": "W0-BLOCKER-001",
  "domain": "simulation",
  "summary": "Wallet Agent simulation payload is not inspectable",
  "status": "open",
  "severity": "hard_blocker",
  "impacted_waves": ["W4", "W5"],
  "impacted_capabilities": ["candidate_tx_digest", "guarded_forwarding"],
  "safe_cause": "Required fields were absent from sanitized output",
  "next_decision": "Add Compass RPC/viem fallback or create ADR",
  "adr_candidate": true,
  "evidence_refs": []
}
```

Required blocker categories include missing upstream payloads, unsupported P0 tools, schema instability, RPC failures, simulation insufficiency, consent-gated skips, host no-bypass uncertainty, and ADR candidates.

## Safe validation workflow for apply

1. **Initialize evidence workspace**
   - Create the evidence directory and empty blocker/consent files.
   - Record only tool versions, command templates, and provider labels that are safe to persist.
   - Do not inspect `.env`, shell history, credential stores, private-key files, or secret-manager outputs.

2. **Document official reference set**
   - Record the proposal-cited Monad URLs used for interpretation.
   - If current official docs cannot be checked during apply, record that limitation rather than inventing facts.

3. **Capture Wallet Agent discovery**
   - Run Wallet Agent as an upstream MCP candidate using `bunx wallet-agent@latest` through a safe MCP client/inspector.
   - Capture `tools/list`, sanitize it, split P0 candidate schemas into fixtures, and compute hashes.
   - Do not call private-key/keystore management tools.

4. **Validate Monad Testnet chain boundary**
   - Attempt `add_custom_chain` and `switch_chain` only for Monad Testnet `10143` with `MON` and an allowlisted/configured provider label.
   - Confirm active chain through safe Wallet Agent output and/or read-only RPC checks.
   - Any non-`10143` chain is out of scope and must not be accepted as P0 validation.

5. **Collect RPC provider evidence**
   - Select one demo provider label and at least one fallback label if available.
   - Measure only safe read-like checks: chain id, safe block/finality observations, latency/reliability notes, and gas-estimation behavior.
   - Persist sanitized observations and caveats, not raw credentialed URLs.

6. **Collect read-only Wallet Agent evidence**
   - Run `get_wallet_info` and `get_balance` only if a safe testnet account is available without exposing secrets.
   - Run `get_token_balance` only when a safe token/account combination is available.
   - If no safe account exists, record skipped/blocked evidence and downstream impact.

7. **Collect simulation evidence**
   - Run `estimate_gas` for a safe candidate action.
   - Run `simulate_transaction` or `dry_run_transaction` only if it is read-like and non-mutating.
   - Judge whether returned fields are sufficient for future digest/policy/audit/idempotency.

8. **Gate optional external mutations**
   - Default outcome is skip.
   - Before any transfer, approval, broadcast, signature, or write, pause and request explicit user consent with the complete consent fields above.
   - If consent is denied, incomplete, or unavailable, record a skip and blocker/limitation as needed.
   - If consent is granted, persist only safe public identifiers and sanitized status.

9. **Collect host no-bypass evidence**
   - Prefer a user-provided sanitized host MCP config excerpt or safe host-visible MCP tool listing.
   - Evidence must show Compass as the intended host-facing MCP surface and no direct Wallet Agent entry.
   - If host config cannot be inspected safely, record an operational limitation/blocker.
   - If direct Wallet Agent is visible to the demo host, W0 no-bypass fails until removed or isolated.

10. **Finalize review package**
    - Ensure every W0 spec requirement has either evidence or a blocker id.
    - Recompute schema hashes from fixtures and compare with the manifest.
    - Review the evidence directory for accidental secrets without reading any external secret source.
    - Confirm no implementation/source files were changed as part of W0 evidence collection.

## Command and evidence boundaries

Allowed command/evidence patterns:

- `bunx wallet-agent@latest` as the upstream MCP process for `https://github.com/wallet-agent/wallet-agent`, with command template recorded but no local cache paths or secrets.
- MCP `initialize`, `tools/list`, and `tools/call` for the W0 candidate tools, with sanitized arguments/results.
- RPC calls through a configured provider variable or operator-supplied endpoint, recording only `<provider-label>` or a public URL known to contain no secret.
- Safe RPC methods for evidence such as chain id, block/finality observations, fee/gas suggestions, `eth_call`, and `eth_estimateGas`, interpreted with proposal-cited Monad caveats.

Forbidden command/evidence patterns:

- `cat .env`, `printenv`, `env`, `echo $MONAD_RPC_URL`, shell history inspection, secret-manager reads, credential file reads, private-key imports/exports, mnemonic handling, or keystore unlock/import/remove tools.
- Persisting raw command transcripts before sanitization.
- Persisting secret-bearing provider URLs, account credentials, seed phrases, delegated payloads, tokens, API keys, stack traces with secrets, or unnecessary machine-specific paths.
- Running `eth_sendRawTransaction`, Wallet Agent transfer/approval/send/sign/write tools, or any broadcast-like operation without explicit W0 consent.

## Data flow

```text
Wallet Agent tools/list/read/sim outputs   Monad RPC safe checks   Host no-bypass evidence
                 |                                 |                       |
                 v                                 v                       v
        sanitize + redact                  sanitize + redact       sanitize + redact
                 |                                 |                       |
                 v                                 v                       v
      schema fixtures + hashes        chain/RPC/read/sim notes      host evidence
                 \___________________________   __________________________/
                                             v v
                                  blocker register
                                             |
                                             v
                         W2/W3/W4/W5 downstream handoff
```

Sanitization happens before persistence and before hashing. If sanitization removes information required to prove a requirement, the artifact must say so and link a blocker.

## Downstream handoff

- **W2 Tool semantics registry:** consumes `upstream/tools/*.schema.json`, `schema-hash-manifest.json`, and `registry-readiness.md` for `input_schema_hash`, `upstream_schema_hash`, tool presence, and schema drift tests.
- **W3 Policy/risk/audit:** consumes RPC/provider caveats, gas-estimation observations, read/simulation sufficiency, and blocker categories to tune deny-by-default policy and audit redaction requirements.
- **W4 Guarded forward pipeline:** consumes payload inspectability, simulation/dry-run behavior, digest field availability, idempotency implications, and ADR candidates.
- **W5 Monad action coverage:** consumes validated chain setup, read/simulation evidence, optional consented mutation evidence or skips, and unresolved hard blockers.
- **W6 Demo hardening:** consumes host no-bypass evidence and operational limitations for demo readiness.

## Review and judgment risks

- `wallet-agent@latest` can drift; evidence must record the resolved safe version metadata when available and treat hashes as provisional until W2 pins/reconciles them.
- Sanitization can over-redact required fields; over-redacted evidence should become a blocker rather than a false pass.
- Simulation sufficiency is a judgment call. If Wallet Agent does not expose candidate fields needed for digest/policy/audit/idempotency, mark an ADR candidate or hard blocker.
- Public RPC behavior can vary by provider, rate limit, and time. W0 observations are demo evidence, not production guarantees.
- Host no-bypass evidence may be operational rather than enforceable in W0. Direct Wallet Agent host access blocks demo readiness.
- A consented testnet mutation is irreversible at chain level even if low value; mutation evidence is optional and never required to claim read/simulation success.

## Rollback and recovery

- Revert or delete W0 OpenSpec evidence files if direction changes or evidence is incomplete.
- If a committed evidence artifact contains a secret, stop, remove it, purge/rotate according to maintainer policy, and do not continue using that artifact.
- If a provider choice proves unreliable, update `rpc/provider-evidence.md`, add a blocker or limitation, and choose another provider label; no code rollback is expected.
- If Wallet Agent schemas drift, regenerate sanitized fixtures and hashes, then mark W2 registry entries stale until reconciled.
- If an explicitly consented testnet mutation occurs, it cannot be rolled back on-chain. Stop further mutation, record sanitized outcome, and continue only with fresh consent or non-mutating evidence.
- Remove any local Wallet Agent or host MCP configuration created during apply; do not commit host-specific config.

## Validation checklist

Before W0 is considered complete:

- [ ] P0 Wallet Agent tools are captured or missing tools have blocker ids.
- [ ] `input_schema_hash` and `upstream_schema_hash` are present for captured tools.
- [ ] Monad Testnet `chain_id=10143` and `MON` evidence is recorded or blocked.
- [ ] Demo RPC provider and fallback/limitation notes are recorded.
- [ ] `get_wallet_info` and `get_balance` evidence exists or account dependency is blocked/skipped.
- [ ] `estimate_gas` and simulation/dry-run evidence exists or fallback/blocker is recorded.
- [ ] Candidate payload inspectability is judged for future digest/policy/audit/idempotency.
- [ ] Any mutation is either explicitly consented and sanitized or skipped by consent gate.
- [ ] Host no-bypass evidence exists or operational limitation is recorded.
- [ ] Blocker register covers every missing or ambiguous requirement.
- [ ] Evidence review finds no secrets and no implementation/source-code changes.
