'use strict';

const { REGISTRY_VERSION } = require('./types');

const W0_BASE = 'openspec/changes/wave-0-upstream-monad-poc/evidence/upstream';
const COMMON_REFS = [
  `${W0_BASE}/schema-hash-manifest.json`,
  `${W0_BASE}/wallet-agent-tools-list.sanitized.json`,
];

function refs(toolName) {
  return [...COMMON_REFS, `${W0_BASE}/tools/${toolName}.schema.json`];
}

function entry(tool) {
  return Object.freeze({
    registry_version: REGISTRY_VERSION,
    upstream: 'wallet_agent',
    exposed_name: tool.tool_name,
    ...tool,
    evidence_refs: refs(tool.tool_name),
  });
}

const WALLET_AGENT_REGISTRY = Object.freeze({
  add_custom_chain: entry({
    tool_name: 'add_custom_chain',
    input_schema_hash: 'sha256:79f402dcf29282290da7e0e7ea71c44c131c2088c0b13b8292ef8cd56ca585d6',
    upstream_schema_hash: 'sha256:dbbdc61674a3b17a392f8a783eeec56e49d621155f5b602031501f41a0107843',
    tool_class: 'chain_management',
    state_effect: 'local_chain_config',
    default_decision: 'block',
    requires_simulation: false,
    required_fields: ['chainId', 'name', 'rpcUrl', 'nativeCurrency.name', 'nativeCurrency.symbol', 'nativeCurrency.decimals'],
    required_evidence: ['monad_testnet_allowlist_evidence', 'sanitized_rpc_label_or_env_reference_evidence'],
    policy_checks: ['chain_allowlist', 'rpc_allowlist_or_env', 'monad_testnet_only'],
    notes: 'Local chain configuration only; default block until downstream allowlist evidence exists.',
  }),
  switch_chain: entry({
    tool_name: 'switch_chain',
    input_schema_hash: 'sha256:9f922f5ce1caaf41d5f57511a1f06438f488aee29876bdb35b11b4a19cdc2d93',
    upstream_schema_hash: 'sha256:ab323875693c4c2dd63bf7afd3826ccfecb670fd0f06e8cd36e984c7e3089ed3',
    tool_class: 'chain_management',
    state_effect: 'local_chain_config',
    default_decision: 'block',
    requires_simulation: false,
    required_fields: ['chainId'],
    required_evidence: ['active_chain_target_evidence'],
    policy_checks: ['chain_allowlist', 'monad_testnet_only'],
    notes: 'Local chain selection only; default block until downstream allowlist evidence exists.',
  }),
  get_wallet_info: entry({
    tool_name: 'get_wallet_info',
    input_schema_hash: 'sha256:efddc7bd8bbcef73a14eb1ace1ffdaec81e518ef1e13c1e9271d0b8acb694a49',
    upstream_schema_hash: 'sha256:96337253d647f0ea067e7b0226e894c1f420b7846059b2c66a38107b27ead8f0',
    tool_class: 'read_only',
    state_effect: 'none',
    default_decision: 'allow',
    requires_simulation: false,
    required_fields: [],
    required_evidence: ['active_chain_evidence', 'sanitized_account_context_when_available'],
    policy_checks: ['registered_tool', 'read_only_audit'],
    notes: 'Read-only registry visibility does not imply forwarding or runtime MCP proof.',
  }),
  get_balance: entry({
    tool_name: 'get_balance',
    input_schema_hash: 'sha256:2c2d95dea1a265e86547d4318ae22fcc8e89e5869281734ee94ada3c56eeb516',
    upstream_schema_hash: 'sha256:b4c56f0b13746cc0f343a17a5f501df938add9b6daa6d033aeca89025c2386d1',
    tool_class: 'read_only',
    state_effect: 'none',
    default_decision: 'allow',
    requires_simulation: false,
    required_fields: ['address?'],
    required_evidence: ['chain_evidence', 'sanitized_address_or_account_context'],
    policy_checks: ['registered_tool', 'read_only_audit', 'chain_allowlist'],
    notes: 'Read-only registry visibility does not imply forwarding or runtime MCP proof.',
  }),
  get_token_balance: entry({
    tool_name: 'get_token_balance',
    input_schema_hash: 'sha256:88e6c9a9ea7a6d03305a0a2bbca4c28ed42b4c89afb6b6bf3f85113b0f84a280',
    upstream_schema_hash: 'sha256:aab343d00361525e9964a6dfbcd0af96da8210273d061fa34c2dca2601385b64',
    tool_class: 'read_only',
    state_effect: 'none',
    default_decision: 'allow',
    requires_simulation: false,
    required_fields: ['token', 'address?'],
    required_evidence: ['chain_evidence', 'token_identifier_evidence', 'sanitized_address_or_account_context'],
    policy_checks: ['registered_tool', 'read_only_audit', 'chain_allowlist', 'token_identifier_present'],
    notes: 'Read-only registry visibility does not imply forwarding or runtime MCP proof.',
  }),
  estimate_gas: entry({
    tool_name: 'estimate_gas',
    input_schema_hash: 'sha256:cfe97c0904fe9d97e21d8815d49c2c54cd3ca145c73d9df9bb418d783d98844f',
    upstream_schema_hash: 'sha256:a2186c6c4229d1335702cb737a4dcdde82fb7447bc4f9dfda46acd39a6886d41',
    tool_class: 'simulation',
    state_effect: 'none',
    default_decision: 'allow',
    requires_simulation: false,
    required_fields: ['to', 'from?', 'value?', 'data?'],
    required_evidence: ['candidate_transaction_evidence', 'chain_evidence', 'gas_estimate_result_or_safe_failure'],
    policy_checks: ['registered_tool', 'chain_allowlist', 'gas_evidence_recorded'],
    notes: 'Simulation-class registry visibility does not imply forwarding or runtime MCP proof.',
  }),
  simulate_transaction: entry({
    tool_name: 'simulate_transaction',
    input_schema_hash: 'sha256:739c09306309ccb957ef4f8ebe995a8ecc024077de53f44c39e4817182aec469',
    upstream_schema_hash: 'sha256:1603a90cbc4a8d74f2b7b3c55da6d5ec5ff1fa15462a5ed9e91e14b37f097e45',
    tool_class: 'simulation',
    state_effect: 'none',
    default_decision: 'allow',
    requires_simulation: false,
    required_fields: ['contract', 'function', 'address?', 'args?', 'value?'],
    required_evidence: ['candidate_call_evidence', 'chain_evidence', 'simulation_result_or_safe_failure'],
    policy_checks: ['registered_tool', 'chain_allowlist', 'simulation_evidence_recorded'],
    notes: 'Simulation-class registry visibility does not imply forwarding or runtime MCP proof.',
  }),
  send_transaction: entry({
    tool_name: 'send_transaction',
    input_schema_hash: 'sha256:daead389c178e7ac445a79579bceea8fa826fe9f64c5ee015af3deabb97e3d2d',
    upstream_schema_hash: 'sha256:cbdb2116e33f7e5617c6c0cb33ca506b15bc3ce81aab129ae285fcf8a4850d45',
    tool_class: 'transaction_execute',
    state_effect: 'chain_state',
    default_decision: 'block',
    requires_simulation: true,
    required_fields: ['to', 'value', 'data?'],
    required_evidence: ['candidate_transaction_evidence', 'simulation_evidence', 'digest_requirement', 'policy_allow_requirement', 'idempotency_requirement'],
    policy_checks: ['registered_tool', 'chain_allowlist', 'simulation_required', 'digest_required', 'idempotency_required', 'policy_allow_required'],
    notes: 'Visible only means registered and schema-compatible; execution remains blocked until W3/W4 evidence and policy.',
  }),
  transfer_token: entry({
    tool_name: 'transfer_token',
    input_schema_hash: 'sha256:948b940f8aa1919b8f8eaba7c6d599f0f2adccd00c1e2f37294211c1cdaf2f1c',
    upstream_schema_hash: 'sha256:cc8bbb2d1e8fda5440385b99201dcb6e3713b461d9b7eead2770880ea0c888a7',
    tool_class: 'transaction_execute',
    state_effect: 'chain_state',
    default_decision: 'block',
    requires_simulation: true,
    required_fields: ['token', 'to', 'amount'],
    required_evidence: ['token_transfer_evidence', 'simulation_evidence', 'digest_requirement', 'policy_allow_requirement', 'idempotency_requirement'],
    policy_checks: ['registered_tool', 'chain_allowlist', 'recipient_allowlist', 'token_allowlist', 'amount_cap', 'gas_cap', 'simulation_required', 'digest_required', 'idempotency_required'],
    notes: 'Visible only means registered and schema-compatible; execution remains blocked until W3/W4 evidence and policy.',
  }),
  approve_token: entry({
    tool_name: 'approve_token',
    input_schema_hash: 'sha256:aba90769c0a4711c874be0580f3eec942cf2db94cca2e41e520e3cdd3b4cc034',
    upstream_schema_hash: 'sha256:8fc827056f3940e6dc6a78bb6afcf78f5a711e2e5d3512a3d8cd8cb4dd528d6a',
    tool_class: 'token_approval',
    state_effect: 'chain_state',
    default_decision: 'block',
    requires_simulation: true,
    required_fields: ['token', 'spender', 'amount'],
    required_evidence: ['allowance_evidence', 'finite_amount_evidence', 'simulation_evidence', 'exact_policy_allow_requirement', 'digest_requirement'],
    policy_checks: ['registered_tool', 'chain_allowlist', 'spender_allowlist', 'token_allowlist', 'finite_approval_required', 'unlimited_approval_block', 'simulation_required', 'digest_required'],
    notes: 'Visible only means registered and schema-compatible; approvals remain blocked until W3/W4 evidence and policy.',
  }),
  sign_typed_data: entry({
    tool_name: 'sign_typed_data',
    input_schema_hash: 'sha256:93ef0552d5758f32d753702204239af75d9746c964eb17f0e0f584deb0d3dc23',
    upstream_schema_hash: 'sha256:bd4ba7660846d4d98ed17cd3c94a0b51010707ad83a16540bdb45801fc77f1a6',
    tool_class: 'signature',
    state_effect: 'signature',
    default_decision: 'block',
    requires_simulation: true,
    required_fields: ['domain', 'types', 'primaryType', 'message'],
    required_evidence: ['typed-data_decode_evidence', 'domain_evidence', 'chain_evidence', 'policy_allow_requirement'],
    policy_checks: ['registered_tool', 'typed_data_decoded', 'domain_allowlist', 'chain_allowlist', 'policy_allow_required', 'opaque_signature_block'],
    notes: 'Visible only means registered and schema-compatible; signatures remain blocked until W3/W4 evidence and policy.',
  }),
});

function getToolSemantics(toolName) {
  return WALLET_AGENT_REGISTRY[toolName];
}

module.exports = {
  WALLET_AGENT_REGISTRY,
  getToolSemantics,
};
