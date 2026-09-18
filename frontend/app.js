import { FUJI_CHAIN_ID, FUJI_HEX_CHAIN_ID, FUJI_RPC_URL, FUJI_EXPLORER, DEFAULT_CONTRACT_ADDRESS, INVOICE_REGISTRY_ABI } from "./config.js";
import { DEPLOYED_CONTRACT_ADDRESS } from "./deployment.js";

// Local override is useful for testing; normal deployments update deployment.js.
const contractAddress = localStorage.getItem("AVAX_INVOICE_CONTRACT") || DEPLOYED_CONTRACT_ADDRESS || DEFAULT_CONTRACT_ADDRESS;

let userAddress = null;
let provider = null;
let signer = null;

// Read-only JSON-RPC provider for Fuji
const readOnlyProvider = new ethers.JsonRpcProvider(FUJI_RPC_URL);

// Initialize contract instance
export function getContract(signerOrProvider) {
  if (!ethers.isAddress(contractAddress) || contractAddress === ethers.ZeroAddress) {
    throw new Error("Fuji 合约尚未部署，请先运行 deploy:fuji");
  }
  return new ethers.Contract(contractAddress, INVOICE_REGISTRY_ABI, signerOrProvider || readOnlyProvider);
}

// ── Wallet Management ────────────────────────────────────────────────────────

async function initWallet() {
  if (!window.ethereum) {
    console.log("No web3 wallet detected");
    return;
  }
  provider = new ethers.BrowserProvider(window.ethereum);
  try {
    const accounts = await provider.listAccounts();
    const network = await provider.getNetwork();
    if (accounts.length > 0 && network.chainId === BigInt(FUJI_CHAIN_ID)) {
      signer = await provider.getSigner();
      userAddress = await signer.getAddress();
      renderWalletConnected(userAddress);
    }
  } catch (e) {
    console.error("Wallet check error:", e);
  }

  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      userAddress = null;
      renderWalletDisconnected();
    } else {
      location.reload();
    }
  });

  window.ethereum.on("chainChanged", () => {
    location.reload();
  });
}

export async function connectWallet() {
  if (!window.ethereum) {
    alert("未检测到 Web3 钱包，请在电脑端安装 Core Wallet 或 MetaMask 插件，或使用 Web3 浏览器打开！");
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    // Request network switch to Fuji
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(FUJI_CHAIN_ID)) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: FUJI_HEX_CHAIN_ID }],
        });
      } catch (switchError) {
        // If chain not added to wallet, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: FUJI_HEX_CHAIN_ID,
              chainName: "Avalanche Fuji Testnet",
              nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
              rpcUrls: [FUJI_RPC_URL],
              blockExplorerUrls: [FUJI_EXPLORER],
            }],
          });
        } else {
          throw switchError;
        }
      }
    }
    const accounts = await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = accounts[0];
    renderWalletConnected(userAddress);
  } catch (err) {
    console.error("Connect wallet error:", err);
    alert("连接钱包失败: " + (err.message || err));
  }
}

function renderWalletConnected(addr) {
  const box = document.getElementById("walletBox");
  if (box) {
    const shortAddr = addr.slice(0, 6) + "..." + addr.slice(-4);
    box.innerHTML = `
      <div class="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span class="text-slate-200">${shortAddr}</span>
      </div>
    `;
  }
  // If on create.html, populate payee
  const payeeDisplay = document.getElementById("payeeDisplay");
  if (payeeDisplay) {
    payeeDisplay.textContent = addr;
    payeeDisplay.className = "bg-slate-950 border border-emerald-800/40 rounded-xl px-4 py-3 text-xs text-emerald-400 font-mono break-all";
  }
  const submitCreateBtn = document.getElementById("submitCreateBtn");
  if (submitCreateBtn) submitCreateBtn.disabled = false;

  // If on dashboard, load invoices
  if (window.location.pathname.includes("dashboard.html")) {
    loadDashboardInvoices(addr);
  }
}

function renderWalletDisconnected() {
  const box = document.getElementById("walletBox");
  if (box) {
    box.innerHTML = `<button id="connectBtn" class="btn-avax text-sm font-medium px-4 py-2 rounded-xl shadow-md">连接钱包</button>`;
    document.getElementById("connectBtn")?.addEventListener("click", connectWallet);
  }
}

// ── Create Page Logic ────────────────────────────────────────────────────────

function setupCreatePage() {
  const submitBtn = document.getElementById("submitCreateBtn");
  const amountInput = document.getElementById("amountInput");
  const statusBox = document.getElementById("createStatus");
  const resultCard = document.getElementById("resultCard");

  if (!submitBtn) return;

  submitBtn.addEventListener("click", async () => {
    const val = amountInput.value.trim();
    if (!val || parseFloat(val) <= 0) {
      alert("请输入有效的收款金额！");
      return;
    }
    if (!signer) {
      alert("请先连接钱包！");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "正在提交到 Avalanche 节点...";
      statusBox.className = "mt-4 p-4 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-300";
      statusBox.innerHTML = "⏳ 正在唤起钱包确认创建交易，请在钱包中批准签名...";
      statusBox.classList.remove("hidden");

      const contract = getContract(signer);
      const parsedAmount = ethers.parseEther(val);

      const tx = await contract.createInvoice(parsedAmount);
      statusBox.innerHTML = `⛏ 交易已广播: <a href="${FUJI_EXPLORER}/tx/${tx.hash}" target="_blank" class="text-red-400 underline">${tx.hash.slice(0, 10)}...</a>，正在等待区块打包...`;

      const receipt = await tx.wait();
      statusBox.innerHTML = "✅ 链上确认成功！正在读取生成的账单编号...";

      // Parse InvoiceCreated event
      let invoiceId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === "InvoiceCreated") {
            invoiceId = parsed.args.id.toString();
            break;
          }
        } catch (e) {}
      }

      if (!invoiceId) {
        // Fallback: get creatorInvoiceCount
        const count = await contract.creatorInvoiceCount(userAddress);
        const ids = await contract.getInvoicesByCreator(userAddress, count - 1n, 1n);
        invoiceId = ids[0].toString();
      }

      // Show result
      statusBox.classList.add("hidden");
      resultCard.classList.remove("hidden");

      const shareUrl = `${window.location.origin}${window.location.pathname.replace("create.html", "invoice.html")}?id=${invoiceId}`;
      document.getElementById("shareUrlInput").value = shareUrl;
      document.getElementById("viewDetailLink").href = `invoice.html?id=${invoiceId}`;
      document.getElementById("explorerTxLink").href = `${FUJI_EXPLORER}/tx/${tx.hash}`;

      document.getElementById("copyBtn").addEventListener("click", () => {
        navigator.clipboard.writeText(shareUrl);
        alert("专属支付链接已复制到剪贴板！");
      });
    } catch (err) {
      console.error(err);
      statusBox.className = "mt-4 p-4 rounded-xl text-xs bg-red-950/60 border border-red-800 text-red-300";
      statusBox.innerHTML = "❌ 创建失败: " + (err.reason || err.message || err);
      submitBtn.disabled = false;
      submitBtn.textContent = "重试创建";
    }
  });
}

// ── Invoice Detail & Pay Logic ───────────────────────────────────────────────

async function setupInvoicePage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const loading = document.getElementById("loadingState");
  const errorBox = document.getElementById("errorState");
  const card = document.getElementById("invoiceCard");

  if (!loading || !card) return;

  if (!id) {
    loading.classList.add("hidden");
    errorBox.classList.remove("hidden");
    document.getElementById("errorMsg").textContent = "URL 中缺少有效的 ?id= 参数";
    return;
  }

  try {
    const contract = getContract(readOnlyProvider);
    const inv = await contract.getInvoice(BigInt(id));

    loading.classList.add("hidden");
    card.classList.remove("hidden");

    document.getElementById("invIdDisplay").textContent = inv.id.toString();
    document.getElementById("invAmount").textContent = ethers.formatEther(inv.amount);
    document.getElementById("invPayee").textContent = inv.creator.slice(0, 6) + "..." + inv.creator.slice(-4);
    document.getElementById("invCreatedAt").textContent = new Date(Number(inv.createdAt) * 1000).toLocaleString();

    const isPaid = Number(inv.status) === 1;
    const badgeContainer = document.getElementById("statusBadgeContainer");
    const actionBox = document.getElementById("actionBox");
    const receiptBox = document.getElementById("receiptBox");
    const payerRow = document.getElementById("payerRow");
    const paidAtRow = document.getElementById("paidAtRow");

    if (isPaid) {
      badgeContainer.innerHTML = `<span class="bg-emerald-950 border border-emerald-700/50 text-emerald-400 font-semibold text-xs px-3 py-1 rounded-full">已结清 (Paid)</span>`;
      actionBox.classList.add("hidden");
      receiptBox.classList.remove("hidden");

      payerRow.classList.remove("hidden");
      paidAtRow.classList.remove("hidden");
      document.getElementById("invPayer").textContent = inv.payer.slice(0, 6) + "..." + inv.payer.slice(-4);
      document.getElementById("invPaidAt").textContent = new Date(Number(inv.paidAt) * 1000).toLocaleString();
      document.getElementById("snowtraceReceiptLink").href = `${FUJI_EXPLORER}/address/${contractAddress}`;
    } else {
      badgeContainer.innerHTML = `<span class="bg-amber-950 border border-amber-700/50 text-amber-400 font-semibold text-xs px-3 py-1 rounded-full">待支付 (Pending)</span>`;
      const payBtn = document.getElementById("payNowBtn");
      payBtn.disabled = false;

      payBtn.addEventListener("click", async () => {
        if (!signer) {
          await connectWallet();
          if (!signer) return;
        }

        const payStatus = document.getElementById("payStatus");
        try {
          payBtn.disabled = true;
          payBtn.textContent = "正在发起支付...";
          payStatus.className = "mt-3 p-3 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-300";
          payStatus.innerHTML = "⏳ 正在唤起钱包确认付款，金额: " + ethers.formatEther(inv.amount) + " AVAX";
          payStatus.classList.remove("hidden");

          const writeContract = getContract(signer);
          const tx = await writeContract.payInvoice(inv.id, { value: inv.amount });

          payStatus.innerHTML = `⛏ 支付交易已广播: <a href="${FUJI_EXPLORER}/tx/${tx.hash}" target="_blank" class="text-red-400 underline">${tx.hash.slice(0, 8)}...</a>，等待亚秒最终确认...`;
          await tx.wait();

          payStatus.className = "mt-3 p-3 rounded-xl text-xs bg-emerald-950 border border-emerald-700 text-emerald-300";
          payStatus.innerHTML = "🎉 支付成功！页面正在刷新真实状态...";

          setTimeout(() => location.reload(), 1500);
        } catch (err) {
          console.error("Pay error:", err);
          payStatus.className = "mt-3 p-3 rounded-xl text-xs bg-red-950/60 border border-red-800 text-red-300";
          payStatus.innerHTML = "❌ 支付失败: " + (err.reason || err.message || err);
          payBtn.disabled = false;
          payBtn.textContent = "重试支付";
        }
      });
    }
  } catch (err) {
    console.error("Fetch invoice error:", err);
    loading.classList.add("hidden");
    errorBox.classList.remove("hidden");
    document.getElementById("errorMsg").textContent = "无法调阅该账单，错误详情: " + (err.reason || err.message || err);
  }
}

// ── Dashboard Logic ──────────────────────────────────────────────────────────

async function loadDashboardInvoices(account) {
  const loading = document.getElementById("dashboardLoading");
  const noWallet = document.getElementById("noWalletNotice");
  const emptyNotice = document.getElementById("emptyNotice");
  const grid = document.getElementById("invoiceGrid");

  if (!grid) return;

  noWallet.classList.add("hidden");
  loading.classList.remove("hidden");
  grid.classList.add("hidden");
  emptyNotice.classList.add("hidden");

  try {
    const contract = getContract(readOnlyProvider);
    const count = await contract.creatorInvoiceCount(account);

    if (count === 0n) {
      loading.classList.add("hidden");
      emptyNotice.classList.remove("hidden");
      return;
    }

    // Fetch all invoice ids created by this account
    const ids = await contract.getInvoicesByCreator(account, 0n, count);
    const invoices = [];

    for (const id of ids) {
      try {
        const inv = await contract.getInvoice(id);
        invoices.push(inv);
      } catch (e) {}
    }

    loading.classList.add("hidden");
    grid.classList.remove("hidden");
    renderInvoiceList(invoices, "all");

    // Setup filter tabs
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach((b) => {
          b.className = "filter-btn px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800";
        });
        btn.className = "filter-btn px-3 py-1.5 rounded-lg bg-slate-800 text-white font-medium active-filter";
        renderInvoiceList(invoices, btn.dataset.filter);
      });
    });
  } catch (err) {
    console.error("Load dashboard error:", err);
    loading.classList.add("hidden");
    grid.innerHTML = `<div class="col-span-2 text-center text-xs text-red-400 p-6 bg-slate-900 rounded-xl">读取失败: ${err.message}</div>`;
    grid.classList.remove("hidden");
  }
}

function renderInvoiceList(invoices, filter) {
  const grid = document.getElementById("invoiceGrid");
  const empty = document.getElementById("emptyNotice");

  const filtered = invoices.filter((inv) => {
    if (filter === "pending") return Number(inv.status) === 0;
    if (filter === "paid") return Number(inv.status) === 1;
    return true;
  });

  if (filtered.length === 0) {
    grid.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  grid.classList.remove("hidden");
  grid.innerHTML = filtered.map((inv) => {
    const isPaid = Number(inv.status) === 1;
    const badge = isPaid
      ? `<span class="bg-emerald-950 border border-emerald-700/50 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">已结清</span>`
      : `<span class="bg-amber-950 border border-amber-700/50 text-amber-400 text-[10px] font-semibold px-2 py-0.5 rounded-full">待付款</span>`;

    return `
      <div class="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition">
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-mono text-slate-400">#${inv.id.toString()}</span>
            ${badge}
          </div>
          <div class="text-2xl font-bold text-white mb-1">
            ${ethers.formatEther(inv.amount)} <span class="text-xs font-normal text-red-500 font-mono">AVAX</span>
          </div>
          <p class="text-[11px] text-slate-400 font-mono mb-4">创建于 ${new Date(Number(inv.createdAt) * 1000).toLocaleDateString()}</p>
        </div>
        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <a href="invoice.html?id=${inv.id.toString()}" class="text-xs text-red-400 hover:text-red-300 font-medium">查看详情 & 支付页 →</a>
          <button class="text-xs text-slate-400 hover:text-white" onclick="navigator.clipboard.writeText('${window.location.origin}/invoice.html?id=${inv.id.toString()}'); alert('已复制支付链接！');">复制链接</button>
        </div>
      </div>
    `;
  }).join("");
}

// ── Bootstrapping ────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  initWallet();
  document.getElementById("connectBtn")?.addEventListener("click", connectWallet);

  if (window.location.pathname.includes("create.html")) {
    setupCreatePage();
  } else if (window.location.pathname.includes("invoice.html")) {
    setupInvoicePage();
  }
});
