// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title InvoiceRegistry
 * @notice Avalanche Fuji Testnet — TEST ASSET ONLY, NO REAL VALUE
 * @dev On-chain invoice/payment-request registry.
 *      Creator == payee. Payment is forwarded immediately on success.
 *      No platform fees, no escrow, no upgradeable proxy.
 */
contract InvoiceRegistry {
    // ─── Types ───────────────────────────────────────────────────────────────

    enum Status { Pending, Paid }

    struct Invoice {
        uint256 id;
        address payable creator; // creator is always the payee
        uint256 amount;          // exact amount in wei
        uint256 createdAt;
        Status  status;
        address payer;           // zero until paid
        uint256 paidAt;
    }

    // ─── State ───────────────────────────────────────────────────────────────

    uint256 private _nextId = 1;

    /// id → Invoice
    mapping(uint256 => Invoice) private _invoices;

    /// creator address → list of invoice ids
    mapping(address => uint256[]) private _creatorInvoices;

    // ─── Events ──────────────────────────────────────────────────────────────

    event InvoiceCreated(
        uint256 indexed id,
        address indexed creator,
        uint256 amount,
        uint256 createdAt
    );

    event InvoicePaid(
        uint256 indexed id,
        address indexed payer,
        uint256 amount,
        uint256 paidAt
    );

    // ─── Errors ──────────────────────────────────────────────────────────────

    error ZeroAmount();
    error InvoiceNotFound(uint256 id);
    error AlreadyPaid(uint256 id);
    error IncorrectAmount(uint256 expected, uint256 sent);
    error TransferFailed();

    // ─── External functions ──────────────────────────────────────────────────

    /**
     * @notice Create a payment request for `amount` wei.
     * @return id The new invoice id.
     */
    function createInvoice(uint256 amount) external returns (uint256 id) {
        if (amount == 0) revert ZeroAmount();

        id = _nextId++;
        _invoices[id] = Invoice({
            id:        id,
            creator:   payable(msg.sender),
            amount:    amount,
            createdAt: block.timestamp,
            status:    Status.Pending,
            payer:     address(0),
            paidAt:    0
        });
        _creatorInvoices[msg.sender].push(id);

        emit InvoiceCreated(id, msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Pay invoice `id`. msg.value must equal invoice.amount exactly.
     *         Payment is forwarded immediately to the creator.
     */
    function payInvoice(uint256 id) external payable {
        Invoice storage inv = _invoices[id];

        if (inv.id == 0)               revert InvoiceNotFound(id);
        if (inv.status == Status.Paid) revert AlreadyPaid(id);
        if (msg.value != inv.amount)   revert IncorrectAmount(inv.amount, msg.value);

        // Checks-Effects-Interactions
        inv.status = Status.Paid;
        inv.payer  = msg.sender;
        inv.paidAt = block.timestamp;

        emit InvoicePaid(id, msg.sender, inv.amount, block.timestamp);

        // Forward immediately — revert whole tx if transfer fails
        (bool ok, ) = inv.creator.call{value: msg.value}("");
        if (!ok) revert TransferFailed();
    }

    /**
     * @notice Return the invoice struct for `id`.
     */
    function getInvoice(uint256 id)
        external
        view
        returns (Invoice memory)
    {
        if (_invoices[id].id == 0) revert InvoiceNotFound(id);
        return _invoices[id];
    }

    /**
     * @notice Return a page of invoice ids created by `creator`.
     * @param offset  Start index (0-based) within the creator's list.
     * @param limit   Maximum number of ids to return.
     */
    function getInvoicesByCreator(
        address creator,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory ids) {
        uint256[] storage all = _creatorInvoices[creator];
        uint256 total = all.length;

        if (offset >= total || limit == 0) return new uint256[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 len = end - offset;

        ids = new uint256[](len);
        for (uint256 i; i < len; ++i) {
            ids[i] = all[offset + i];
        }
    }

    /**
     * @notice Total number of invoices ever created by `creator`.
     */
    function creatorInvoiceCount(address creator) external view returns (uint256) {
        return _creatorInvoices[creator].length;
    }

    // Reject plain ETH transfers to the contract itself
    receive() external payable { revert("Use payInvoice"); }
    fallback() external payable { revert("Use payInvoice"); }
}
