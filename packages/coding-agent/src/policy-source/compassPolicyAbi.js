'use strict';

const COMPASS_POLICY_ABI = Object.freeze([
  'function policyIdentity() view returns (bytes32 policyId,uint64 policyVersion,bytes32 schemaId,uint256 chainId,bytes32 contentHash,uint64 lastUpdatedBlock,bool frozen)',
  'function owner() view returns (address)',
  'function policyCaps() view returns (uint256 maxNativeTransferWei,uint256 maxErc20TransferAtomic,uint256 maxGasCostWei,uint256 maxFeePerGasWei)',
  'function policyFlags() view returns (bool blockUnlimitedTokenApprovals,bool allowUnknownTools,bool requireSimulationForWrites,bool frozen)',
  'function allowedToolCount() view returns (uint256)',
  'function allowedTools(uint256 cursor,uint256 size) view returns (bytes32[] page,uint256 nextCursor)',
  'function allowedRecipientCount() view returns (uint256)',
  'function allowedRecipients(uint256 cursor,uint256 size) view returns (address[] page,uint256 nextCursor)',
  'function allowedTokenCount() view returns (uint256)',
  'function allowedTokens(uint256 cursor,uint256 size) view returns (address[] page,uint256 nextCursor)',
  'function spenderLimitCount() view returns (uint256)',
  'function spenderLimits(uint256 cursor,uint256 size) view returns ((address token,address spender,uint256 maxAmountAtomic,bool enabled)[] page,uint256 nextCursor)',
  'function typedDataRuleCount() view returns (uint256)',
  'function typedDataRules(uint256 cursor,uint256 size) view returns ((bytes32 domainSeparatorHash,address verifyingContract,bytes32 primaryTypeHash,bool enabled)[] page,uint256 nextCursor)',
  'event PolicyUpdated(bytes32 indexed policyId,uint64 indexed policyVersion,bytes32 indexed updateKind,address owner,bytes32 contentHash)',
  'event PolicyFrozen(uint64 indexed policyVersion,bool frozen,address owner)',
  'event OwnershipTransferred(address indexed previousOwner,address indexed newOwner)',
]);

module.exports = { COMPASS_POLICY_ABI };
