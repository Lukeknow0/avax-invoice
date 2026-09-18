// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/InvoiceRegistry.sol";

contract InvoiceRegistryTest is Test {
    InvoiceRegistry reg;

    address creator = makeAddr("creator");
    address payer   = makeAddr("payer");
    address other   = makeAddr("other");

    // A helper that deploys a revert-on-receive contract
    RejectEther rejector;

    function setUp() public {
        reg      = new InvoiceRegistry();
        rejector = new RejectEther();
        vm.deal(payer,  100 ether);
        vm.deal(other,  100 ether);
        vm.deal(creator, 1 ether);
    }

    // ─── createInvoice ───────────────────────────────────────────────────────

    function test_create_basic() public {
        vm.prank(creator);
        uint256 id = reg.createInvoice(1 ether);
        assertEq(id, 1);

        InvoiceRegistry.Invoice memory inv = reg.getInvoice(id);
        assertEq(inv.id,      1);
        assertEq(inv.creator, creator);
        assertEq(inv.amount,  1 ether);
        assertEq(uint8(inv.status), uint8(InvoiceRegistry.Status.Pending));
        assertEq(inv.payer,   address(0));
        assertEq(inv.paidAt,  0);
    }

    function test_create_emits_event() public {
        vm.prank(creator);
        vm.expectEmit(true, true, false, true);
        emit InvoiceRegistry.InvoiceCreated(1, creator, 0.5 ether, block.timestamp);
        reg.createInvoice(0.5 ether);
    }

    function test_create_zero_reverts() public {
        vm.prank(creator);
        vm.expectRevert(InvoiceRegistry.ZeroAmount.selector);
        reg.createInvoice(0);
    }

    function test_create_multiple_increments_id() public {
        vm.startPrank(creator);
        uint256 id1 = reg.createInvoice(1 ether);
        uint256 id2 = reg.createInvoice(2 ether);
        uint256 id3 = reg.createInvoice(3 ether);
        vm.stopPrank();
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(id3, 3);
    }

    // ─── payInvoice ──────────────────────────────────────────────────────────

    function test_pay_happy_path() public {
        vm.prank(creator);
        uint256 id = reg.createInvoice(1 ether);

        uint256 balBefore = creator.balance;

        vm.prank(payer);
        reg.payInvoice{value: 1 ether}(id);

        InvoiceRegistry.Invoice memory inv = reg.getInvoice(id);
        assertEq(uint8(inv.status), uint8(InvoiceRegistry.Status.Paid));
        assertEq(inv.payer, payer);
        assertGt(inv.paidAt, 0);
        // Creator received the ETH
        assertEq(creator.balance, balBefore + 1 ether);
    }

    function test_pay_emits_event() public {
        vm.prank(creator);
        uint256 id = reg.createInvoice(1 ether);

        vm.prank(payer);
        vm.expectEmit(true, true, false, true);
        emit InvoiceRegistry.InvoicePaid(id, payer, 1 ether, block.timestamp);
        reg.payInvoice{value: 1 ether}(id);
    }

    function test_pay_nonexistent_reverts() public {
        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSelector(InvoiceRegistry.InvoiceNotFound.selector, 999));
        reg.payInvoice{value: 1 ether}(999);
    }

    function test_pay_already_paid_reverts() public {
        vm.prank(creator);
        uint256 id = reg.createInvoice(1 ether);

        vm.prank(payer);
        reg.payInvoice{value: 1 ether}(id);

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(InvoiceRegistry.AlreadyPaid.selector, id));
        reg.payInvoice{value: 1 ether}(id);
    }

    function test_pay_underpay_reverts() public {
        vm.prank(creator);
        uint256 id = reg.createInvoice(1 ether);

        vm.prank(payer);
        vm.expectRevert(
            abi.encodeWithSelector(InvoiceRegistry.IncorrectAmount.selector, 1 ether, 0.5 ether)
        );
        reg.payInvoice{value: 0.5 ether}(id);
    }

    function test_pay_overpay_reverts() public {
        vm.prank(creator);
        uint256 id = reg.createInvoice(1 ether);

        vm.prank(payer);
        vm.expectRevert(
            abi.encodeWithSelector(InvoiceRegistry.IncorrectAmount.selector, 1 ether, 2 ether)
        );
        reg.payInvoice{value: 2 ether}(id);
    }

    function test_pay_still_pending_if_transfer_fails() public {
        // Creator is a contract that rejects ETH — payment must revert
        vm.prank(address(rejector));
        uint256 id = reg.createInvoice(1 ether);

        vm.prank(payer);
        vm.expectRevert(InvoiceRegistry.TransferFailed.selector);
        reg.payInvoice{value: 1 ether}(id);

        // Invoice must still be Pending after revert
        InvoiceRegistry.Invoice memory inv = reg.getInvoice(id);
        assertEq(uint8(inv.status), uint8(InvoiceRegistry.Status.Pending));
    }

    function test_no_reentrancy_double_pay() public {
        // Attacker contract tries to re-enter payInvoice in receive()
        Attacker attacker = new Attacker(reg);
        vm.deal(address(attacker), 10 ether);

        vm.prank(creator);
        uint256 id = reg.createInvoice(1 ether);

        // Should revert — second call in receive() hits AlreadyPaid
        vm.expectRevert();
        attacker.attack{value: 1 ether}(id);

        InvoiceRegistry.Invoice memory inv = reg.getInvoice(id);
        // Must still be Pending (whole tx reverted)
        assertEq(uint8(inv.status), uint8(InvoiceRegistry.Status.Pending));
    }

    function test_direct_eth_to_contract_reverts() public {
        vm.expectRevert();
        (bool ok,) = address(reg).call{value: 1 ether}("");
        assertFalse(ok);
    }

    // ─── Pagination ──────────────────────────────────────────────────────────

    function test_getInvoicesByCreator_pagination() public {
        vm.startPrank(creator);
        for (uint256 i; i < 5; ++i) reg.createInvoice(1 ether);
        vm.stopPrank();

        uint256[] memory page1 = reg.getInvoicesByCreator(creator, 0, 3);
        assertEq(page1.length, 3);
        assertEq(page1[0], 1);
        assertEq(page1[2], 3);

        uint256[] memory page2 = reg.getInvoicesByCreator(creator, 3, 3);
        assertEq(page2.length, 2);
        assertEq(page2[0], 4);
        assertEq(page2[1], 5);
    }

    function test_getInvoicesByCreator_empty() public view {
        uint256[] memory ids = reg.getInvoicesByCreator(other, 0, 10);
        assertEq(ids.length, 0);
    }

    function test_getInvoicesByCreator_offset_beyond_end() public {
        vm.prank(creator);
        reg.createInvoice(1 ether);
        uint256[] memory ids = reg.getInvoicesByCreator(creator, 99, 10);
        assertEq(ids.length, 0);
    }

    function test_creatorInvoiceCount() public {
        assertEq(reg.creatorInvoiceCount(creator), 0);
        vm.prank(creator);
        reg.createInvoice(1 ether);
        assertEq(reg.creatorInvoiceCount(creator), 1);
    }

    // ─── Race: two payers try the same invoice ────────────────────────────────

    function test_race_only_first_payer_wins() public {
        vm.prank(creator);
        uint256 id = reg.createInvoice(1 ether);

        // First payer succeeds
        vm.prank(payer);
        reg.payInvoice{value: 1 ether}(id);

        // Second payer gets AlreadyPaid
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(InvoiceRegistry.AlreadyPaid.selector, id));
        reg.payInvoice{value: 1 ether}(id);
    }

    // ─── Fuzz ────────────────────────────────────────────────────────────────

    function testFuzz_create_and_pay(uint256 amount) public {
        amount = bound(amount, 1, 1000 ether);
        vm.deal(payer, amount);

        vm.prank(creator);
        uint256 id = reg.createInvoice(amount);

        uint256 balBefore = creator.balance;
        vm.prank(payer);
        reg.payInvoice{value: amount}(id);

        assertEq(creator.balance, balBefore + amount);
        assertEq(uint8(reg.getInvoice(id).status), uint8(InvoiceRegistry.Status.Paid));
    }
}

// ─── Helper contracts ────────────────────────────────────────────────────────

/// @dev Refuses any incoming ETH
contract RejectEther {
    receive() external payable { revert("I reject ETH"); }
}

/// @dev Tries to re-enter payInvoice in receive()
contract Attacker {
    InvoiceRegistry immutable target;
    uint256 attackId;

    constructor(InvoiceRegistry _target) { target = _target; }

    function attack(uint256 id) external payable {
        attackId = id;
        target.payInvoice{value: msg.value}(id);
    }

    receive() external payable {
        // Attempt re-entry — should fail with AlreadyPaid
        target.payInvoice{value: msg.value}(attackId);
    }
}
