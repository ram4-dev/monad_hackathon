# Design: Wave 3 Policy, Risk, and Audit Foundation

## Status

`designed`

Wave 3 moves Compass policy authority from local policy fixtures to an owner-managed smart contract deployed on Monad Testnet. Compass reads that contract through a read-only ABI client, validates chain/address/schema/version, evaluates W2-resolved tool calls against the fetched policy snapshot, returns only `allow|block`, and writes sanitized append-only audit events. W3 still does **not** implement Wallet Agent forwarding, user signing/broadcasting, UI/manual approval, host no-bypass proof, mainnet, or multichain hardening.

## Inputs and Sources of Truth

Local project sources:

- `docs/constitution.md`
- `docs/development-waves.md`
- `openspec/config.yaml`
- `openspec/changes/wave-3-policy-risk-audit-foundation/proposal.md`
- `openspec/changes/wave-3-policy-risk-audit-foundation/specs/**/spec.md`
- `tmp/sdd-wave3-onchain-policy-amend-result.md`
- W2 artifacts under `openspec/changes/wave-2-tool-semantics-registry-fixture-first/`
- Current package scaffold under `packages/coding-agent/`

Monad references supplied by parent and cited where they determine behavior:

- Docs index: `https://docs.monad.xyz/llms.txt`
- Monad Testnet facts/reset caveat: `https://docs.monad.xyz/developer-essentials/testnets.md`
- Foundry deploy/keystore guidance: `https://docs.monad.xyz/guides/deploy-smart-contract/foundry.md`
- EVM/gas differences and Monad Foundry recommendation: `https://docs.monad.xyz/developer-essentials/differences.md`

## Hard Constraints Preserved

- Policy source of truth is the on-chain Policy Contract on Monad Testnet `chain_id=10143`.
- Compass fails closed for missing/invalid policy address, wrong chain, unreadable RPC, ABI decode failure, invalid schema, unsupported version, stale/dead contract address, or frozen policy.
- W3 consumes W2 resolver output and never reclassifies unknown/unmapped/schema-drifted/private-key/dangerous tools.
- Local fixtures are mocks/snapshots only; they are never authoritative in runtime policy evaluation.
- W3 may include policy-contract deploy evidence, but product tool calls still do not sign, broadcast, or forward.
- No secrets, private keys, `.env` values, keystore contents, or secret-manager outputs are read, logged, or committed.

## Proposed Repo Layout

Keep implementation centered in `packages/coding-agent`, extending the W2 pure JavaScript package and adding a package-local Solidity workspace.

```text
packages/coding-agent/
  package.json

  contracts/
    foundry.toml                         # package-local Foundry config for Monad Testnet
    README.md                            # contract/deploy/verification runbook; no secrets
    src/
      CompassPolicy.sol                  # immutable W3 policy data contract
    script/
      DeployCompassPolicy.s.sol          # deploys initial bounded policy state
      UpdateCompassPolicy.s.sol          # owner update helper; optional for W3
      ReadCompassPolicy.s.sol            # read-only sanity helper; no secrets
    test/
      CompassPolicy.t.sol                # owner/update/pagination/schema/event tests

  deployments/
    monad-testnet/
      compass-policy.example.json        # redacted deployment evidence schema/example
      compass-policy.current.json        # non-secret current testnet handoff when deployed

  src/
    tool-semantics/                      # existing W2 registry/resolver; no W3 reclassification

    policy-source/
      compassPolicyAbi.js                # committed ABI fragment used by read client
      policySourceConfig.js              # env/config parsing and binding validation
      policyContractClient.js            # read-only ABI client; no wallet/signer
      policySnapshot.js                  # shape normalization + schema/version validation
      policyCache.js                     # optional fresh-cache helper; disabled by default
      policySourceErrors.js              # policy-source safe error categories

    policy/
      evaluatePolicy.js                  # W2 output + policy snapshot -> allow|block
      policyDecision.js                  # canonical decision shape/reason codes
      policyToolKeys.js                  # deterministic tool-name -> on-chain bytes32 key

    risk/
      riskTypes.js
      riskChecks.js                      # deterministic W3 checks from W2 + policy + evidence
      policySourceRisk.js                # fail-closed findings for source failures

    safe-errors/
      safeError.js                       # stable SafeError model and code mapping
      redact.js                          # allowlist redaction helpers

    audit/
      auditEvent.js                      # W3 audit event builders
      auditWriter.js                     # local append-only JSONL writer
      auditRedaction.js                  # metadata allowlists per action

  test/
    policy-source/
      fixtures/
        policy-snapshot.valid.fixture.json
        policy-snapshot.invalid.fixture.json
        policy-read-errors.fixture.json
      policyContractClient.test.js       # mocked provider only; no network
      policySnapshot.test.js
      policySourceConfig.test.js
    policy/
      evaluatePolicy.test.js             # W2 resolver outputs + policy fixtures
      policyToolKeys.test.js
    risk/
      riskChecks.test.js
    safe-errors/
      safeError.test.js
    audit/
      auditWriter.test.js
      auditRedaction.test.js

openspec/changes/wave-3-policy-risk-audit-foundation/
  design.md
  tasks.md                              # next phase
  evidence/
    deployments/
      monad-testnet/
        YYYYMMDDTHHMMSSZ-compass-policy.json  # live deploy evidence only when explicitly run
    verification/
      package-test-output.txt
      forge-test-output.txt
```

Notes:

- `packages/coding-agent/deployments/monad-testnet/compass-policy.current.json` is the product handoff/config artifact for the current known deployment. The OpenSpec `evidence/deployments/...` file is the SDD evidence record for a specific deploy run.
- Compiled Solidity outputs (`out/`, `cache/`, broadcast logs containing local machine paths or command context) should not be committed unless explicitly sanitized and reviewed.
- Unit tests must not call Monad RPC. Live testnet deploy/read verification is an explicit manual/evidence step only.

## Solidity Contract Design

### Upgradeability Decision

Use an **immutable, non-proxy contract** for W3.

Rationale:

- W3 hackathon scope values auditability and small review surface over production upgrade flexibility.
- Owner-managed data updates cover policy evolution without changing code.
- ABI/schema changes should force an explicit redeploy, new address, new evidence file, and Compass config update.
- A proxy introduces proxy-admin key risk, storage-layout risk, and extra verification complexity without being necessary for Monad Testnet demo scope.
- Monad Testnet reset handling already requires redeploy/address rollover; a proxy does not remove that operational requirement.

Future mainnet/multichain work may revisit upgradeability through an ADR, but W3 should not add proxy machinery.

### Contract Identity and Storage

Contract name: `CompassPolicy`.

Core constants/immutables:

```solidity
bytes32 public constant EXPECTED_SCHEMA_ID = keccak256("compass.policy.v1");
uint256 public immutable deploymentChainId; // must be 10143 for accepted W3 deployments
address public owner;
```

Core policy state:

```solidity
struct PolicyCaps {
  uint256 maxNativeTransferWei;
  uint256 maxErc20TransferAtomic;
  uint256 maxGasCostWei;
  uint256 maxFeePerGasWei; // 0 means no separate fee-per-gas cap beyond maxGasCostWei
}

struct PolicyFlags {
  bool blockUnlimitedTokenApprovals; // W3 requires true
  bool allowUnknownTools;            // W3 requires false
  bool requireSimulationForWrites;   // W3 requires true
  bool frozen;                       // true means Compass blocks all policy-gated calls
}

struct SpenderLimit {
  address token;
  address spender;
  uint256 maxAmountAtomic;
  bool enabled;
}

struct TypedDataRule {
  bytes32 domainSeparatorHash;
  address verifyingContract;
  bytes32 primaryTypeHash;
  bool enabled;
}
```

Storage fields:

```solidity
bytes32 private _policyId;
uint64 private _policyVersion;
bytes32 private _schemaId;
bytes32 private _contentHash;     // hash of canonical off-chain policy manifest/evidence, not a secret
uint64 private _lastUpdatedBlock;
PolicyCaps private _caps;
PolicyFlags private _flags;

bytes32[] private _allowedToolKeys;
mapping(bytes32 => bool) private _toolAllowed;

address[] private _allowedRecipients;
mapping(address => bool) private _recipientAllowed;

address[] private _allowedTokens;
mapping(address => bool) private _tokenAllowed;

SpenderLimit[] private _spenderLimits;
mapping(bytes32 => SpenderLimit) private _spenderLimitByKey; // keccak256(token, spender)

TypedDataRule[] private _typedDataRules;
mapping(bytes32 => TypedDataRule) private _typedDataRuleByKey; // keccak256(domain, verifyingContract, primaryType)
```

Initial bounded limits for W3:

| List | Max entries | Reason |
| --- | ---: | --- |
| allowed tools | 64 | W2 P0 has 11 captured tools; leaves room without unbounded reads. |
| allowed recipients | 256 | Demo allowlist; enough for fixtures/testnet. |
| allowed ERC20 tokens | 128 | Demo token allowlist; native MON is governed by native cap, not token list. |
| spender limits | 256 | Explicit `token + spender + max_amount` rules only. |
| typed-data rules | 64 | W3 mostly blocks signatures; bounded future readiness. |
| read page size | 64 | Stable ABI reads and testable pagination. |

Zero addresses are invalid for recipients, ERC20 tokens, spenders, owner, and verifying contracts. Native MON transfers are represented by the native caps, not by an ERC20 token address.

### Initial ABI Surface

Read-only getters:

```solidity
function policyIdentity()
  external
  view
  returns (
    bytes32 policyId,
    uint64 policyVersion,
    bytes32 schemaId,
    uint256 chainId,
    bytes32 contentHash,
    uint64 lastUpdatedBlock,
    bool frozen
  );

function owner() external view returns (address);
function policyCaps() external view returns (PolicyCaps memory);
function policyFlags() external view returns (PolicyFlags memory);

function allowedToolCount() external view returns (uint256);
function allowedTools(uint256 cursor, uint256 size) external view returns (bytes32[] memory page, uint256 nextCursor);
function isToolAllowed(bytes32 toolKey) external view returns (bool);

function allowedRecipientCount() external view returns (uint256);
function allowedRecipients(uint256 cursor, uint256 size) external view returns (address[] memory page, uint256 nextCursor);
function isRecipientAllowed(address recipient) external view returns (bool);

function allowedTokenCount() external view returns (uint256);
function allowedTokens(uint256 cursor, uint256 size) external view returns (address[] memory page, uint256 nextCursor);
function isTokenAllowed(address token) external view returns (bool);

function spenderLimitCount() external view returns (uint256);
function spenderLimits(uint256 cursor, uint256 size) external view returns (SpenderLimit[] memory page, uint256 nextCursor);
function getSpenderLimit(address token, address spender) external view returns (SpenderLimit memory);

function typedDataRuleCount() external view returns (uint256);
function typedDataRules(uint256 cursor, uint256 size) external view returns (TypedDataRule[] memory page, uint256 nextCursor);
function getTypedDataRule(bytes32 domainSeparatorHash, address verifyingContract, bytes32 primaryTypeHash)
  external
  view
  returns (TypedDataRule memory);
```

Owner-managed update functions:

```solidity
function updatePolicy(
  bytes32 policyId,
  bytes32 contentHash,
  PolicyCaps calldata caps,
  PolicyFlags calldata flags,
  bytes32[] calldata allowedToolKeys,
  address[] calldata allowedRecipients,
  address[] calldata allowedTokens,
  SpenderLimit[] calldata spenderLimits,
  TypedDataRule[] calldata typedDataRules
) external onlyOwner;

function setFrozen(bool frozen) external onlyOwner;
function transferOwnership(address newOwner) external onlyOwner;
```

Design constraints for update functions:

- Constructor initializes `deploymentChainId = block.chainid`, `schemaId = EXPECTED_SCHEMA_ID`, `policyVersion = 1`, and the initial policy state.
- Every successful `updatePolicy` increments `policyVersion` exactly once and emits `PolicyUpdated`.
- `setFrozen` increments `policyVersion` and emits `PolicyFrozen` plus `PolicyUpdated` with update kind `freeze`/`unfreeze`.
- Unauthorized updates revert and do not change version/state.
- Contract-level validation rejects arrays over bounds, duplicate keys/addresses, zero addresses, invalid flags for W3 (`allowUnknownTools=true`, `blockUnlimitedTokenApprovals=false`, `requireSimulationForWrites=false`), zero `policyId`, zero `contentHash`, and caps that cannot be represented by JS `BigInt` string serialization.

Events:

```solidity
event PolicyUpdated(
  bytes32 indexed policyId,
  uint64 indexed policyVersion,
  bytes32 indexed updateKind,
  address owner,
  bytes32 contentHash
);

event PolicyFrozen(uint64 indexed policyVersion, bool frozen, address owner);
event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

For W3, simple `transferOwnership` is acceptable if tests prove zero-address rejection and event emission. If implementation can use a small reviewed Ownable2Step pattern without broad dependency risk, prefer two-step ownership transfer; otherwise document single-step ownership as a W3 hackathon limitation.

## Policy Read Client Design

### Runtime Configuration

Policy source config fields:

```js
{
  chain_id: 10143,
  network_name: 'Monad Testnet',
  rpc_url: '<runtime value, never logged>',
  rpc_fallback_urls: ['<runtime values, never logged>'],
  policy_contract_address: '0x...',
  expected_schema_id: '0x' + keccak256('compass.policy.v1'),
  min_policy_version: '1',
  max_policy_version: null,
  read_timeout_ms: 3000,
  retry_count_per_rpc: 1,
  retry_backoff_ms: 250,
  cache_ttl_ms: 0
}
```

Runtime source order:

1. Explicit CLI/config object supplied by caller.
2. `COMPASS_POLICY_CONTRACT_ADDRESS` for address.
3. `COMPASS_POLICY_RPC_URL`, then `MONAD_RPC_URL`, for primary RPC.
4. Optional `COMPASS_POLICY_RPC_FALLBACK_URLS` for additional endpoints.
5. Optional `COMPASS_POLICY_DEPLOYMENT_ARTIFACT` pointing to a non-secret JSON deployment artifact.

If address, chain id, or RPC are missing/malformed, W3 returns `block` with `POLICY_SOURCE_BINDING_INVALID`. The code may show documented Monad public RPC examples in `.example` files, but product runtime should not silently depend on a hardcoded default RPC.

### Read-Only ABI Client

Implementation should use a read-only provider/client only. `viem` public client is the recommended single runtime dependency if a dependency is accepted; otherwise keep a transport interface that can later be backed by an ABI-capable library. Do not instantiate wallet clients, signer accounts, or private-key utilities in W3 policy evaluation.

Read sequence:

1. Validate configured address is `0x` + 20 bytes.
2. Call `eth_chainId`; require `10143` (`0x279f`). Monad Testnet `chain_id=10143` comes from `https://docs.monad.xyz/developer-essentials/testnets.md`.
3. Optionally call `eth_getCode`; require non-empty bytecode at configured contract address. Empty bytecode maps to stale/dead policy source.
4. Read `policyIdentity()`; require contract `chainId == 10143`, expected schema id, nonzero policy id/content hash, version in compatibility range, and not frozen.
5. Read caps/flags; require W3 invariant flags.
6. Read each bounded list through count + paginated getter using max page size 64.
7. Normalize numbers to decimal strings for snapshots/decisions and addresses to lowercase checksum-safe comparison form.
8. Validate the normalized snapshot with package-local schema code.

Timeout/retry policy:

- Per RPC attempt timeout: default 3000 ms.
- Retry count: default 1 retry per endpoint.
- Backoff: default 250 ms.
- Endpoint order: primary first, then configured fallbacks in order.
- Every endpoint must independently report chain id `10143`; otherwise it is skipped and a safe chain mismatch finding is recorded.
- If all endpoints fail, decision is `block`.
- Audit must not persist raw RPC URLs, provider payloads, stack traces, or full ABI blobs.

### Cache/Freshness

Default: `cache_ttl_ms = 0` (no cross-request cache). This best preserves the strict source-of-truth rule for W3.

Optional cache, if enabled explicitly:

- In-memory only; no disk persistence.
- Maximum TTL: 10 seconds.
- Cache key: `chain_id + policy_contract_address + schema_id`.
- Cache entry must include successful read timestamp, policy id/version, content hash, and source block number/`lastUpdatedBlock` if available.
- Stale cache is never used.
- A failed refresh with no fresh cache blocks.
- For write-like/signature/approval decisions, implementation should either require `cache_ttl_ms=0` or a very small TTL (`<=5000 ms`) and record freshness in audit metadata.

## Policy Snapshot Shape

Normalized JavaScript snapshot used by risk/policy modules:

```js
{
  source: {
    chain_id: 10143,
    network_name: 'Monad Testnet',
    contract_address: '0x...',
    schema_id: '0x...',
    deployment_chain_id: 10143,
    owner_address: '0x...',
    read_status: 'success',
    read_block_number: '...',
    last_updated_block: '...'
  },
  policy_id: '0x...',
  policy_version: '1',
  content_hash: '0x...',
  flags: {
    block_unlimited_token_approvals: true,
    allow_unknown_tools: false,
    require_simulation_for_writes: true,
    frozen: false
  },
  caps: {
    max_native_transfer_wei: '...',
    max_erc20_transfer_atomic: '...',
    max_gas_cost_wei: '...',
    max_fee_per_gas_wei: '0'
  },
  allowed_tool_keys: ['0x...'],
  allowed_recipients: ['0x...'],
  allowed_tokens: ['0x...'],
  allowed_spenders: [
    { token: '0x...', spender: '0x...', max_amount_atomic: '...', enabled: true }
  ],
  typed_data_rules: [
    { domain_separator_hash: '0x...', verifying_contract: '0x...', primary_type_hash: '0x...', enabled: true }
  ]
}
```

Schema validation fails closed on missing required fields, wrong types, invalid addresses/hashes, unsupported version, invalid flags, duplicate list entries, list count over bounds, or frozen policy.

## W2 to W3 Data Flow

```text
W2 resolver output
  -> if status != visible: preserve W2 block/hidden/disabled/unsupported reason; no policy rescue
  -> if visible: fetch and validate on-chain policy snapshot
  -> validate W2 required fields/evidence from caller context
  -> compute deterministic risk findings
  -> evaluate policy allowlists/caps/flags
  -> build PolicyDecision allow|block
  -> build sanitized audit metadata
```

W2 preservation rules:

- `UNMAPPED_TOOL`, `UNSUPPORTED_TOOL`, `PRIVATE_KEY_MANAGEMENT_BLOCKED`, `DANGEROUS_TOOL_BLOCKED`, and `SCHEMA_DRIFT` remain blocks before policy.
- W3 must not infer tool class from names, upstream descriptions, schemas, or LLM output.
- A W2 `visible` result only means registered and schema-compatible; it does not imply forwarding or policy allow.

Tool key mapping:

```text
tool_key = keccak256(utf8(tool_name))
```

The contract stores `bytes32` tool keys, not strings. W3 computes the same key from the W2 `semantics.tool_name` and checks `allowed_tool_keys`/`isToolAllowed`. This avoids expensive on-chain string arrays while preserving deterministic mapping. Tests must snapshot known keys for all W2 P0 tools.

Policy decision highlights:

| W2 tool class | W3 policy behavior |
| --- | --- |
| `read_only` | Allow only if tool key is on-chain allowlisted, chain evidence is Monad Testnet when relevant, and audit can be written. |
| `simulation` | Allow only if tool key is allowlisted and candidate/evidence fields required by W2 are present; result is audited. |
| `chain_management` | Allow only for Monad Testnet config: `chain_id=10143`, network name/symbol evidence consistent with official docs, and RPC reference supplied safely. |
| `transaction_execute` | Require W2 evidence, simulation evidence, recipient/token allowlist as applicable, amount cap, gas cap, and policy allow. W3 returns a decision only; W4 handles digest/idempotency/forwarding. |
| `token_approval` | Unlimited approval always blocks. Finite approval allows only exact `token + spender + amount <= max_amount_atomic + chain` match. |
| `signature` | Opaque signatures block. `sign_typed_data` can allow only if decoded domain/chain/verifying contract/primary type match an enabled on-chain typed-data rule; otherwise block. |

## Risk Check Architecture

Risk checks are pure functions over:

- W2 `ResolutionResult` / `ToolSemantics`
- normalized on-chain `PolicySnapshot` or `PolicySourceFailure`
- caller evidence context supplied by W4/future interceptor tests
- optional simulation/inspection result fixture

Risk output remains deterministic:

```js
{
  score: 0,
  level: 'low' | 'medium' | 'high' | 'critical',
  reasons: [RiskReason],
  blocking_findings: [RiskReason]
}
```

Initial risk modules/checks:

- `policySourceRisk`: invalid binding, wrong RPC chain, stale/dead address, RPC timeout/error, ABI decode failure, schema invalid, unsupported version, frozen policy.
- `w2HandoffRisk`: pre-policy W2 block preservation, missing required fields/evidence, schema drift preservation.
- `chainRisk`: candidate/evidence chain must be Monad Testnet `10143`; wrong/missing chain blocks for chain-sensitive tools.
- `toolAllowlistRisk`: W2 tool key must be present in on-chain `allowed_tool_keys`.
- `recipientRisk`: transfer recipients must be allowlisted.
- `tokenRisk`: ERC20 tokens must be allowlisted; zero/invalid token blocks.
- `amountRisk`: native/ERC20 amount must be nonnegative integer string and within caps.
- `approvalRisk`: unlimited approvals block; finite approvals require enabled spender limit and amount <= limit.
- `simulationRisk`: if W2 says simulation required, missing/unavailable/failed simulation blocks.
- `gasRisk`: estimated gas cost and fee-per-gas must be within policy caps. Monad gas behavior must be treated carefully because Monad docs note EVM/gas differences and recommend Monad Foundry for Monad-specific deployment/testing (`https://docs.monad.xyz/developer-essentials/differences.md`).
- `signatureRisk`: opaque typed data blocks; decoded typed data must match on-chain rule.

Risk levels:

- Any policy-source failure or W2 pre-policy block: `critical`, blocking.
- Wrong chain, unsupported version, frozen policy, unlimited approval: `critical`, blocking.
- Missing required evidence/simulation: `high`, blocking.
- Non-allowlisted recipient/token/spender/tool: `high`, blocking.
- Over cap gas/amount: `high`, blocking.
- Informational findings may be `low|medium` but cannot convert a block to allow.

## Safe Errors and Denial Codes

Extend safe errors beyond W2 reason codes with W3 policy-source categories:

```js
POLICY_SOURCE_BINDING_INVALID
POLICY_RPC_CHAIN_MISMATCH
POLICY_RPC_READ_FAILED
POLICY_ABI_DECODE_FAILED
POLICY_SCHEMA_INVALID
POLICY_VERSION_UNSUPPORTED
POLICY_CONTRACT_STALE_OR_DEAD
POLICY_FROZEN
POLICY_TOOL_NOT_ALLOWED
POLICY_RECIPIENT_NOT_ALLOWED
POLICY_TOKEN_NOT_ALLOWED
POLICY_SPENDER_NOT_ALLOWED
POLICY_AMOUNT_OVER_CAP
POLICY_GAS_OVER_CAP
POLICY_UNLIMITED_APPROVAL_BLOCKED
POLICY_TYPED_DATA_NOT_ALLOWED
MISSING_REQUIRED_EVIDENCE
SIMULATION_UNAVAILABLE
SIMULATION_FAILED
AUDIT_WRITE_FAILED
INTERNAL_ERROR
```

Sanitization boundary:

- Safe output includes code, safe message, `debug_ref`, policy id/version when available, and redacted source identifiers.
- Safe output excludes raw RPC responses, raw provider errors, stack traces, full ABI blobs, secrets, private keys, keystore contents, env values, and unredacted tool arguments.
- Equivalent failures map to stable codes; e.g. repeated ABI decode failures always map to `POLICY_ABI_DECODE_FAILED` and `block`.

If audit write fails for a decision, W3 should fail closed for security-critical policy-gated calls. For tests, make this behavior explicit: no silent allow without audit persistence.

## Audit Integration

Add W3-specific actions while preserving the existing constitution audit model:

```js
'policy_source_read'
'policy_source_read_failed'
'policy_snapshot_validated'
'risk_scored'
'policy_evaluated'
'tool_call_blocked'
'policy_update_observed'
```

Allowlisted policy-source metadata:

```js
{
  chain_id: 10143,
  policy_contract_address: '0x...',
  policy_id: '0x...',
  policy_version: '...',
  schema_id: '0x...',
  content_hash: '0x...',
  owner_address: '0x...',
  read_status: 'success|failed',
  read_block_number: '...',
  last_updated_block: '...',
  failure_code: 'POLICY_RPC_READ_FAILED',
  rpc_provider_index: 0,
  cache_status: 'disabled|hit|miss|stale',
  reason_codes: ['...']
}
```

Do not persist:

- raw RPC URLs or API-key-bearing URL paths;
- full provider request/response payloads;
- stack traces;
- full ABI JSON;
- private keys, keystore material, tokens, delegated payloads, or env values;
- unredacted tool arguments.

Policy update correlation:

- Runtime decisions include `policy_id`, `policy_version`, `content_hash`, `contract_address`, and `last_updated_block` from the contract.
- Deploy/update evidence files include `PolicyUpdated` tx hash/log reference when available.
- A future optional maintenance command may scan `PolicyUpdated` events and append `policy_update_observed`; W3 policy evaluation does not depend on log scanning.

## Deployment Evidence Format

Live deployment evidence is captured only when an explicit deploy is run. Evidence files are non-secret JSON.

Path:

```text
openspec/changes/wave-3-policy-risk-audit-foundation/evidence/deployments/monad-testnet/YYYYMMDDTHHMMSSZ-compass-policy.json
packages/coding-agent/deployments/monad-testnet/compass-policy.current.json
```

Schema:

```json
{
  "schema": "compass.policy.deployment.v1",
  "change_id": "wave-3-policy-risk-audit-foundation",
  "network": {
    "name": "Monad Testnet",
    "chain_id": 10143,
    "native_currency_symbol": "MON",
    "docs": [
      "https://docs.monad.xyz/developer-essentials/testnets.md"
    ],
    "testnet_reset_caveat_acknowledged": true
  },
  "contract": {
    "name": "CompassPolicy",
    "address": "0x0000000000000000000000000000000000000000",
    "abi_sha256": "sha256:<hash>",
    "source_sha256": "sha256:<hash>",
    "schema_id": "0x<keccak256 compass.policy.v1>",
    "policy_id": "0x...",
    "policy_version": "1",
    "content_hash": "0x...",
    "owner_address": "0x..."
  },
  "deployment": {
    "tool": "foundry",
    "foundry_profile": "monad-testnet",
    "deployer_address": "0x...",
    "tx_hash": "0x...",
    "block_number": "...",
    "timestamp_utc": "YYYY-MM-DDTHH:MM:SSZ",
    "gas_limit": "...",
    "gas_used": "...",
    "commands_redacted": true
  },
  "verification": {
    "status": "verified|submitted|not_available",
    "explorer_name": "Monad Explorer",
    "contract_url": "https://...",
    "verification_reference": "..."
  },
  "post_deploy_reads": {
    "eth_chainId": "0x279f",
    "policyIdentity_ok": true,
    "schema_ok": true,
    "version_ok": true,
    "flags_ok": true
  },
  "safety": {
    "secret_material_logged": false,
    "private_key_logged": false,
    "keystore_contents_logged": false,
    "used_keystore_or_secure_account_flow": true
  },
  "docs_refs": [
    "https://docs.monad.xyz/llms.txt",
    "https://docs.monad.xyz/developer-essentials/testnets.md",
    "https://docs.monad.xyz/guides/deploy-smart-contract/foundry.md",
    "https://docs.monad.xyz/developer-essentials/differences.md"
  ]
}
```

## Secret-Safe Deployment Protocol

Use Foundry for Solidity deployment because Monad documents Foundry configuration/deploy flow and recommends keystores over private keys (`https://docs.monad.xyz/guides/deploy-smart-contract/foundry.md`). Monad EVM/gas differences and the Monad Foundry recommendation should be cited in deploy notes (`https://docs.monad.xyz/developer-essentials/differences.md`).

Protocol for apply/deploy evidence:

1. Do not read `.env`, private-key files, keystore files, shell history, or secret-manager output.
2. Operator prepares funding/account/keystore outside the repo using secure local tooling. Evidence records only public addresses.
3. Use Foundry keystore/account flow or another secure prompt-based signer; avoid `--private-key` in commands and avoid putting secrets in environment variables.
4. Command templates in docs use placeholders such as `<MONAD_RPC_URL>` and `<FOUNDRY_ACCOUNT_NAME>`; evidence never includes secret values.
5. Disable verbose traces that could dump environment or local paths unless sanitized before commit.
6. Deploy only to Monad Testnet `10143`; verify `eth_chainId` before broadcast.
7. Keep deploy gas limits conservative and evidence-backed. Monad docs note gas charging behavior differences, including gas charged based on gas limit; avoid arbitrary overlarge gas limits.
8. After deployment, capture address, tx hash, block, ABI/source hashes, owner public address, policy identity, and verification link/reference.
9. Never commit keystore files, passwords, private keys, raw signed transactions, or API-key-bearing RPC URLs.

W3 design does not run deploy commands. Deploy happens only in apply/ops when explicitly requested.

## Testnet Reset and Redeploy Handling

Monad Testnet reset caveat comes from `https://docs.monad.xyz/developer-essentials/testnets.md`.

Runtime behavior after reset or stale address:

- `eth_chainId != 10143` => `POLICY_RPC_CHAIN_MISMATCH`, block.
- `eth_getCode(address) == 0x` or ABI reads revert/decode-fail => `POLICY_CONTRACT_STALE_OR_DEAD` or `POLICY_ABI_DECODE_FAILED`, block.
- A local fixture or old deployment artifact must not be used as fallback authority.
- Audit records safe stale/dead category and configured contract address.

Redeploy procedure:

1. Deploy a new immutable `CompassPolicy` to current Monad Testnet.
2. Capture a new OpenSpec evidence JSON file.
3. Update `packages/coding-agent/deployments/monad-testnet/compass-policy.current.json` or runtime config to the new address.
4. Restart Compass or refresh policy source config.
5. Preserve old audit logs; decisions remain tied to their historical contract address/version/content hash.

## Validation Strategy

### Solidity

If Foundry is available in apply:

- `forge test` under `packages/coding-agent/contracts/`.
- Tests cover constructor initialization, owner-only update, unauthorized rejection, version increments, events, freeze/unfreeze, list bounds, duplicate rejection, zero-address rejection, pagination, getters, and invariant flags.
- No testnet network in unit tests.

If Foundry is not installed during local apply, tasks should still add contract source/tests and record toolchain-unavailable status; live deploy must not be claimed.

### JavaScript / Node

Use package-local `node:test`, consistent with W2:

- Policy source config validation: missing/malformed address/RPC/chain fails closed.
- Mocked read client: success path, RPC timeout, wrong chain, empty code, ABI decode failure, schema invalid, unsupported version, frozen policy.
- Snapshot validation: flags/caps/lists/bounds/duplicates.
- Tool key snapshots for W2 P0 tools.
- W2 handoff: `status != visible` blocks before policy and is not rescued by allowlist.
- Policy decisions for read-only, simulation, chain management, transfers, approvals, signatures.
- Risk reason determinism and reason-code stability.
- Safe error redaction for raw RPC/provider failures.
- Audit append-only ordering and metadata allowlists.
- Cache tests with mocked time if cache is enabled.

No Node unit test may call real Monad RPC or read secrets.

### Live Testnet Validation

Only when explicitly run:

- Compile/deploy contract to Monad Testnet `10143`.
- Verify source/contract if explorer support is available.
- Capture non-secret deployment evidence JSON.
- Run read-only post-deploy sanity check against the deployed address.
- Do not run product Wallet Agent forwarding, user transaction signing, or broadcasting beyond the policy contract deployment itself.

## Rollout and Handoff to W4

W3 outputs consumed by W4:

- `evaluatePolicy` primitive returning `allow|block` plus safe reason codes.
- `PolicySnapshot` with source address/version/content hash.
- deterministic `RiskAssessment`.
- sanitized audit metadata builders.
- deployment artifact source for policy contract address and expected schema/version.

W4 must still add guarded forwarding, digest/idempotency, upstream call suppression proof, and actual Wallet Agent `tools/call` forwarding only after W3 allow.

## Review Workload Forecast and Implementation Slicing

Expected implementation is **multi-area and high risk**: Solidity contract, Foundry scripts/tests, ABI artifacts, read-only chain client, schema validation, policy/risk/safe-error/audit modules, deployment evidence, and tests. Even without a fixed review line budget, a single PR will be large and security-critical.

Recommended slicing despite single-PR default:

1. **Contract slice:** `CompassPolicy.sol`, Foundry config, Solidity tests, ABI snapshot. No JS runtime changes beyond ABI file.
2. **Policy source slice:** read-only client, config, snapshot validation, mocked Node tests. No policy allow logic yet.
3. **Decision/risk/safe-error slice:** W2 handoff, risk checks, evaluatePolicy, safe denial mapping, mocked tests.
4. **Audit/evidence slice:** append-only audit integration, redaction tests, deployment evidence schema/runbook.
5. **Live deploy evidence slice:** explicit testnet deploy and verification evidence only after user/parent approval to run deployment.

If implementation must be a single PR, keep the same internal commit/review sections and require reviewers to validate contract invariants, no-secret handling, fail-closed behavior, and W2 handoff preservation independently.

## Open Questions for Tasks/Apply

- Whether to add `viem` as a package-local runtime dependency or defer ABI client implementation behind a mockable transport until dependency policy is approved.
- Whether ownership should be single-step for minimum code or two-step for safer operations.
- Exact initial policy values for live Monad Testnet deployment: recipients, tokens, spenders, caps, owner public address, and content hash.
- Which explorer verification endpoint/tooling is available for the chosen Monad Testnet explorer at deploy time.

These are implementation/ops choices; they do not change the W3 design boundary.