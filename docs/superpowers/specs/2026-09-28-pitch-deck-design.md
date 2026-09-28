# Avax Invoice Buildathon Pitch Deck — Design

## Objective and audience
Create a judge-facing, six-slide English presentation for the already-submitted Avax Invoice project. The deck must be usable through a public URL before the conservative 2026-09-30 20:00 Asia/Shanghai deadline, and have a downloadable fallback. Do not change the contract or imply unproven production readiness.

## Content arc
1. **Cover / promise:** non-custodial on-chain payment requests and independently verifiable receipts on Avalanche Fuji.
2. **Problem:** freelancers and Web3 creators need a verifiable payment request and settlement record without a custodial platform; avoid unsupported market-size claims.
3. **Mechanism:** creator creates an invoice → payer calls exact-amount payment → contract updates status and atomically forwards native AVAX to the creator → either party checks the chain record. The contract is a testnet prototype, not a legal tax invoice.
4. **Live evidence:** Fuji chain ID 43113, InvoiceRegistry `0xBbF1Ff4085682F708e12B9c9b06EfbB268e78e05`, invoice #1 / 0.01 AVAX, creation transaction `0xdbd31002683320b9e39507f345bd34139afbf28239fe90ebe23fb65c2bde6555`, payment transaction `0x136099029a0df4ed7d3321eee25db33985590c05493114ca431817b367bf3cd6`. Explicitly disclose that the same funded test wallet was both creator and payer in this published proof.
5. **Product/demo:** visible flow and public links to DApp, open-source repository, existing demo video, and verification; video/recording labeled as recorded fallback, not live execution.
6. **Scope / next step:** 16 contract tests are asserted by existing README and must be freshly verified if repeated as current fact; testnet-only, no real economic value, non-custodial protocol, not a production payment processor. Next step is a two-wallet independent-user walkthrough and usability/security hardening, described as future work.

## Visual and delivery approach
Use the installed html-ppt skill's existing `pitch-deck` full-deck template as the structural starting point, restyled to a dark charcoal/Avalanche-red technical editorial tone aligned with the current DApp. Keep each slide legible at projector scale with one message and a small number of concrete facts. Source images only from the project's existing public pages/assets or newly captured truthful screenshots. Host the static slide deck under the existing GitHub Pages site (for example `/avax-invoice/pitch/`), and provide a downloadable PDF export. Both forms must have working links and render without private credentials.

## Submission integration
Add the hosted slide URL as an additional `Demo and Other Links` entry in the existing Builder Hub project submission. Preserve the existing repository, DApp, demo/video, tracks, and project description. If the form requires re-submission, use its existing edit flow and verify the official event page still says `Your project is submitted!`; do not create a duplicate project. Capture the final URL/confirmation, and treat any 69% progress indication separately from the event page's explicit submitted state.

## Verification and failure behavior
Before adding a link, render every slide, review overflow/click targets, check the online deck and PDF as an unauthenticated viewer, and verify public DApp/repo/video paths. Validate that on-chain transaction links exist where the explorer permits; if explorer access is blocked, label that check unverified and retain hashes without inventing a result. Do not state a payment came from a distinct payer. If GitHub Pages publication or Builder Hub edit cannot be confirmed, stop and report the precise remaining manual action rather than claiming a complete submission.

## Scope boundaries
No new contract features, wallet transfers, redeployment, Task 7 homework, leaderboard/payout claims, or modifications to unrelated hackathon state. The local `.hackathon-state.json` is revision 61 and has no Avalanche Buildathon entry; do not edit it by hand.
