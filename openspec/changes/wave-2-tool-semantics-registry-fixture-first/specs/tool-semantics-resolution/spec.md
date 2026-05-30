# Tool Semantics Resolution Specification

## Purpose

Define pure, fixture-testable resolver and filtering behavior for Wave 2 without requiring the unavailable Wave 1 MCP proxy runtime. This domain specifies what MUST happen when upstream tool descriptors, registry entries, and schema hashes are compared.

## Requirements

### Requirement: Pure Resolver Contract

The system MUST provide a pure resolver contract that accepts Wallet Agent tool descriptors or fixture entries and returns deterministic semantics resolution without starting an MCP server, launching Wallet Agent, forwarding `tools/call`, or depending on host MCP configuration.

#### Scenario: Known captured tool resolves

- GIVEN a fixture entry for a captured P0 Wallet Agent tool
- AND the tool name exists in the Wave 2 registry
- AND the input schema hash matches the registry entry
- WHEN the pure resolver evaluates the fixture entry
- THEN it MUST return the registry `ToolSemantics` for that tool
- AND the result MUST include an enabled/visible status only when the entry is captured, hash-compatible, and not otherwise blocked by registry metadata

#### Scenario: Resolver runs without Wave 1

- GIVEN Wave 1 MCP proxy skeleton is unavailable
- WHEN Wave 2 resolver behavior is tested or reviewed
- THEN the behavior MUST be testable against fixture arrays and registry data only
- AND the test or review MUST NOT require MCP server startup, upstream stdio lifecycle, host configuration, or live Wallet Agent calls

### Requirement: Registry-First Filtering

The system MUST filter upstream tool descriptors through registry semantics before policy. A tool that is not mapped, not enabled, unsupported, dangerous, private-key/keystore-related, unknown-write-like, or schema-drifted MUST be hidden from host-facing `tools/list` output or blocked before policy.

#### Scenario: Unmapped tool is filtered before policy

- GIVEN a Wallet Agent fixture contains a tool name absent from the Wave 2 registry
- WHEN the pure filter evaluates the fixture
- THEN the tool MUST NOT be exposed as an enabled host-visible tool
- AND a future `tools/call` for that name MUST resolve to a safe `UNMAPPED_TOOL`-style block before policy

#### Scenario: Policy does not rescue an unmapped tool

- GIVEN a tool is absent from the registry
- WHEN a downstream policy would otherwise allow a similarly named action
- THEN the registry decision MUST win
- AND the tool MUST remain hidden or blocked before policy evaluation

### Requirement: Private-Key and Keystore Default Block

The system MUST hide or block private-key and keystore management tools by default, even if the upstream lists them. This includes known examples such as `import_private_key`, `create_encrypted_keystore`, `unlock_keystore`, `import_encrypted_private_key`, and `remove_private_key`, plus any equivalent key-material management tool discovered later.

#### Scenario: Known private-key tool appears in upstream fixture

- GIVEN an upstream fixture contains `import_private_key`, `create_encrypted_keystore`, `unlock_keystore`, `import_encrypted_private_key`, or `remove_private_key`
- WHEN the pure filter evaluates the fixture
- THEN the tool MUST be hidden or blocked
- AND the tool MUST NOT reach W3 policy as an allowable candidate
- AND no secret value or key material MUST be required to prove the block

#### Scenario: New key-material tool appears

- GIVEN an upstream fixture contains a new tool whose semantics indicate key material import, export, unlock, remove, or keystore management
- WHEN the registry has no explicit reviewed safe entry for that tool
- THEN the tool MUST be classified as `private_key_management` or `dangerous`
- AND the default decision MUST be block before policy

### Requirement: Unknown Write and Dangerous Tool Default Block

The system MUST classify any tool that can change chain state, sign data, broadcast transactions, manage keys, or perform an otherwise dangerous operation as blocked unless the registry contains an explicit evidence-backed mapping.

#### Scenario: Unknown write-like tool appears

- GIVEN an upstream fixture contains a write-like tool not listed in the Wave 2 captured P0 mappings
- WHEN the pure resolver evaluates it
- THEN the resolver MUST return hidden or blocked status
- AND the reason MUST identify unmapped unknown write or dangerous semantics
- AND the tool MUST NOT be exposed as an enabled host-visible tool

#### Scenario: Dangerous tool is explicitly known but not allowed

- GIVEN an upstream fixture contains a tool with dangerous semantics
- AND the Wave 2 registry does not contain an explicit enabled mapping for that exact tool and schema
- WHEN the pure filter evaluates the fixture
- THEN the tool MUST be hidden or blocked before policy

### Requirement: Schema Drift Disables Affected Tool

The system MUST compare the fixture or descriptor schema hash against the Wave 2 registry `input_schema_hash`. If the hash differs, is missing for a captured tool, or cannot be computed using the expected canonicalization, the affected tool MUST be disabled until the registry is updated through review.

#### Scenario: Input schema hash matches

- GIVEN a captured tool descriptor has an `input_schema_hash` equal to the Wave 2 registry value
- WHEN the resolver compares schema compatibility
- THEN the tool MAY remain enabled according to its registry status and default decision
- AND the resolver MUST preserve the matched hash in evidence or result metadata for downstream review

#### Scenario: Input schema hash drifts

- GIVEN a tool name matches a registry entry
- BUT the fixture `input_schema_hash` differs from the registry entry
- WHEN the resolver compares schema compatibility
- THEN the tool MUST be disabled or blocked before policy
- AND the result MUST identify schema drift as the reason
- AND downstream W3/W4 MUST NOT treat the tool as safe until a reviewed registry update lands

#### Scenario: Hash is missing for a captured tool

- GIVEN a tool name matches a captured registry entry
- BUT the fixture hash is missing or cannot be computed
- WHEN the resolver compares schema compatibility
- THEN the tool MUST be disabled or blocked before policy
- AND the result MUST NOT fall back to matching only by name or description

### Requirement: Unsupported dry_run_transaction Filtering

The system MUST filter `dry_run_transaction` as unsupported or blocked unless a later evidence-backed capture provides a real descriptor and hashes.

#### Scenario: dry_run_transaction appears in expected P0 list but not W0 fixtures

- GIVEN product and wave documents mention `dry_run_transaction`
- AND W0 evidence marks it absent with `W0-BLOCKER-009`
- WHEN Wave 2 builds pure host-visible tool output from W0 fixtures
- THEN `dry_run_transaction` MUST NOT be exposed as enabled
- AND Wave 2 MUST NOT claim dry-run coverage from this absent tool

#### Scenario: Caller asks for dry_run_transaction before recapture

- GIVEN `dry_run_transaction` has no evidence-backed registry mapping
- WHEN a future call-resolution layer asks Wave 2 semantics for that tool
- THEN the result MUST be a safe unsupported or unmapped block before policy

### Requirement: Runtime tools/list Proof Deferred to W1/W4

The system MUST make clear that Wave 2 proves only pure resolver and filtering behavior. Runtime proof that host-visible `tools/list` is filtered through Compass MUST be deferred to W1/W4 and MUST NOT be claimed by Wave 2.

#### Scenario: Wave 2 verification is reviewed

- GIVEN Wave 2 artifacts demonstrate fixture-first resolver behavior
- WHEN a reviewer asks whether host-visible MCP `tools/list` is filtered at runtime
- THEN Wave 2 MUST state that runtime proof is deferred to W1/W4
- AND Wave 2 MUST NOT mark no-bypass or host-visible filtering proof as complete
- AND W0 blocker `W0-BLOCKER-007` MUST remain outside Wave 2 scope

#### Scenario: W1 becomes available later

- GIVEN a future W1 MCP proxy skeleton exists
- WHEN W4 integrates registry filtering into runtime `tools/list`
- THEN the Wave 2 pure resolver contract MUST be reusable as the filtering authority
- AND runtime proof MUST be added in W1/W4/W6 artifacts, not retroactively claimed by Wave 2

### Requirement: Safe Resolution Outputs

The system MUST use safe, deterministic resolution outcomes that downstream layers can consume without exposing secrets or raw sensitive payloads.

#### Scenario: Tool is blocked by registry

- GIVEN the resolver blocks a tool due to unmapped, dangerous, private-key, unsupported, or schema drift status
- WHEN the result is returned to a downstream layer
- THEN the result MUST include a safe reason code such as `UNMAPPED_TOOL`, `UNSUPPORTED_TOOL`, `PRIVATE_KEY_MANAGEMENT_BLOCKED`, `DANGEROUS_TOOL_BLOCKED`, or `SCHEMA_DRIFT`
- AND the result MUST NOT include private keys, tokens, raw secret-bearing environment values, or unredacted upstream dumps
