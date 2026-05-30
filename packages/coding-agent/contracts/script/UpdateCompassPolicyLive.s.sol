// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CompassPolicy} from "../src/CompassPolicy.sol";

/// @dev Minimal cheatcode interface (no forge-std dependency).
interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
    function envAddress(string calldata name) external view returns (address);
    function envOr(string calldata name, address defaultValue) external view returns (address);
    function envOr(string calldata name, uint256 defaultValue) external view returns (uint256);
}

/// @notice Owner update of the live demo policy: adds chain-management tools (add_custom_chain,
/// switch_chain) so the host can bootstrap Monad Testnet in wallet-agent through the gate, while
/// keeping the existing read-only + finite transfer/approve allowlist. Monad-only is still enforced
/// by risk checks (chain_id must be 10143). Owner-only (policy-over-policy).
///
/// Env: POLICY_CONTRACT_ADDRESS (required) + the same COMPASS_DEMO_* used at deploy.
contract UpdateCompassPolicyLive {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 internal constant MONAD_TESTNET_CHAIN_ID = 10143;

    function run() external {
        require(block.chainid == MONAD_TESTNET_CHAIN_ID, "wrong chain");
        CompassPolicy policy = CompassPolicy(vm.envAddress("POLICY_CONTRACT_ADDRESS"));

        address recipient = vm.envOr("COMPASS_DEMO_RECIPIENT", address(0));
        address token = vm.envOr("COMPASS_DEMO_TOKEN", address(0));
        address spender = vm.envOr("COMPASS_DEMO_SPENDER", address(0));
        uint256 approveMax = vm.envOr("COMPASS_DEMO_APPROVE_MAX", uint256(0));
        uint256 maxErc20 = vm.envOr("COMPASS_DEMO_MAX_ERC20", uint256(0));
        uint256 maxNative = vm.envOr("COMPASS_DEMO_MAX_NATIVE", uint256(0));
        uint256 maxGas = vm.envOr("COMPASS_DEMO_MAX_GAS", uint256(0));

        bytes32 policyId = keccak256("compass.monad-testnet.demo-policy.v2");
        bytes32 contentHash = keccak256("compass-demo-policy-manifest-v2-chain-bootstrap");
        CompassPolicy.PolicyCaps memory caps = CompassPolicy.PolicyCaps(maxNative, maxErc20, maxGas, 0);
        CompassPolicy.PolicyFlags memory flags = CompassPolicy.PolicyFlags(true, false, true, false);

        bool finiteDemo = token != address(0);
        uint256 toolCount = finiteDemo ? 8 : 6;
        bytes32[] memory tools = new bytes32[](toolCount);
        tools[0] = keccak256("get_balance");
        tools[1] = keccak256("get_wallet_info");
        tools[2] = keccak256("get_token_balance");
        tools[3] = keccak256("add_custom_chain");
        tools[4] = keccak256("switch_chain");
        tools[5] = keccak256("send_transaction");
        if (finiteDemo) {
            tools[6] = keccak256("transfer_token");
            tools[7] = keccak256("approve_token");
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
        policy.updatePolicy(policyId, contentHash, caps, flags, tools, recipients, tokens, spenders, typedRules);
        vm.stopBroadcast();
    }
}
