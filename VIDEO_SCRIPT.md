# 3-Minute Demo Script

## 0:00–0:25 — Problem
“Freelancers can receive AVAX directly, but a normal transfer has no canonical invoice, exact-amount rule, or payment receipt. Avax Invoice makes each request a verifiable on-chain payment record.”

Show the landing page and Fuji warning.

## 0:25–0:55 — Why Avalanche
“Avax Invoice runs on Avalanche Fuji C-Chain. The contract creates a request with a fixed AVAX amount, then forwards an exact payment to the creator in the same transaction. No platform custody and no platform fee.”

Show LIVE_DEMO.md and the deployed contract on Snowtrace.

## 0:55–1:40 — Create
Connect a Fuji wallet, open Create invoice, enter a small test amount, submit, and copy the generated invoice URL.

## 1:40–2:25 — Pay
Open the share URL in a second Fuji wallet. Show the fixed amount, pay it, wait for confirmation, then show the Paid receipt with payer and timestamp.

## 2:25–2:50 — Verify
Open the payment transaction in Snowtrace and show the contract address. Mention the recorded live proof in LIVE_DEMO.md.

## 2:50–3:00 — Close
“Avax Invoice turns an AVAX transfer into a clear, exact, non-custodial payment request and on-chain receipt. Next: USDC and recurring payment support.”

## Recording checklist
- Use two Fuji wallets; never show seed phrases, private keys, or .env.
- Use a small test amount.
- Keep the video under 3 minutes.
- Upload as unlisted first; verify the playback URL before pasting it in the submission form.
