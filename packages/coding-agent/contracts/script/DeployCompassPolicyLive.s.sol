// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CompassPolicy} from "../src/CompassPolicy.sol";

/// @dev Minimal cheatcode interface so this script needs no forge-std dependency.
interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
    function envOr(string calldata name, address defaultValue) external view returns (address);
    function envOr(string calldata name, uint256 defaultValue) external view returns (uint256);
    function addr(uint256 privateKey) external view returns (address);
}

/// @notice Live deploy of the CompassPolicy demo policy to Monad Testnet (chain 10143).
/// Owner is the broadcaster (msg.sender). Read-only tools are always allowlisted; a finite
/// transfer/approve demo is added only when the corresponding env addresses are provided.
///
/// Env (all optional except a funded signer passed to `forge script`):
///   COMPASS_DEMO_RECIPIENT  (address)  recipient allowlisted for transfer
///   COMPASS_DEMO_TOKEN      (address)  ERC20 token allowlisted for transfer/approve
///   COMPASS_DEMO_SPENDER    (address)  spender allowlisted for approve
///   COMPASS_DEMO_APPROVE_MAX (uint)    max finite approval amount (atomic)
///   COMPASS_DEMO_MAX_ERC20  (uint)     cap: max erc20 transfer atomic
///   COMPASS_DEMO_MAX_NATIVE (uint)     cap: max native transfer wei
///   COMPASS_DEMO_MAX_GAS    (uint)     cap: max gas cost wei
contract DeployCompassPolicyLive {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 internal constant MONAD_TESTNET_CHAIN_ID = 10143;

    function run() external returns (CompassPolicy policy) {
        require(block.chainid == MONAD_TESTNET_CHAIN_ID, "wrong chain: expected Monad Testnet 10143");

        address recipient = vm.envOr("COMPASS_DEMO_RECIPIENT", address(0));
        address token = vm.envOr("COMPASS_DEMO_TOKEN", address(0));
        address spender = vm.envOr("COMPASS_DEMO_SPENDER", address(0));
        uint256 approveMax = vm.envOr("COMPASS_DEMO_APPROVE_MAX", uint256(0));
        uint256 maxErc20 = vm.envOr("COMPASS_DEMO_MAX_ERC20", uint256(0));
        uint256 maxNative = vm.envOr("COMPASS_DEMO_MAX_NATIVE", uint256(0));
        uint256 maxGas = vm.envOr("COMPASS_DEMO_MAX_GAS", uint256(0));

        bytes32 policyId = keccak256("compass.monad-testnet.demo-policy.v1");
        bytes32 contentHash = keccak256("compass-demo-policy-manifest-v1");
        CompassPolicy.PolicyCaps memory caps = CompassPolicy.PolicyCaps(maxNative, maxErc20, maxGas, 0);
        // Safe flags required by the contract: block unlimited approvals, no unknown tools,
        // require simulation for writes, not frozen.
        CompassPolicy.PolicyFlags memory flags = CompassPolicy.PolicyFlags(true, false, true, false);

        // Read-only tools always allowed; add transfer/approve when a token is configured.
        bool finiteDemo = token != address(0);
        uint256 toolCount = finiteDemo ? 5 : 3;
        bytes32[] memory tools = new bytes32[](toolCount);
        tools[0] = keccak256("get_balance");
        tools[1] = keccak256("get_wallet_info");
        tools[2] = keccak256("get_token_balance");
        if (finiteDemo) {
            tools[3] = keccak256("transfer_token");
            tools[4] = keccak256("approve_token");
        }

        address[] memory recipients;
        address[] memory tokens;
        CompassPolicy.SpenderLimit[] memory spenders;
        if (finiteDemo) {
            recipients = new address[](recipient != address(0) ? 1 : 0);
            if (recipient != address(0)) recipients[0] = recipient;
            tokens = new address[](1);
            tokens[0] = token;
            if (spender != address(0)) {
                spenders = new CompassPolicy.SpenderLimit[](1);
                spenders[0] = CompassPolicy.SpenderLimit(token, spender, approveMax, true);
            } else {
                spenders = new CompassPolicy.SpenderLimit[](0);
            }
        } else {
            recipients = new address[](0);
            tokens = new address[](0);
            spenders = new CompassPolicy.SpenderLimit[](0);
        }
        CompassPolicy.TypedDataRule[] memory typedRules = new CompassPolicy.TypedDataRule[](0);

        vm.startBroadcast();
        policy = new CompassPolicy(
            msg.sender,
            policyId,
            contentHash,
            caps,
            flags,
            tools,
            recipients,
            tokens,
            spenders,
            typedRules
        );
        vm.stopBroadcast();
    }
}
