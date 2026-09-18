// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/InvoiceRegistry.sol";

contract DeployInvoiceRegistry is Script {
    function run() external returns (InvoiceRegistry reg) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        reg = new InvoiceRegistry();
        vm.stopBroadcast();
        console2.log("InvoiceRegistry deployed at:", address(reg));
    }
}
