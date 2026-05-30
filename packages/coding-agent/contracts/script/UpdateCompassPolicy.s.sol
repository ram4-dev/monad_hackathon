// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CompassPolicy} from "../src/CompassPolicy.sol";

/// @notice Template update helper. Supply values from an approved, non-secret manifest; do not embed secrets.
contract UpdateCompassPolicyScript {
    uint256 internal constant MONAD_TESTNET_CHAIN_ID = 10143;

    function updateWithEmptyPolicy(CompassPolicy policy, bytes32 policyId, bytes32 contentHash) external {
        require(block.chainid == MONAD_TESTNET_CHAIN_ID, "wrong chain");
        bytes32[] memory tools = new bytes32[](0);
        address[] memory recipients = new address[](0);
        address[] memory tokens = new address[](0);
        CompassPolicy.SpenderLimit[] memory spenders = new CompassPolicy.SpenderLimit[](0);
        CompassPolicy.TypedDataRule[] memory typedRules = new CompassPolicy.TypedDataRule[](0);
        policy.updatePolicy(
            policyId,
            contentHash,
            CompassPolicy.PolicyCaps(0, 0, 0, 0),
            CompassPolicy.PolicyFlags(true, false, true, false),
            tools,
            recipients,
            tokens,
            spenders,
            typedRules
        );
    }
}
