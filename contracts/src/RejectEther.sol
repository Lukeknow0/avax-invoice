// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./InvoiceRegistry.sol";

/// @dev Test helper: rejects any ETH received, used to trigger TransferFailed.
contract RejectEther {
    /// @dev Creates an invoice via an external registry so this contract is the creator/payee.
    function createInvoice(address registry, uint256 amount) external {
        InvoiceRegistry(payable(registry)).createInvoice(amount);
    }

    receive() external payable {
        revert("RejectEther: no ETH accepted");
    }
}
