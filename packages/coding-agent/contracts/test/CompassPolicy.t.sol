// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CompassPolicy} from "../src/CompassPolicy.sol";

interface Vm {
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
}

contract CompassPolicyTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    event PolicyUpdated(bytes32 indexed policyId, uint64 indexed policyVersion, bytes32 indexed updateKind, address owner, bytes32 contentHash);
    event PolicyFrozen(uint64 indexed policyVersion, bool frozen, address owner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    bytes32 internal constant POLICY_ID = keccak256("policy.one");
    bytes32 internal constant CONTENT_HASH = keccak256("policy.content");
    bytes32 internal constant TOOL_A = keccak256("get_balance");
    address internal constant RECIPIENT = address(0x1111111111111111111111111111111111111111);
    address internal constant TOKEN = address(0x2222222222222222222222222222222222222222);
    address internal constant SPENDER = address(0x3333333333333333333333333333333333333333);

    function buildPolicy() internal returns (CompassPolicy policy) {
        bytes32[] memory tools = new bytes32[](1);
        tools[0] = TOOL_A;
        address[] memory recipients = new address[](1);
        recipients[0] = RECIPIENT;
        address[] memory tokens = new address[](1);
        tokens[0] = TOKEN;
        CompassPolicy.SpenderLimit[] memory spenders = new CompassPolicy.SpenderLimit[](1);
        spenders[0] = CompassPolicy.SpenderLimit(TOKEN, SPENDER, 1000, true);
        CompassPolicy.TypedDataRule[] memory typedRules = new CompassPolicy.TypedDataRule[](0);
        policy = new CompassPolicy(
            address(this),
            POLICY_ID,
            CONTENT_HASH,
            CompassPolicy.PolicyCaps(1 ether, 1000000, 0.1 ether, 0),
            CompassPolicy.PolicyFlags(true, false, true, false),
            tools,
            recipients,
            tokens,
            spenders,
            typedRules
        );
    }

    function testConstructorIdentityAndGetters() public {
        CompassPolicy policy = buildPolicy();
        (bytes32 policyId, uint64 version, bytes32 schemaId, uint256 chainId, bytes32 contentHash,, bool frozen) = policy.policyIdentity();
        require(policyId == POLICY_ID, "policy id");
        require(version == 1, "version");
        require(schemaId == policy.EXPECTED_SCHEMA_ID(), "schema");
        require(chainId == block.chainid, "chain");
        require(contentHash == CONTENT_HASH, "content");
        require(!frozen, "not frozen");
        require(policy.owner() == address(this), "owner");
        require(policy.isToolAllowed(TOOL_A), "tool allowed");
        require(policy.isRecipientAllowed(RECIPIENT), "recipient allowed");
        require(policy.isTokenAllowed(TOKEN), "token allowed");
        CompassPolicy.SpenderLimit memory limit = policy.getSpenderLimit(TOKEN, SPENDER);
        require(limit.maxAmountAtomic == 1000 && limit.enabled, "spender limit");
    }

    function testOwnerUpdateIncrementsVersionAndPagination() public {
        CompassPolicy policy = buildPolicy();
        bytes32[] memory tools = new bytes32[](2);
        tools[0] = TOOL_A;
        tools[1] = keccak256("get_wallet_info");
        address[] memory recipients = new address[](1);
        recipients[0] = RECIPIENT;
        address[] memory tokens = new address[](1);
        tokens[0] = TOKEN;
        CompassPolicy.SpenderLimit[] memory spenders = new CompassPolicy.SpenderLimit[](0);
        CompassPolicy.TypedDataRule[] memory typedRules = new CompassPolicy.TypedDataRule[](0);
        policy.updatePolicy(
            keccak256("policy.two"),
            keccak256("content.two"),
            CompassPolicy.PolicyCaps(2 ether, 2000000, 0.2 ether, 0),
            CompassPolicy.PolicyFlags(true, false, true, false),
            tools,
            recipients,
            tokens,
            spenders,
            typedRules
        );
        (, uint64 version,,,,,) = policy.policyIdentity();
        require(version == 2, "version increment");
        (bytes32[] memory page, uint256 nextCursor) = policy.allowedTools(0, 1);
        require(page.length == 1 && page[0] == TOOL_A && nextCursor == 1, "page one");
        (page, nextCursor) = policy.allowedTools(nextCursor, 10);
        require(page.length == 1 && nextCursor == 2, "page two");
    }

    function testFreezeAndOwnershipTransferEmitEvents() public {
        CompassPolicy policy = buildPolicy();
        vm.expectEmit(true, true, true, true);
        emit PolicyFrozen(2, true, address(this));
        vm.expectEmit(true, true, true, true);
        emit PolicyUpdated(POLICY_ID, 2, keccak256("freeze"), address(this), CONTENT_HASH);
        policy.setFrozen(true);
        (, uint64 version,,,,, bool frozen) = policy.policyIdentity();
        require(version == 2 && frozen, "frozen version");
        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(address(this), RECIPIENT);
        policy.transferOwnership(RECIPIENT);
        require(policy.owner() == RECIPIENT, "new owner");
    }

    function testValidationRejectsDuplicatesZeroAndUnsafeFlags() public {
        bytes32[] memory tools = new bytes32[](2);
        tools[0] = TOOL_A;
        tools[1] = TOOL_A;
        address[] memory recipients = new address[](0);
        address[] memory tokens = new address[](0);
        CompassPolicy.SpenderLimit[] memory spenders = new CompassPolicy.SpenderLimit[](0);
        CompassPolicy.TypedDataRule[] memory typedRules = new CompassPolicy.TypedDataRule[](0);
        try new CompassPolicy(
            address(this),
            POLICY_ID,
            CONTENT_HASH,
            CompassPolicy.PolicyCaps(1, 1, 1, 0),
            CompassPolicy.PolicyFlags(true, false, true, false),
            tools,
            recipients,
            tokens,
            spenders,
            typedRules
        ) {
            revert("duplicate accepted");
        } catch {}

        bytes32[] memory oneTool = new bytes32[](1);
        oneTool[0] = TOOL_A;
        try new CompassPolicy(
            address(0),
            POLICY_ID,
            CONTENT_HASH,
            CompassPolicy.PolicyCaps(1, 1, 1, 0),
            CompassPolicy.PolicyFlags(true, false, true, false),
            oneTool,
            recipients,
            tokens,
            spenders,
            typedRules
        ) {
            revert("zero owner accepted");
        } catch {}

        try new CompassPolicy(
            address(this),
            POLICY_ID,
            CONTENT_HASH,
            CompassPolicy.PolicyCaps(1, 1, 1, 0),
            CompassPolicy.PolicyFlags(false, true, false, false),
            oneTool,
            recipients,
            tokens,
            spenders,
            typedRules
        ) {
            revert("unsafe flags accepted");
        } catch {}
    }
}
