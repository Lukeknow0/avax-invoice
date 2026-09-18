# Live Fuji Demo Evidence

## Deployment
- Network: Avalanche Fuji C-Chain (Chain ID 43113)
- Contract: [InvoiceRegistry on Snowtrace](https://testnet.snowtrace.io/address/0xBbF1Ff4085682F708e12B9c9b06EfbB268e78e05)
- Deployment transaction: [0x7bce…6e00](https://testnet.snowtrace.io/tx/0x7bce48519bb74780f60346504405e3c8cc95f674407747f4e3e038297c396e00)

## End-to-end payment proof
A real Fuji invoice was created and paid. The same test wallet was used as creator and payer only to avoid requiring a second funded test wallet; the 0.01 AVAX payment was immediately forwarded back to the creator, with only testnet gas consumed.

- Invoice ID: 1
- Amount: 0.01 AVAX
- Result: Paid
- Create transaction: [0xdbd3…6555](https://testnet.snowtrace.io/tx/0xdbd31002683320b9e39507f345bd34139afbf28239fe90ebe23fb65c2bde6555)
- Payment transaction: [0x1360…3cd6](https://testnet.snowtrace.io/tx/0x136099029a0df4ed7d3321eee25db33985590c05493114ca431817b367bf3cd6)

## Reproduce
1. Open the frontend through a static HTTP server.
2. Connect a wallet on Avalanche Fuji.
3. Create an invoice, open its share URL in a second wallet, and pay the exact AVAX amount.
4. Verify the Paid state in the app and on Snowtrace.

> This is a Fuji testnet demonstration. It is not a production payment service or a legal/tax invoice.
