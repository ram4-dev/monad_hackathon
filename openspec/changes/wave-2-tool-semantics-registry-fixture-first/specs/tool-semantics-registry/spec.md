# Tool Semantics Registry Specification

## Purpose

Define the fixture-first, deterministic `ToolSemantics` registry that Compass uses to understand Wallet Agent tools before any policy evaluation or runtime forwarding. This Wave 2 domain does not implement Wave 1 MCP proxy/runtime behavior.

## Requirements

### Requirement: ToolSemantics Contract

The system MUST define a versioned `ToolSemantics` contract for each exposable Wallet Agent tool. Each registry entry MUST include `registry_version`, `upstream`, `tool_name`, `exposed_name`, `upstream_schema_hash`, `input_schema_hash`, `tool_class`, `state_effect`, `default_decision`, `requires_simulation`, `required_fields`, `required_evidence`, and `policy_checks`. The registry MUST NOT rely on upstream natural-language descriptions or LLM interpretation as the authority for safety-critical semantics.

#### Scenario: Registry entry has required fields

- GIVEN a captured Wallet Agent tool is eligible for Wave 2 mapping
- WHEN the registry entry is reviewed
- THEN every required `ToolSemantics` field MUST be present
- AND `upstream` MUST equal `wallet_agent`
- AND `tool_name` and `exposed_name` MUST match the upstream tool name unless a future accepted spec says otherwise
- AND `default_decision` MUST be either `allow` or `block`
- AND safety-critical behavior MUST be derived from registry fields, not from the upstream description text

#### Scenario: Registry version is explicit

- GIVEN a registry entry exists
- WHEN W3 or W4 consumes it
- THEN the entry MUST expose a stable `registry_version`
- AND consumers MUST be able to detect which registry version produced the semantics decision

### Requirement: W0 Fixture and Schema Hash Source of Truth

The system MUST use W0 sanitized Wallet Agent `tools/list` fixtures and `schema-hash-manifest.json` as the source of truth for Wave 2 captured tool names and schema hashes. The system MUST NOT call live Wallet Agent, read secrets, or mutate chain state as part of Wave 2 spec fulfillment.

#### Scenario: Captured hash is copied from W0 evidence

- GIVEN `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/schema-hash-manifest.json` contains a captured entry
- WHEN a Wave 2 registry entry is created for that tool
- THEN `input_schema_hash` MUST equal the W0 manifest value
- AND `upstream_schema_hash` MUST equal the W0 manifest value
- AND the entry MUST cite or preserve the W0 fixture path used for compatibility review

#### Scenario: No fake hash for absent tool

- GIVEN a tool is absent from W0 live `tools/list`
- WHEN Wave 2 registry artifacts are produced
- THEN the registry MUST NOT invent `input_schema_hash` or `upstream_schema_hash`
- AND the absence MUST be represented as unsupported or blocked with its blocker reference

### Requirement: Captured P0 Tool Mappings

The system MUST provide deterministic registry mappings for every W0-captured P0 Wallet Agent tool. Each mapping MUST preserve the W0 schema hashes, assign exactly one `tool_class`, assign one `state_effect`, declare `requires_simulation`, and name required evidence and policy checks for downstream W3/W4 use.

| Tool | input_schema_hash | upstream_schema_hash | tool_class | state_effect | default_decision | requires_simulation | minimum required_fields | minimum required_evidence | minimum policy_checks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `add_custom_chain` | `sha256:79f402dcf29282290da7e0e7ea71c44c131c2088c0b13b8292ef8cd56ca585d6` | `sha256:dbbdc61674a3b17a392f8a783eeec56e49d621155f5b602031501f41a0107843` | `chain_management` | `local_chain_config` | `block` | `false` | `chainId`, `name`, `rpcUrl`, `nativeCurrency.name`, `nativeCurrency.symbol`, `nativeCurrency.decimals` | Monad Testnet allowlist evidence, sanitized RPC label or env-reference evidence | `chain_allowlist`, `rpc_allowlist_or_env`, `monad_testnet_only` |
| `switch_chain` | `sha256:9f922f5ce1caaf41d5f57511a1f06438f488aee29876bdb35b11b4a19cdc2d93` | `sha256:ab323875693c4c2dd63bf7afd3826ccfecb670fd0f06e8cd36e984c7e3089ed3` | `chain_management` | `local_chain_config` | `block` | `false` | `chainId` | active-chain target evidence | `chain_allowlist`, `monad_testnet_only` |
| `get_wallet_info` | `sha256:efddc7bd8bbcef73a14eb1ace1ffdaec81e518ef1e13c1e9271d0b8acb694a49` | `sha256:96337253d647f0ea067e7b0226e894c1f420b7846059b2c66a38107b27ead8f0` | `read_only` | `none` | `allow` | `false` | none | active-chain evidence, sanitized account context when available | `registered_tool`, `read_only_audit` |
| `get_balance` | `sha256:2c2d95dea1a265e86547d4318ae22fcc8e89e5869281734ee94ada3c56eeb516` | `sha256:b4c56f0b13746cc0f343a17a5f501df938add9b6daa6d033aeca89025c2386d1` | `read_only` | `none` | `allow` | `false` | optional `address` | chain evidence, sanitized address/account context | `registered_tool`, `read_only_audit`, `chain_allowlist` |
| `get_token_balance` | `sha256:88e6c9a9ea7a6d03305a0a2bbca4c28ed42b4c89afb6b6bf3f85113b0f84a280` | `sha256:aab343d00361525e9964a6dfbcd0af96da8210273d061fa34c2dca2601385b64` | `read_only` | `none` | `allow` | `false` | `token`, optional `address` | chain evidence, token identifier evidence, sanitized address/account context | `registered_tool`, `read_only_audit`, `chain_allowlist`, `token_identifier_present` |
| `estimate_gas` | `sha256:cfe97c0904fe9d97e21d8815d49c2c54cd3ca145c73d9df9bb418d783d98844f` | `sha256:a2186c6c4229d1335702cb737a4dcdde82fb7447bc4f9dfda46acd39a6886d41` | `simulation` | `none` | `allow` | `false` | `to`, optional `from`, optional `value`, optional `data` | candidate transaction evidence, chain evidence, gas estimate result or safe failure | `registered_tool`, `chain_allowlist`, `gas_evidence_recorded` |
| `simulate_transaction` | `sha256:739c09306309ccb957ef4f8ebe995a8ecc024077de53f44c39e4817182aec469` | `sha256:1603a90cbc4a8d74f2b7b3c55da6d5ec5ff1fa15462a5ed9e91e14b37f097e45` | `simulation` | `none` | `allow` | `false` | `contract`, `function`, optional `address`, optional `args`, optional `value` | candidate call evidence, chain evidence, simulation result or safe failure | `registered_tool`, `chain_allowlist`, `simulation_evidence_recorded` |
| `send_transaction` | `sha256:daead389c178e7ac445a79579bceea8fa826fe9f64c5ee015af3deabb97e3d2d` | `sha256:cbdb2116e33f7e5617c6c0cb33ca506b15bc3ce81aab129ae285fcf8a4850d45` | `transaction_execute` | `chain_state` | `block` | `true` | `to`, `value`, optional `data` | candidate transaction evidence, simulation evidence, digest requirement, policy allow requirement, idempotency requirement | `registered_tool`, `chain_allowlist`, `simulation_required`, `digest_required`, `idempotency_required`, `policy_allow_required` |
| `transfer_token` | `sha256:948b940f8aa1919b8f8eaba7c6d599f0f2adccd00c1e2f37294211c1cdaf2f1c` | `sha256:cc8bbb2d1e8fda5440385b99201dcb6e3713b461d9b7eead2770880ea0c888a7` | `transaction_execute` | `chain_state` | `block` | `true` | `token`, `to`, `amount` | token transfer evidence, simulation evidence, digest requirement, policy allow requirement, idempotency requirement | `registered_tool`, `chain_allowlist`, `recipient_allowlist`, `token_allowlist`, `amount_cap`, `gas_cap`, `simulation_required`, `digest_required`, `idempotency_required` |
| `approve_token` | `sha256:aba90769c0a4711c874be0580f3eec942cf2db94cca2e41e520e3cdd3b4cc034` | `sha256:8fc827056f3940e6dc6a78bb6afcf78f5a711e2e5d3512a3d8cd8cb4dd528d6a` | `token_approval` | `chain_state` | `block` | `true` | `token`, `spender`, `amount` | allowance evidence, finite amount evidence, simulation evidence, exact policy allow requirement, digest requirement | `registered_tool`, `chain_allowlist`, `spender_allowlist`, `token_allowlist`, `finite_approval_required`, `unlimited_approval_block`, `simulation_required`, `digest_required` |
| `sign_typed_data` | `sha256:93ef0552d5758f32d753702204239af75d9746c964eb17f0e0f584deb0d3dc23` | `sha256:bd4ba7660846d4d98ed17cd3c94a0b51010707ad83a16540bdb45801fc77f1a6` | `signature` | `signature` | `block` | `true` | `domain`, `types`, `primaryType`, `message` | typed-data decode evidence, domain evidence, chain evidence, policy allow requirement | `registered_tool`, `typed_data_decoded`, `domain_allowlist`, `chain_allowlist`, `policy_allow_required`, `opaque_signature_block` |

#### Scenario: Captured P0 mappings are complete

- GIVEN the W0 schema hash manifest contains captured P0 entries
- WHEN the Wave 2 registry is reviewed
- THEN entries MUST exist for `add_custom_chain`, `switch_chain`, `get_wallet_info`, `get_balance`, `get_token_balance`, `estimate_gas`, `simulate_transaction`, `send_transaction`, `transfer_token`, `approve_token`, and `sign_typed_data`
- AND each entry MUST use the exact W0 hash values shown in this requirement
- AND each entry MUST declare required fields, required evidence, simulation flag, and policy check names

#### Scenario: Write-like tools default to block

- GIVEN a mapped tool has `tool_class` of `transaction_execute`, `token_approval`, or `signature`
- WHEN the registry entry is evaluated before W3 policy exists
- THEN `default_decision` MUST be `block`
- AND the entry MUST require downstream evidence and policy allow before any future forwarding can occur

### Requirement: dry_run_transaction Unsupported State

The system MUST treat `dry_run_transaction` as unsupported or blocked until real upstream evidence exists. Wave 2 MUST NOT create an enabled registry entry or fake hash for `dry_run_transaction` from product intent alone.

#### Scenario: dry_run_transaction is requested from fixtures

- GIVEN W0 marks `dry_run_transaction` as `status=absent` with blocker `W0-BLOCKER-009`
- WHEN the Wave 2 registry is generated or reviewed
- THEN `dry_run_transaction` MUST NOT appear as an enabled exposed tool
- AND any representation of it MUST include `unsupported` or `blocked` status
- AND `input_schema_hash` and `upstream_schema_hash` MUST remain absent or null until recapture provides real values

#### Scenario: A future upstream exposes dry_run_transaction

- GIVEN a later pinned Wallet Agent capture includes a real `dry_run_transaction` descriptor and hashes
- WHEN Compass updates Wave 2 semantics
- THEN the update MUST be reviewed as a new evidence-backed change
- AND it MUST NOT silently reuse the Wave 2 unsupported entry

### Requirement: Registry Secret and Mutation Boundary

The system MUST keep Wave 2 registry work secret-safe and non-mutating. Registry creation MUST NOT require private keys, keystore files, host MCP configs containing secrets, live signing, broadcasts, approvals, transfers, or writes.

#### Scenario: Registry work consumes evidence only

- GIVEN W2 needs schema and semantic inputs
- WHEN the registry artifacts are produced
- THEN they MUST consume W0 sanitized fixtures and docs only
- AND they MUST NOT read `.env`, private keys, tokens, secret manager output, or unredacted host config
- AND they MUST NOT call live Wallet Agent or perform any chain mutation
