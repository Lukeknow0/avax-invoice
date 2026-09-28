# Avax Invoice Pitch Deck Implementation Plan

> **For agentic workers:** Execute inline in this session; use the approved design specification as source of truth.

**Goal:** Publish a six-slide judge-facing Pitch Deck and downloadable PDF for the already-submitted Avax Invoice project, then add the URL to its existing Builder Hub submission.

**Architecture:** Build a self-contained static HTML deck under the existing GitHub Pages frontend, with browser navigation and printable slide styles. Render a PDF locally using the available browser/print path. Publish through the existing GitHub Pages workflow, then edit only the existing project's additional-links field in Builder Hub.

**Tech Stack:** HTML, CSS, SVG, existing GitHub Pages deployment, browser rendering/print-to-PDF, Ego Browser.

## Global Constraints

- The deck has exactly six content slides and an English judge-facing narrative.
- Disclose Fuji testnet, Chain ID 43113, no real economic value, and non-legal-invoice status.
- Explicitly disclose the currently documented proof uses one wallet as creator and payer.
- Do not invent traction, multi-wallet use, test results, transaction outcomes, or production readiness.
- Preserve existing project content and update its existing submission, never create a duplicate.

---

### Task 1: Author deck and local PDF

**Files:**
- Create: `frontend/pitch/index.html`
- Create: `frontend/pitch/deck.css`
- Create: `frontend/pitch/assets/avax-invoice-pitch.pdf`

- [ ] Implement six slides: promise, problem, mechanism, Fuji evidence, product/demo links, limitations/next step.
- [ ] Add keyboard navigation, progress indicator, responsive layout, accessible link labels, and print page breaks.
- [ ] Render the deck at 16:9 viewport and export the six pages to PDF.
- [ ] Verify slide count, PDF page count, links, and text overflow.

### Task 2: Publish and verify public materials

**Files:**
- Modify only existing Pages publishing configuration if required.

- [ ] Run the existing Pages workflow; do not add unrelated site changes.
- [ ] Verify public HTML and PDF return HTTP 200 and render anonymously.
- [ ] Verify DApp, repository, video, contract, and evidence links; label inaccessible explorer detail as unverified rather than asserting receipt validity.

### Task 3: Update existing Builder Hub entry

**Files:**
- None locally.

- [ ] Add the public deck URL to the existing submission's additional links only.
- [ ] Verify the existing event page says “Your project is submitted!” and the deck URL appears in the project record.
- [ ] If changes cannot be saved or submission confirmation disappears, stop and report the observed state; do not retry by creating another project.
