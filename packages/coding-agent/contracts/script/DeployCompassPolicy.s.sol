// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CompassPolicy} from "../src/CompassPolicy.sol";

/// @notice Template deploy helper. W3 apply must not broadcast this without explicit approval.
contract DeployCompassPolicyScript {
    uint256 internal constant MONAD_TESTNET_CHAIN_ID = 10143;

    function buildInitialPolicy(address ownerAddress)
        public
        view
        returns (
            bytes32 policyId,
            bytes32 contentHash,
            CompassPolicy.PolicyCaps memory caps,
            CompassPolicy.PolicyFlags memory flags,
            bytes32[] memory tools,
            address[] memory recipients,
            address[] memory tokens,
            CompassPolicy.SpenderLimit[] memory spenders,
            CompassPolicy.TypedDataRule[] memory typedRules
        )
    {
        require(block.chainid == MONAD_TESTNET_CHAIN_ID, "wrong chain");
        require(ownerAddress != address(0), "owner required");
        policyId = keccak256("compass.monad-testnet.demo-policy.v1");
        contentHash = keccak256("replace-with-approved-non-secret-policy-manifest-hash");
        caps = CompassPolicy.PolicyCaps(0, 0, 0, 0);
        flags = CompassPolicy.PolicyFlags(true, false, true, false);
        tools = new bytes32[](0);
        recipients = new address[](0);
        tokens = new address[](0);
        spenders = new CompassPolicy.SpenderLimit[](0);
        typedRules = new CompassPolicy.TypedDataRule[](0);
    }

    function deployDryRun(address ownerAddress) external returns (CompassPolicy policy) {
        require(block.chainid == MONAD_TESTNET_CHAIN_ID, "wrong chain");
        (bytes32 policyId, bytes32 contentHash, CompassPolicy.PolicyCaps memory caps, CompassPolicy.PolicyFlags memory flags, bytes32[] memory tools, address[] memory recipients, address[] memory tokens, CompassPolicy.SpenderLimit[] memory spenders, CompassPolicy.TypedDataRule[] memory typedRules) = buildInitialPolicy(ownerAddress);
        policy = new CompassPolicy(ownerAddress, policyId, contentHash, caps, flags, tools, recipients, tokens, spenders, typedRules);
    }
}
