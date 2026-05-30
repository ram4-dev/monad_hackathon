// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CompassPolicy {
    bytes32 public constant EXPECTED_SCHEMA_ID = keccak256("compass.policy.v1");
    uint256 public constant MAX_TOOLS = 64;
    uint256 public constant MAX_RECIPIENTS = 256;
    uint256 public constant MAX_TOKENS = 128;
    uint256 public constant MAX_SPENDER_LIMITS = 256;
    uint256 public constant MAX_TYPED_DATA_RULES = 64;
    uint256 public constant MAX_PAGE_SIZE = 64;

    struct PolicyCaps {
        uint256 maxNativeTransferWei;
        uint256 maxErc20TransferAtomic;
        uint256 maxGasCostWei;
        uint256 maxFeePerGasWei;
    }

    struct PolicyFlags {
        bool blockUnlimitedTokenApprovals;
        bool allowUnknownTools;
        bool requireSimulationForWrites;
        bool frozen;
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

    uint256 public immutable deploymentChainId;
    address public owner;

    bytes32 private _policyId;
    uint64 private _policyVersion;
    bytes32 private _schemaId;
    bytes32 private _contentHash;
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
    mapping(bytes32 => SpenderLimit) private _spenderLimitByKey;
    TypedDataRule[] private _typedDataRules;
    mapping(bytes32 => TypedDataRule) private _typedDataRuleByKey;

    event PolicyUpdated(bytes32 indexed policyId, uint64 indexed policyVersion, bytes32 indexed updateKind, address owner, bytes32 contentHash);
    event PolicyFrozen(uint64 indexed policyVersion, bool frozen, address owner);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "CompassPolicy: only owner");
        _;
    }

    constructor(
        address initialOwner,
        bytes32 policyId,
        bytes32 contentHash,
        PolicyCaps memory caps,
        PolicyFlags memory flags,
        bytes32[] memory allowedToolKeys_,
        address[] memory allowedRecipients_,
        address[] memory allowedTokens_,
        SpenderLimit[] memory spenderLimits_,
        TypedDataRule[] memory typedDataRules_
    ) {
        require(initialOwner != address(0), "CompassPolicy: zero owner");
        owner = initialOwner;
        deploymentChainId = block.chainid;
        _schemaId = EXPECTED_SCHEMA_ID;
        _policyVersion = 1;
        _applyPolicy(policyId, contentHash, caps, flags, allowedToolKeys_, allowedRecipients_, allowedTokens_, spenderLimits_, typedDataRules_);
        emit OwnershipTransferred(address(0), initialOwner);
        emit PolicyUpdated(policyId, _policyVersion, keccak256("initial"), owner, contentHash);
    }

    function policyIdentity()
        external
        view
        returns (bytes32 policyId, uint64 policyVersion, bytes32 schemaId, uint256 chainId, bytes32 contentHash, uint64 lastUpdatedBlock, bool frozen)
    {
        return (_policyId, _policyVersion, _schemaId, deploymentChainId, _contentHash, _lastUpdatedBlock, _flags.frozen);
    }

    function policyCaps() external view returns (PolicyCaps memory) { return _caps; }
    function policyFlags() external view returns (PolicyFlags memory) { return _flags; }
    function allowedToolCount() external view returns (uint256) { return _allowedToolKeys.length; }
    function allowedRecipientCount() external view returns (uint256) { return _allowedRecipients.length; }
    function allowedTokenCount() external view returns (uint256) { return _allowedTokens.length; }
    function spenderLimitCount() external view returns (uint256) { return _spenderLimits.length; }
    function typedDataRuleCount() external view returns (uint256) { return _typedDataRules.length; }
    function isToolAllowed(bytes32 toolKey) external view returns (bool) { return _toolAllowed[toolKey]; }
    function isRecipientAllowed(address recipient) external view returns (bool) { return _recipientAllowed[recipient]; }
    function isTokenAllowed(address token) external view returns (bool) { return _tokenAllowed[token]; }
    function getSpenderLimit(address token, address spender) external view returns (SpenderLimit memory) { return _spenderLimitByKey[_spenderKey(token, spender)]; }
    function getTypedDataRule(bytes32 domainSeparatorHash, address verifyingContract, bytes32 primaryTypeHash) external view returns (TypedDataRule memory) { return _typedDataRuleByKey[_typedRuleKey(domainSeparatorHash, verifyingContract, primaryTypeHash)]; }

    function allowedTools(uint256 cursor, uint256 size) external view returns (bytes32[] memory page, uint256 nextCursor) {
        return _pageBytes32(_allowedToolKeys, cursor, size);
    }
    function allowedRecipients(uint256 cursor, uint256 size) external view returns (address[] memory page, uint256 nextCursor) {
        return _pageAddress(_allowedRecipients, cursor, size);
    }
    function allowedTokens(uint256 cursor, uint256 size) external view returns (address[] memory page, uint256 nextCursor) {
        return _pageAddress(_allowedTokens, cursor, size);
    }
    function spenderLimits(uint256 cursor, uint256 size) external view returns (SpenderLimit[] memory page, uint256 nextCursor) {
        require(size <= MAX_PAGE_SIZE, "CompassPolicy: page too large");
        if (cursor >= _spenderLimits.length) return (new SpenderLimit[](0), cursor);
        uint256 end = _min(cursor + size, _spenderLimits.length);
        page = new SpenderLimit[](end - cursor);
        for (uint256 i = cursor; i < end; i++) page[i - cursor] = _spenderLimits[i];
        return (page, end);
    }
    function typedDataRules(uint256 cursor, uint256 size) external view returns (TypedDataRule[] memory page, uint256 nextCursor) {
        require(size <= MAX_PAGE_SIZE, "CompassPolicy: page too large");
        if (cursor >= _typedDataRules.length) return (new TypedDataRule[](0), cursor);
        uint256 end = _min(cursor + size, _typedDataRules.length);
        page = new TypedDataRule[](end - cursor);
        for (uint256 i = cursor; i < end; i++) page[i - cursor] = _typedDataRules[i];
        return (page, end);
    }

    function updatePolicy(
        bytes32 policyId,
        bytes32 contentHash,
        PolicyCaps calldata caps,
        PolicyFlags calldata flags,
        bytes32[] calldata allowedToolKeys_,
        address[] calldata allowedRecipients_,
        address[] calldata allowedTokens_,
        SpenderLimit[] calldata spenderLimits_,
        TypedDataRule[] calldata typedDataRules_
    ) external onlyOwner {
        _policyVersion += 1;
        _applyPolicy(policyId, contentHash, caps, flags, allowedToolKeys_, allowedRecipients_, allowedTokens_, spenderLimits_, typedDataRules_);
        emit PolicyUpdated(policyId, _policyVersion, keccak256("update"), owner, contentHash);
    }

    function setFrozen(bool frozen) external onlyOwner {
        _flags.frozen = frozen;
        _policyVersion += 1;
        _lastUpdatedBlock = uint64(block.number);
        emit PolicyFrozen(_policyVersion, frozen, owner);
        emit PolicyUpdated(_policyId, _policyVersion, frozen ? keccak256("freeze") : keccak256("unfreeze"), owner, _contentHash);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "CompassPolicy: zero owner");
        emit OwnershipTransferStarted(owner, newOwner);
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    function _applyPolicy(
        bytes32 policyId,
        bytes32 contentHash,
        PolicyCaps memory caps,
        PolicyFlags memory flags,
        bytes32[] memory tools,
        address[] memory recipients,
        address[] memory tokens,
        SpenderLimit[] memory spenders,
        TypedDataRule[] memory typedRules
    ) private {
        require(policyId != bytes32(0) && contentHash != bytes32(0), "CompassPolicy: zero identity");
        require(flags.blockUnlimitedTokenApprovals && !flags.allowUnknownTools && flags.requireSimulationForWrites, "CompassPolicy: unsafe flags");
        require(tools.length <= MAX_TOOLS && recipients.length <= MAX_RECIPIENTS && tokens.length <= MAX_TOKENS && spenders.length <= MAX_SPENDER_LIMITS && typedRules.length <= MAX_TYPED_DATA_RULES, "CompassPolicy: over bounds");
        _clearPolicy();
        _policyId = policyId;
        _contentHash = contentHash;
        _caps = caps;
        _flags = flags;
        _lastUpdatedBlock = uint64(block.number);
        for (uint256 i = 0; i < tools.length; i++) {
            require(tools[i] != bytes32(0) && !_toolAllowed[tools[i]], "CompassPolicy: bad tool");
            _toolAllowed[tools[i]] = true;
            _allowedToolKeys.push(tools[i]);
        }
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0) && !_recipientAllowed[recipients[i]], "CompassPolicy: bad recipient");
            _recipientAllowed[recipients[i]] = true;
            _allowedRecipients.push(recipients[i]);
        }
        for (uint256 i = 0; i < tokens.length; i++) {
            require(tokens[i] != address(0) && !_tokenAllowed[tokens[i]], "CompassPolicy: bad token");
            _tokenAllowed[tokens[i]] = true;
            _allowedTokens.push(tokens[i]);
        }
        for (uint256 i = 0; i < spenders.length; i++) {
            require(spenders[i].token != address(0) && spenders[i].spender != address(0), "CompassPolicy: bad spender");
            bytes32 key = _spenderKey(spenders[i].token, spenders[i].spender);
            require(!_spenderLimitByKey[key].enabled, "CompassPolicy: dup spender");
            _spenderLimitByKey[key] = spenders[i];
            _spenderLimits.push(spenders[i]);
        }
        for (uint256 i = 0; i < typedRules.length; i++) {
            require(typedRules[i].domainSeparatorHash != bytes32(0) && typedRules[i].verifyingContract != address(0) && typedRules[i].primaryTypeHash != bytes32(0), "CompassPolicy: bad typed rule");
            bytes32 key = _typedRuleKey(typedRules[i].domainSeparatorHash, typedRules[i].verifyingContract, typedRules[i].primaryTypeHash);
            require(!_typedDataRuleByKey[key].enabled, "CompassPolicy: dup typed rule");
            _typedDataRuleByKey[key] = typedRules[i];
            _typedDataRules.push(typedRules[i]);
        }
    }

    function _clearPolicy() private {
        for (uint256 i = 0; i < _allowedToolKeys.length; i++) delete _toolAllowed[_allowedToolKeys[i]];
        for (uint256 i = 0; i < _allowedRecipients.length; i++) delete _recipientAllowed[_allowedRecipients[i]];
        for (uint256 i = 0; i < _allowedTokens.length; i++) delete _tokenAllowed[_allowedTokens[i]];
        for (uint256 i = 0; i < _spenderLimits.length; i++) delete _spenderLimitByKey[_spenderKey(_spenderLimits[i].token, _spenderLimits[i].spender)];
        for (uint256 i = 0; i < _typedDataRules.length; i++) delete _typedDataRuleByKey[_typedRuleKey(_typedDataRules[i].domainSeparatorHash, _typedDataRules[i].verifyingContract, _typedDataRules[i].primaryTypeHash)];
        delete _allowedToolKeys;
        delete _allowedRecipients;
        delete _allowedTokens;
        delete _spenderLimits;
        delete _typedDataRules;
    }

    function _spenderKey(address token, address spender) private pure returns (bytes32) { return keccak256(abi.encode(token, spender)); }
    function _typedRuleKey(bytes32 domainSeparatorHash, address verifyingContract, bytes32 primaryTypeHash) private pure returns (bytes32) { return keccak256(abi.encode(domainSeparatorHash, verifyingContract, primaryTypeHash)); }
    function _min(uint256 a, uint256 b) private pure returns (uint256) { return a < b ? a : b; }
    function _pageBytes32(bytes32[] storage values, uint256 cursor, uint256 size) private view returns (bytes32[] memory page, uint256 nextCursor) {
        require(size <= MAX_PAGE_SIZE, "CompassPolicy: page too large");
        if (cursor >= values.length) return (new bytes32[](0), cursor);
        uint256 end = _min(cursor + size, values.length);
        page = new bytes32[](end - cursor);
        for (uint256 i = cursor; i < end; i++) page[i - cursor] = values[i];
        return (page, end);
    }
    function _pageAddress(address[] storage values, uint256 cursor, uint256 size) private view returns (address[] memory page, uint256 nextCursor) {
        require(size <= MAX_PAGE_SIZE, "CompassPolicy: page too large");
        if (cursor >= values.length) return (new address[](0), cursor);
        uint256 end = _min(cursor + size, values.length);
        page = new address[](end - cursor);
        for (uint256 i = cursor; i < end; i++) page[i - cursor] = values[i];
        return (page, end);
    }
}
