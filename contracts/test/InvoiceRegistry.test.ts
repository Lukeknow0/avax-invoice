import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("InvoiceRegistry", () => {
  async function deploy() {
    const [creator, payer, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("InvoiceRegistry");
    const reg: any = await Factory.deploy();
    await reg.waitForDeployment();
    return { reg, creator, payer, other };
  }

  // ── createInvoice ──────────────────────────────────────────────────────────

  it("creates invoice with correct fields", async () => {
    const { reg, creator } = await deploy();
    await reg.connect(creator).createInvoice(ethers.parseEther("1"));
    const inv = await reg.getInvoice(1n);
    expect(inv.id).to.equal(1n);
    expect(inv.creator).to.equal(creator.address);
    expect(inv.amount).to.equal(ethers.parseEther("1"));
    expect(inv.status).to.equal(0n); // Pending
    expect(inv.payer).to.equal(ethers.ZeroAddress);
  });

  it("emits InvoiceCreated event", async () => {
    const { reg, creator } = await deploy();
    await expect(reg.connect(creator).createInvoice(ethers.parseEther("0.5")))
      .to.emit(reg, "InvoiceCreated")
      .withArgs(1n, creator.address, ethers.parseEther("0.5"), (await ethers.provider.getBlock("latest"))!.timestamp + 1);
  });

  it("reverts on zero amount", async () => {
    const { reg, creator } = await deploy();
    await expect(reg.connect(creator).createInvoice(0n))
      .to.be.revertedWithCustomError(reg, "ZeroAmount");
  });

  it("increments ids correctly", async () => {
    const { reg, creator } = await deploy();
    await reg.connect(creator).createInvoice(ethers.parseEther("1"));
    await reg.connect(creator).createInvoice(ethers.parseEther("2"));
    const inv2 = await reg.getInvoice(2n);
    expect(inv2.amount).to.equal(ethers.parseEther("2"));
  });

  // ── payInvoice ─────────────────────────────────────────────────────────────

  it("happy path: payer sends correct amount, creator receives ETH", async () => {
    const { reg, creator, payer } = await deploy();
    await reg.connect(creator).createInvoice(ethers.parseEther("1"));
    const balBefore = await ethers.provider.getBalance(creator.address);

    await reg.connect(payer).payInvoice(1n, { value: ethers.parseEther("1") });

    const inv = await reg.getInvoice(1n);
    expect(inv.status).to.equal(1n); // Paid
    expect(inv.payer).to.equal(payer.address);
    expect(await ethers.provider.getBalance(creator.address)).to.be.gt(balBefore);
  });

  it("emits InvoicePaid event", async () => {
    const { reg, creator, payer } = await deploy();
    await reg.connect(creator).createInvoice(ethers.parseEther("1"));
    await expect(reg.connect(payer).payInvoice(1n, { value: ethers.parseEther("1") }))
      .to.emit(reg, "InvoicePaid");
  });

  it("reverts on non-existent invoice", async () => {
    const { reg, payer } = await deploy();
    await expect(reg.connect(payer).payInvoice(999n, { value: ethers.parseEther("1") }))
      .to.be.revertedWithCustomError(reg, "InvoiceNotFound");
  });

  it("reverts on already paid invoice", async () => {
    const { reg, creator, payer, other } = await deploy();
    await reg.connect(creator).createInvoice(ethers.parseEther("1"));
    await reg.connect(payer).payInvoice(1n, { value: ethers.parseEther("1") });
    await expect(reg.connect(other).payInvoice(1n, { value: ethers.parseEther("1") }))
      .to.be.revertedWithCustomError(reg, "AlreadyPaid");
  });

  it("reverts on underpayment", async () => {
    const { reg, creator, payer } = await deploy();
    await reg.connect(creator).createInvoice(ethers.parseEther("1"));
    await expect(reg.connect(payer).payInvoice(1n, { value: ethers.parseEther("0.5") }))
      .to.be.revertedWithCustomError(reg, "IncorrectAmount");
  });

  it("reverts on overpayment", async () => {
    const { reg, creator, payer } = await deploy();
    await reg.connect(creator).createInvoice(ethers.parseEther("1"));
    await expect(reg.connect(payer).payInvoice(1n, { value: ethers.parseEther("2") }))
      .to.be.revertedWithCustomError(reg, "IncorrectAmount");
  });

  it("reverts when creator contract rejects ETH, invoice stays Pending", async () => {
    const { reg, payer } = await deploy();
    const RejectFactory = await ethers.getContractFactory("RejectEther");
    const rejector: any = await RejectFactory.deploy();
    await rejector.waitForDeployment();
    await rejector.createInvoice(await reg.getAddress(), ethers.parseEther("1"));
    await expect(reg.connect(payer).payInvoice(1n, { value: ethers.parseEther("1") }))
      .to.be.revertedWithCustomError(reg, "TransferFailed");
    expect((await reg.getInvoice(1n)).status).to.equal(0n); // still Pending
  });

  it("only first payer succeeds when two attempt the same invoice", async () => {
    const { reg, creator, payer, other } = await deploy();
    await reg.connect(creator).createInvoice(ethers.parseEther("1"));
    await reg.connect(payer).payInvoice(1n, { value: ethers.parseEther("1") });
    await expect(reg.connect(other).payInvoice(1n, { value: ethers.parseEther("1") }))
      .to.be.revertedWithCustomError(reg, "AlreadyPaid");
  });

  it("rejects direct ETH sent to contract", async () => {
    const { reg, payer } = await deploy();
    await expect(
      payer.sendTransaction({ to: await reg.getAddress(), value: ethers.parseEther("1") })
    ).to.revert(ethers);
  });

  // ── Pagination ─────────────────────────────────────────────────────────────

  it("getInvoicesByCreator returns correct pages", async () => {
    const { reg, creator } = await deploy();
    for (let i = 0; i < 5; i++) {
      await reg.connect(creator).createInvoice(ethers.parseEther("1"));
    }
    const page1 = await reg.getInvoicesByCreator(creator.address, 0n, 3n);
    expect(page1.length).to.equal(3);
    expect(page1[0]).to.equal(1n);
    expect(page1[2]).to.equal(3n);
    const page2 = await reg.getInvoicesByCreator(creator.address, 3n, 3n);
    expect(page2.length).to.equal(2);
    expect(page2[0]).to.equal(4n);
  });

  it("getInvoicesByCreator returns empty for unknown address", async () => {
    const { reg, other } = await deploy();
    const ids = await reg.getInvoicesByCreator(other.address, 0n, 10n);
    expect(ids.length).to.equal(0);
  });

  it("creatorInvoiceCount tracks correctly", async () => {
    const { reg, creator } = await deploy();
    expect(await reg.creatorInvoiceCount(creator.address)).to.equal(0n);
    await reg.connect(creator).createInvoice(ethers.parseEther("1"));
    expect(await reg.creatorInvoiceCount(creator.address)).to.equal(1n);
  });
});
