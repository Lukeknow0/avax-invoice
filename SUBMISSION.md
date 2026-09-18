# Project Submission Draft: Avax Invoice

## 1. Tagline
Avax Invoice: Sub-second non-custodial on-chain payment requests and immutable receipt verification on Avalanche.

## 2. Problem Statement
Freelancers, digital nomads, and independent Web3 contributors face a dilemma when requesting payments:
- Traditional web2 payment platforms freeze accounts, charge 3-7% foreign exchange and processing fees, and enforce multi-day withdrawal holds.
- Direct wallet-to-wallet transfers lack verifiable context: payers forget invoice IDs, pay the wrong amount, or dispute transaction details with no canonical on-chain link between an obligation and a transaction hash.

## 3. The Solution
Avax Invoice is an open-source, non-custodial payment protocol designed specifically for Avalanche C-Chain:
1. **Zero-custody Direct Routing**: Payers send AVAX into the contract; the contract guarantees immediate atomic forwarding to the creator's address in the exact same transaction.
2. **Deterministic Amount Gating**: The contract strictly rejects underpayments and overpayments, preventing billing mismatches.
3. **Dual-Audit Receipts**: Both creator and payer receive an immutable on-chain record linked to the exact timestamp, payment address, and Snowtrace explorer block explorer URL.
4. **Leveraging Avalanche Sub-Second Finality**: Invoices update from `Pending` to `Paid` almost instantaneously, delivering a POS-like checkout experience.

## 4. Avalanche Integration Details
- **Network**: Avalanche Fuji Testnet (Chain ID: 43113)
- **RPC Endpoint**: `https://api.avax-test.network/ext/bc/C/rpc`
- **Solidity Version**: `0.8.30`
- **Smart Contract Pattern**: Checks-Effects-Interactions (CEI), exact-value enforcement, and zero-platform-fee design.

## 5. What Was Built
- **InvoiceRegistry.sol**: Core registry managing invoice state machine (`createInvoice`, `payInvoice`, `getInvoice`, `getInvoicesByCreator`).
- **Comprehensive Test Suite**: 16 unit tests covering happy paths, exact-amount validation, duplicate-payment rejection, race conditions, pagination, and recipient transfer failure rollbacks.
- **Frontend DApp**:
  - `index.html`: Value proposition and interactive navigation.
  - `create.html`: Real-time invoice generator with one-click shareable URL.
  - `invoice.html`: Dedicated payment gateway and verifiable cryptographic receipt.
  - `dashboard.html`: Historical invoice ledger with live status filtering.

## 6. What's Next
- Multi-token support (native USDC on Avalanche).
- Recurring streaming payments using Avalanche Teleporter across custom L1s.
- Encrypted memo fields via IPFS/EIP-712 for enterprise NDA requirements.
