"""Build the six-page, 16:9 Avax Invoice judge deck PDF (requires reportlab)."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase.pdfmetrics import stringWidth

OUT = Path(__file__).parent / "assets" / "avax-invoice-pitch.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)
W, H = 1280, 720
BG = HexColor("#101114")
PANEL = HexColor("#1b1c21")
LINE = HexColor("#383940")
WHITE = HexColor("#f4f3f0")
MUTED = HexColor("#b6b7be")
DIM = HexColor("#85868e")
RED = HexColor("#e84142")
PINK = HexColor("#ff7772")
GREEN = HexColor("#7ad7a0")

c = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
c.setTitle("Avax Invoice - Avalanche Buildathon Pitch")
c.setAuthor("Lukeknow0")


def txt(x, y, s, size=16, color=WHITE, bold=False, font=None):
    c.setFillColor(color)
    c.setFont(font or ("Helvetica-Bold" if bold else "Helvetica"), size)
    c.drawString(x, y, s)


def para(x, y, s, width, size=16, color=MUTED, leading=None, bold=False):
    leading = leading or size * 1.42
    font = "Helvetica-Bold" if bold else "Helvetica"
    words = s.split()
    lines, line = [], ""
    for word in words:
        candidate = word if not line else line + " " + word
        if stringWidth(candidate, font, size) <= width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    for i, item in enumerate(lines):
        txt(x, y - i * leading, item, size, color, bold)
    return y - len(lines) * leading


def rect(x, y, w, h, fill=PANEL, stroke=LINE, radius=12, sw=1):
    c.setLineWidth(sw)
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def link(x, y, label, url, size=14, w=500):
    txt(x, y, label, size, WHITE, True)
    txt(x + w - 24, y, ">", size, PINK, True)
    c.linkURL(url, (x, y - 5, x + w, y + size + 5), relative=0, thickness=0)


def base(section, n):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(HexColor("#231619"))
    c.circle(1160, 700, 260, fill=1, stroke=0)
    c.setFillColor(BG)
    c.circle(1130, 708, 244, fill=1, stroke=0)
    c.setFillColor(RED)
    c.roundRect(72, 662, 23, 23, 6, fill=1, stroke=0)
    txt(78, 669, "A", 14, WHITE, True)
    txt(107, 669, "AVAX INVOICE", 11, WHITE, True)
    txt(268, 669, section.upper(), 10, MUTED)
    txt(1143, 669, f"{n:02d} / 06", 10, DIM)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.line(72, 649, 1208, 649)
    c.line(72, 48, 1208, 48)
    txt(72, 29, "AVALANCHE FUJI TESTNET  |  CHAIN ID 43113  |  NO REAL ECONOMIC VALUE", 8, DIM)
    txt(1176, 29, f"{n:02d}", 8, DIM)


def title(kicker, headline, sub=None, size=43):
    txt(76, 595, kicker.upper(), 10, PINK, True)
    txt(76, 532, headline[0], size, WHITE, True)
    if len(headline) > 1:
        txt(76, 478, headline[1], size, PINK, True)
    if sub:
        para(76, 433 if len(headline) > 1 else 475, sub, 690, 16, MUTED, 23)

# 1 / Promise
base("Non-custodial payment requests", 1)
txt(78, 558, "NON-CUSTODIAL PAYMENTS", 11, MUTED, True)
txt(76, 466, "A payment request", 53, WHITE, True)
txt(76, 401, "that settles on-chain.", 53, PINK, True)
para(78, 350, "Create an invoice. Pay the exact amount. Verify the receipt on Avalanche.", 555, 18, MUTED, 27)
for x, label in [(78, "AVALANCHE FUJI"), (240, "OPEN SOURCE"), (382, "0.01 AVAX TESTNET PROOF")]:
    rect(x, 274, 144 if x != 382 else 203, 32, HexColor("#191a1f"), LINE, 15)
    txt(x + 12, 285, label, 8, MUTED)
# invoice illustration
c.setStrokeColor(HexColor("#393a40")); c.ellipse(736, 187, 1196, 520, stroke=1, fill=0)
c.setStrokeColor(HexColor("#292a30")); c.ellipse(700, 160, 1235, 551, stroke=1, fill=0)
rect(814, 228, 300, 263, HexColor("#1b1c21"), HexColor("#494a51"), 18, 1.2)
txt(840, 455, "INVOICE #0001", 10, MUTED, True); txt(1040, 455, "PAID", 10, GREEN, True)
txt(840, 382, "0.01", 45, WHITE, True); txt(970, 387, "AVAX", 13, MUTED, True)
c.setStrokeColor(LINE); c.line(840, 357, 1085, 357)
txt(840, 329, "NETWORK", 8, DIM); txt(1005, 329, "FUJI / 43113", 9, WHITE)
txt(840, 302, "SETTLEMENT", 8, DIM); txt(1005, 302, "ON-CHAIN RECORD", 9, GREEN)
txt(840, 258, "SAME-TRANSACTION FORWARDING", 8, DIM)
rect(710, 375, 100, 34, HexColor("#1b1c21"), LINE, 8); txt(725, 387, "CREATOR", 8, MUTED, True)
rect(1118, 277, 100, 34, HexColor("#241a1c"), HexColor("#754144"), 8); txt(1134, 289, "PAYER", 8, MUTED, True)
txt(78, 71, "Payments without an intermediate platform balance.", 11, MUTED)
c.showPage()

# 2 / Example workflow and user pain
base("The problem", 2)
txt(76, 590, "AN ILLUSTRATIVE USER SCENARIO", 10, PINK, True)
txt(76, 526, "Getting paid should not mean", 39, WHITE, True)
txt(76, 477, "giving up the receipt.", 39, PINK, True)
para(76, 430, "A freelance Web3 contributor finishes a delivery and needs a precise payment request. The client wants a receipt both sides can inspect.", 520, 17, MUTED, 24)
items = [
    ("01", "Request clarity", "A shareable request carries an exact amount and a clear payment target."),
    ("02", "Settlement confidence", "Both parties can inspect the on-chain result, not only a platform status."),
    ("03", "Less custody", "Funds forward to the creator in the payment transaction; no platform balance is held between transactions."),
]
y = 365
for no, head, body in items:
    c.setStrokeColor(LINE); c.line(680, y + 25, 1196, y + 25)
    txt(690, y, no, 11, PINK, True)
    txt(742, y, head, 16, WHITE, True)
    para(742, y - 25, body, 420, 11, MUTED, 16)
    y -= 112
c.setStrokeColor(LINE); c.line(680, y + 25, 1196, y + 25)
txt(690, 75, "FOCUSED PAYMENT REQUEST + RECEIPT  |  NO MARKET-SIZE CLAIMS", 9, DIM)
c.showPage()

# 3 / mechanism
base("How it works", 3)
txt(76, 590, "A DIRECT PATH FROM REQUEST TO RECEIPT", 10, PINK, True)
txt(76, 526, "One contract call.", 43, WHITE, True)
txt(76, 473, "One verifiable settlement.", 43, PINK, True)
steps = [
    ("01", "Create", "Creator sets an amount and shares a payment-request link.", "INVOICE REGISTRY"),
    ("02", "Pay exact", "Payer confirms the specified native AVAX amount.", "FUJI C-CHAIN"),
    ("03", "Forward", "Contract marks paid and forwards funds to creator in the same transaction.", "NO INTERMEDIATE BALANCE"),
    ("04", "Inspect", "Both sides can inspect the public chain record.", "EXPLORER LINK"),
]
xs = [76, 368, 660, 952]
for i, (no, head, body, foot) in enumerate(steps):
    rect(xs[i], 256, 252, 165, HexColor("#21191b") if i == 2 else PANEL, HexColor("#874143") if i == 2 else LINE, 12)
    txt(xs[i] + 18, 389, no, 10, PINK, True)
    txt(xs[i] + 18, 353, head, 19, WHITE, True)
    para(xs[i] + 18, 326, body, 216, 10, MUTED, 15)
    txt(xs[i] + 18, 275, foot, 7, DIM, True)
    if i < 3: txt(xs[i] + 263, 327, ">", 20, PINK, True)
rect(76, 153, 1128, 62, HexColor("#17181d"), LINE, 8)
txt(94, 187, "CHECKS-EFFECTS-INTERACTIONS", 9, PINK, True)
para(330, 190, "State updates before transfer. If the recipient transfer fails, the whole transaction reverts.", 835, 10, MUTED, 14)
link(76, 99, "Review the public source code", "https://github.com/Lukeknow0/avax-invoice", 10, 300)
c.showPage()

# 4 / proof
base("Fuji testnet evidence", 4)
txt(76, 590, "RECORDED FUJI TESTNET WALKTHROUGH", 10, PINK, True)
txt(76, 526, "A receipt you can", 43, WHITE, True)
txt(76, 473, "open and inspect.", 43, PINK, True)
para(76, 430, "Invoice #1 | 0.01 AVAX | Avalanche Fuji C-Chain (43113). Hashes are provided for independent inspection; this deck does not claim an independent explorer re-check.", 580, 16, MUTED, 22)
proofs = [
    ("01", "Invoice creation transaction", "https://testnet.snowtrace.io/tx/0xdbd31002683320b9e39507f345bd34139afbf28239fe90ebe23fb65c2bde6555"),
    ("02", "Payment transaction", "https://testnet.snowtrace.io/tx/0x136099029a0df4ed7d3321eee25db33985590c05493114ca431817b367bf3cd6"),
    ("03", "InvoiceRegistry contract", "https://testnet.snowtrace.io/address/0xBbF1Ff4085682F708e12B9c9b06EfbB268e78e05"),
]
y = 350
for no, label, url in proofs:
    c.setStrokeColor(LINE); c.line(76, y + 17, 687, y + 17)
    txt(84, y - 5, no, 10, PINK, True); txt(128, y - 5, label, 13, WHITE, True); txt(658, y - 5, ">", 14, PINK, True)
    c.linkURL(url, (76, y - 12, 687, y + 20), relative=0, thickness=0)
    y -= 52
rect(763, 285, 430, 203, HexColor("#1b1c21"), LINE, 13)
txt(789, 455, "SETTLEMENT RECORD", 9, MUTED, True); txt(1092, 455, "FUJI", 9, GREEN, True)
txt(789, 391, "0.01 AVAX", 37, WHITE, True)
txt(789, 355, "PAID  |  INVOICE #1  |  C-CHAIN 43113", 10, GREEN, True)
c.setStrokeColor(LINE); c.line(789, 338, 1166, 338)
txt(789, 314, "CONTRACT", 8, DIM); txt(934, 314, "0xBbF1...8e05", 9, WHITE)
txt(789, 292, "PAYMENT TX", 8, DIM); txt(934, 292, "0x1360...3cd6", 9, WHITE)
rect(76, 158, 1117, 76, HexColor("#211b18"), HexColor("#634238"), 8)
txt(94, 205, "PROOF BOUNDARY", 9, HexColor("#e6b19a"), True)
para(250, 207, "The published walkthrough used the same funded test wallet as creator and payer. It documents the contract flow, not independent two-user adoption or real revenue.", 914, 10, MUTED, 15)
c.showPage()

# 5 / product and links
base("Try the product", 5)
txt(76, 590, "A SMALL, RUNNABLE PROTOTYPE", 10, PINK, True)
txt(76, 526, "From request page", 42, WHITE, True)
txt(76, 473, "to chain receipt.", 42, PINK, True)
para(76, 430, "Open the hosted Fuji demo, inspect the source, or use the recorded walkthrough as a fallback.", 445, 16, MUTED, 22)
links = [
    ("OPEN THE DAPP", "https://lukeknow0.github.io/avax-invoice/"),
    ("SOURCE CODE ON GITHUB", "https://github.com/Lukeknow0/avax-invoice"),
    ("RECORDED DEMO VIDEO | FALLBACK", "https://github.com/Lukeknow0/avax-invoice/releases/tag/v1.0.0"),
]
y = 342
for label, url in links:
    rect(76, y - 13, 455, 46, HexColor("#1d191b") if y == 342 else PANEL, HexColor("#784143") if y == 342 else LINE, 7)
    txt(94, y + 3, label, 10, PINK if y == 342 else WHITE, True)
    txt(500, y + 3, ">", 12, PINK, True)
    c.linkURL(url, (76, y - 13, 531, y + 33), relative=0, thickness=0)
    y -= 61
# Illustrative, not a screenshot
rect(616, 194, 576, 294, HexColor("#17181d"), HexColor("#414249"), 12)
c.setFillColor(HexColor("#24252b")); c.roundRect(617, 454, 574, 33, 10, fill=1, stroke=0)
for j, col in enumerate((HexColor("#ed625d"), HexColor("#e6ae4c"), HexColor("#64ba77"))):
    c.setFillColor(col); c.circle(638 + j * 15, 470, 4, fill=1, stroke=0)
txt(696, 466, "lukeknow0.github.io / avax-invoice", 8, MUTED)
txt(653, 392, "Payment,", 33, WHITE, True); txt(653, 351, "with proof.", 33, PINK, True)
para(653, 324, "Illustrative product view | payment request + on-chain receipt, not a legal invoice.", 455, 10, MUTED, 15)
rect(653, 250, 154, 33, RED, RED, 5); txt(667, 262, "CREATE REQUEST >", 8, WHITE, True)
rect(818, 250, 173, 33, PANEL, LINE, 5); txt(832, 262, "VIEW CHAIN RECORD", 8, WHITE, True)
rect(653, 209, 506, 27, HexColor("#202127"), LINE, 5); txt(668, 218, "RECORDED TESTNET RECEIPT  |  0.01 AVAX  |  INVOICE #1", 8, MUTED)
txt(76, 92, "RECORDED VIDEO IS A FALLBACK, NOT A LIVE SESSION.", 9, DIM, True)
c.showPage()

# 6 / limits and next steps
base("Scope and next step", 6)
txt(76, 590, "HONEST SCOPE | CLEAR NEXT STEP", 10, PINK, True)
txt(76, 526, "A focused prototype.", 41, WHITE, True)
txt(76, 474, "Ready for a two-wallet test.", 34, PINK, True)
para(76, 430, "Next: validate the creator-to-payer journey with two independent wallets, then test usability and operational safeguards. The published demo is a single-wallet flow.", 560, 15, MUTED, 21)
for i, s in enumerate(("1  TWO-WALLET WALKTHROUGH", "2  EDGE-CASE REVIEW", "3  USER FEEDBACK")):
    x = 76 + i * 192
    rect(x, 313, 178, 30, HexColor("#191a1f"), LINE, 15)
    txt(x + 11, 324, s, 7, MUTED, True)
rect(681, 172, 512, 320, HexColor("#1b1c21"), LINE, 12)
txt(705, 461, "CURRENT SCOPE & LIMITATIONS", 9, MUTED, True)
rows = [
    ("+", "Fuji testnet only", "Chain ID 43113; test assets have no real value"),
    ("+", "Native AVAX forwarding", "No intermediate platform balance between transactions"),
    ("!", "Payment request + receipt", "Not a legal/tax invoice; no descriptions or due dates"),
    ("!", "No refund, cancel, or expiry flow", "Native AVAX only; no ERC-20 support"),
    ("!", "Prototype, not production infrastructure", "Published test walkthrough uses one wallet"),
]
y = 423
for mark, head, sub in rows:
    txt(706, y, mark, 12, GREEN if mark == "+" else HexColor("#f4bd79"), True)
    txt(730, y, head, 10, WHITE, True)
    txt(730, y - 17, sub, 8, MUTED)
    y -= 52
link(76, 219, "Contract on Snowtrace", "https://testnet.snowtrace.io/address/0xBbF1Ff4085682F708e12B9c9b06EfbB268e78e05", 10, 370)
link(76, 181, "Try the Fuji DApp", "https://lukeknow0.github.io/avax-invoice/", 10, 370)
txt(76, 91, "AVAX INVOICE  |  REQUEST - SETTLE - VERIFY", 10, MUTED, True)
c.save()
print(f"created {OUT} ({OUT.stat().st_size} bytes)")
