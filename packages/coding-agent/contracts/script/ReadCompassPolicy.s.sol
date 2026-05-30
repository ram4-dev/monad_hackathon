// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CompassPolicy} from "../src/CompassPolicy.sol";

/// @notice Read-only sanity helper for approved post-deploy checks.
contract ReadCompassPolicyScript {
    uint256 internal constant MONAD_TESTNET_CHAIN_ID = 10143;

    function readIdentity(CompassPolicy policy)
        external
        view
        returns (bytes32 policyId, uint64 policyVersion, bytes32 schemaId, uint256 chainId, bytes32 contentHash, uint64 lastUpdatedBlock, bool frozen)
    {
        require(block.chainid == MONAD_TESTNET_CHAIN_ID, "wrong chain");
        return policy.policyIdentity();
    }
}
