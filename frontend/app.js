import {
  FUJI_CHAIN_ID,
  FUJI_HEX_CHAIN_ID,
  FUJI_RPC_URL,
  FUJI_EXPLORER,
  DEFAULT_CONTRACT_ADDRESS,
  INVOICE_REGISTRY_ABI,
} from "./config.js";
import { DEPLOYED_CONTRACT_ADDRESS } from "./deployment.js";

const contractAddress = DEPLOYED_CONTRACT_ADDRESS || DEFAULT_CONTRACT_ADDRESS;

let userAddress = null;
let provider = null;
let signer = null;
let dashboardInvoices = [];

const readOnlyProvider = new ethers.JsonRpcProvider(FUJI_RPC_URL);

export function getContract(signerOrProvider) {
  if (!ethers.isAddress(contractAddress) || contractAddress === ethers.ZeroAddress) {
    throw new Error("Fuji 合约尚未部署，请先运行 deploy:fuji");
  }
  return new ethers.Contract(
    contractAddress,
    INVOICE_REGISTRY_ABI,
    signerOrProvider || readOnlyProvider,
  );
}

function showToast(message, type = "info") {
  const region = document.getElementById("toastRegion");
  if (!region) return;

  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " is-error" : ""}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  toast.textContent = message;
  region.appendChild(toast);

  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    window.setTimeout(() => toast.remove(), 360);
  }, 3200);
}

function setStatus(element, type, message, useHtml = false) {
  if (!element) return;
  element.className = `status-box status-${type}`;
  element.setAttribute("role", type === "error" ? "alert" : "status");
  element.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  if (useHtml) element.innerHTML = message;
  else element.textContent = message;
}

function setButtonLabel(button, label) {
  if (!button) return;
  const target = button.querySelector(".button-label") || button.querySelector("span");
  if (target) target.textContent = label;
  else button.textContent = label;
}

function setNetworkStatus(isFuji) {
  const networkStatus = document.getElementById("networkStatus");
  if (!networkStatus) return;
  networkStatus.classList.toggle("is-warning", !isFuji);
  networkStatus.setAttribute(
    "aria-label",
    isFuji ? "当前网络：Fuji 测试网，链 ID 43113" : "钱包网络不匹配，请切换到 Fuji 测试网",
  );
  networkStatus.innerHTML = `<span class="network-dot"></span>${isFuji ? "Fuji · 43113" : "网络不匹配"}`;
}

function withTimeout(promise, timeoutMs = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("RPC_TIMEOUT")), timeoutMs);
    }),
  ]);
}

function humanizeTransactionError(error, fallback) {
  if (error?.code === 4001 || error?.code === "ACTION_REJECTED") return "你取消了这笔交易";
  if (error?.message === "RPC_TIMEOUT") return "Fuji 节点响应超时，请稍后重试";
  if (error?.code === "INSUFFICIENT_FUNDS") return "测试 AVAX 余额不足，无法完成交易";
  if (error?.code === "NETWORK_ERROR") return "网络连接异常，请检查钱包与 Fuji 节点";
  return fallback;
}

function formatDate(unixTimestamp) {
  return new Date(Number(unixTimestamp) * 1000).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatShortDate(unixTimestamp) {
  return new Date(Number(unixTimestamp) * 1000).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

async function copyText(text, successMessage = "已复制到剪贴板") {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    showToast(successMessage);
    return true;
  } catch (error) {
    console.error("Copy failed:", error);
    showToast("复制失败，请手动选择文本", "error");
    return false;
  }
}

function setupRevealAnimations() {
  document.documentElement.classList.add("motion-ready");
  const elements = document.querySelectorAll(".reveal:not(.is-visible)");
  if (!elements.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
  );

  elements.forEach((element) => observer.observe(element));
}

async function initWallet() {
  if (!window.ethereum) return;

  const manuallyDisconnected = sessionStorage.getItem("WALLET_MANUALLY_DISCONNECTED") === "true";
  if (manuallyDisconnected) {
    renderWalletDisconnected();
  } else {
    provider = new ethers.BrowserProvider(window.ethereum);
    try {
      const accounts = await provider.listAccounts();
      const network = await provider.getNetwork();
      const isFuji = network.chainId === BigInt(FUJI_CHAIN_ID);
      setNetworkStatus(isFuji);
      if (accounts.length > 0 && isFuji) {
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        renderWalletConnected(userAddress);
      } else if (accounts.length > 0) {
        const connectButton = document.getElementById("connectBtn");
        if (connectButton) setButtonLabel(connectButton, "切换到 Fuji");
      }
    } catch (error) {
      console.error("Wallet check error:", error);
    }
  }

  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      userAddress = null;
      signer = null;
      renderWalletDisconnected();
    } else {
      sessionStorage.removeItem("WALLET_MANUALLY_DISCONNECTED");
      window.location.reload();
    }
  });

  window.ethereum.on("chainChanged", () => window.location.reload());
}

export function disconnectWallet() {
  userAddress = null;
  signer = null;
  sessionStorage.setItem("WALLET_MANUALLY_DISCONNECTED", "true");
  renderWalletDisconnected();
  showToast("钱包已从当前页面断开");
}

export async function connectWallet() {
  sessionStorage.removeItem("WALLET_MANUALLY_DISCONNECTED");

  if (!window.ethereum) {
    showToast("未检测到 Web3 钱包，请安装 Core Wallet 或 MetaMask", "error");
    return null;
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (network.chainId !== BigInt(FUJI_CHAIN_ID)) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: FUJI_HEX_CHAIN_ID }],
        });
      } catch (switchError) {
        if (switchError.code !== 4902) throw switchError;
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: FUJI_HEX_CHAIN_ID,
              chainName: "Avalanche Fuji Testnet",
              nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
              rpcUrls: [FUJI_RPC_URL],
              blockExplorerUrls: [FUJI_EXPLORER],
            },
          ],
        });
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: FUJI_HEX_CHAIN_ID }],
        });
      }
      provider = new ethers.BrowserProvider(window.ethereum);
    }

    const confirmedNetwork = await provider.getNetwork();
    if (confirmedNetwork.chainId !== BigInt(FUJI_CHAIN_ID)) {
      setNetworkStatus(false);
      throw new Error("WRONG_NETWORK");
    }
    setNetworkStatus(true);

    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    renderWalletConnected(userAddress);
    showToast("钱包已连接到 Avalanche Fuji");
    return signer;
  } catch (error) {
    console.error("Connect wallet error:", error);
    const message =
      error?.message === "WRONG_NETWORK"
        ? "钱包未切换到 Avalanche Fuji，请确认后重试"
        : error?.code === 4001
          ? "你取消了钱包连接"
          : "钱包连接失败，请检查网络后重试";
    showToast(message, "error");
    return null;
  }
}

function renderWalletConnected(address) {
  const box = document.getElementById("walletBox");
  const shouldRestoreFocus = box?.contains(document.activeElement);
  const shortAddress = `${address.slice(0, 6)}…${address.slice(-4)}`;
  setNetworkStatus(true);

  if (box) {
    box.innerHTML = `
      <div class="wallet-connected">
        <button id="walletAddressBtn" class="wallet-chip" type="button" title="复制完整钱包地址">
          <span class="connection-dot" aria-hidden="true"></span>
          <span>${shortAddress}</span>
        </button>
        <button id="disconnectBtn" class="icon-button" type="button" title="断开钱包" aria-label="断开钱包">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10"/></svg>
        </button>
      </div>
    `;
    document.getElementById("walletAddressBtn")?.addEventListener("click", () => copyText(address, "钱包地址已复制"));
    document.getElementById("disconnectBtn")?.addEventListener("click", disconnectWallet);
    if (shouldRestoreFocus) document.getElementById("walletAddressBtn")?.focus();
  }

  const payeeDisplay = document.getElementById("payeeDisplay");
  if (payeeDisplay) {
    payeeDisplay.textContent = address;
    payeeDisplay.className = "address-box is-connected";
  }

  refreshCreateButtonState();

  if (window.location.pathname.includes("dashboard.html")) {
    loadDashboardInvoices(address);
  }
}

function renderWalletDisconnected() {
  const box = document.getElementById("walletBox");
  const shouldRestoreFocus = box?.contains(document.activeElement);
  if (box) {
    box.innerHTML = `
      <button id="connectBtn" class="btn-primary" type="button" data-od-id="connect-wallet-button">
        <span>连接钱包</span>
        <span class="button-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 7.5V6a2 2 0 0 1 2-2h8.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-8A2 2 0 0 1 6 7.5h12.5"/><path d="M15 12h5"/></svg>
        </span>
      </button>
    `;
    document.getElementById("connectBtn")?.addEventListener("click", connectWallet);
    if (shouldRestoreFocus) document.getElementById("connectBtn")?.focus();
  }

  const payeeDisplay = document.getElementById("payeeDisplay");
  if (payeeDisplay) {
    payeeDisplay.textContent = "请先连接钱包以绑定收款地址";
    payeeDisplay.className = "address-box";
  }

  refreshCreateButtonState();
  resetDashboard();
}

function refreshCreateButtonState() {
  const submitButton = document.getElementById("submitCreateBtn");
  const amountInput = document.getElementById("amountInput");
  if (!submitButton || !amountInput) return;

  const amount = Number.parseFloat(amountInput.value);
  const validAmount = Number.isFinite(amount) && amount >= 0.0001;
  submitButton.disabled = !signer || !validAmount;

  if (!signer) setButtonLabel(submitButton, "连接钱包后创建");
  else if (!validAmount) setButtonLabel(submitButton, "输入有效金额");
  else setButtonLabel(submitButton, "确认并写入 Fuji");
}

function setupCreatePage() {
  const form = document.getElementById("createInvoiceForm");
  const submitButton = document.getElementById("submitCreateBtn");
  const amountInput = document.getElementById("amountInput");
  const statusBox = document.getElementById("createStatus");
  const resultCard = document.getElementById("resultCard");

  if (!form || !submitButton || !amountInput) return;

  amountInput.addEventListener("input", () => {
    document.querySelectorAll(".amount-chip").forEach((chip) => {
      const selected = chip.dataset.amount === amountInput.value;
      chip.classList.toggle("is-selected", selected);
      chip.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    refreshCreateButtonState();
    if (!statusBox.classList.contains("hidden")) statusBox.classList.add("hidden");
  });

  document.querySelectorAll(".amount-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      amountInput.value = chip.dataset.amount;
      amountInput.dispatchEvent(new Event("input", { bubbles: true }));
      amountInput.focus();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = amountInput.value.trim();
    const amount = Number.parseFloat(value);

    if (!Number.isFinite(amount) || amount < 0.0001) {
      setStatus(statusBox, "error", "请输入不小于 0.0001 AVAX 的有效金额");
      amountInput.focus();
      return;
    }

    if (!signer) {
      setStatus(statusBox, "error", "请先连接收款钱包");
      return;
    }

    try {
      submitButton.disabled = true;
      setButtonLabel(submitButton, "等待钱包签名");
      setStatus(statusBox, "info", "请在钱包中核对金额与 Fuji 网络，然后确认创建交易");
      resultCard.classList.add("hidden");

      const contract = getContract(signer);
      const parsedAmount = ethers.parseEther(value);
      const transaction = await contract.createInvoice(parsedAmount);

      setButtonLabel(submitButton, "等待区块确认");
      setStatus(
        statusBox,
        "info",
        `交易已广播：<a href="${FUJI_EXPLORER}/tx/${transaction.hash}" target="_blank" rel="noreferrer">${transaction.hash.slice(0, 10)}…</a>，正在等待确认`,
        true,
      );

      const receipt = await transaction.wait();
      let invoiceId = null;

      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "InvoiceCreated") {
            invoiceId = parsed.args.id.toString();
            break;
          }
        } catch (_) {
          // This log belongs to another contract.
        }
      }

      if (!invoiceId) {
        const count = await withTimeout(contract.creatorInvoiceCount(userAddress));
        const ids = await withTimeout(contract.getInvoicesByCreator(userAddress, count - 1n, 1n));
        invoiceId = ids[0].toString();
      }

      statusBox.classList.add("hidden");
      resultCard.classList.remove("hidden");
      setButtonLabel(submitButton, "收款单已创建");

      const shareUrl = new URL(`invoice.html?id=${invoiceId}`, window.location.href).href;
      document.getElementById("shareUrlInput").value = shareUrl;
      document.getElementById("viewDetailLink").href = `invoice.html?id=${invoiceId}`;
      document.getElementById("explorerTxLink").href = `${FUJI_EXPLORER}/tx/${transaction.hash}`;
      document.getElementById("copyBtn")?.addEventListener("click", () => copyText(shareUrl, "支付链接已复制"), { once: true });
      showToast(`收款单 #${invoiceId} 已写入 Fuji`);
    } catch (error) {
      console.error("Create invoice error:", error);
      setStatus(statusBox, "error", humanizeTransactionError(error, "创建失败，请检查 Fuji 网络与钱包余额后重试"));
      refreshCreateButtonState();
    }
  });

  refreshCreateButtonState();
}

async function setupInvoicePage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const loading = document.getElementById("loadingState");
  const errorBox = document.getElementById("errorState");
  const retryAction = document.getElementById("invoiceRetryAction");
  const card = document.getElementById("invoiceCard");

  if (!loading || !card) return;

  if (!id || !/^\d+$/.test(id)) {
    loading.setAttribute("aria-busy", "false");
    loading.classList.add("hidden");
    errorBox.classList.remove("hidden");
    document.getElementById("errorHeading").textContent = "账单链接不完整";
    document.getElementById("errorMsg").textContent = "链接中缺少有效的账单编号，请向收款方确认完整链接。";
    retryAction?.classList.add("hidden");
    errorBox.focus({ preventScroll: true });
    return;
  }

  if (retryAction) retryAction.href = window.location.href;

  try {
    const contract = getContract(readOnlyProvider);
    const invoice = await withTimeout(contract.getInvoice(BigInt(id)));

    loading.setAttribute("aria-busy", "false");
    loading.classList.add("hidden");
    card.classList.remove("hidden");
    document.title = `账单 #${invoice.id.toString()}｜Avax Invoice`;

    document.getElementById("invIdDisplay").textContent = invoice.id.toString();
    document.getElementById("invAmount").textContent = ethers.formatEther(invoice.amount);
    document.getElementById("invPayee").textContent = invoice.creator;
    document.getElementById("invCreatedAt").textContent = formatDate(invoice.createdAt);

    const isPaid = Number(invoice.status) === 1;
    const badgeContainer = document.getElementById("statusBadgeContainer");
    const actionBox = document.getElementById("actionBox");
    const receiptBox = document.getElementById("receiptBox");
    const payerRow = document.getElementById("payerRow");
    const paidAtRow = document.getElementById("paidAtRow");

    if (isPaid) {
      badgeContainer.innerHTML = '<span class="status-badge status-paid">已结清</span>';
      actionBox.classList.add("hidden");
      receiptBox.classList.remove("hidden");
      payerRow.classList.remove("hidden");
      paidAtRow.classList.remove("hidden");
      document.getElementById("invPayer").textContent = invoice.payer;
      document.getElementById("invPaidAt").textContent = formatDate(invoice.paidAt);
      const receiptLink = document.getElementById("snowtraceReceiptLink");
      try {
        const paymentEvents = await withTimeout(
          contract.queryFilter(contract.filters.InvoicePaid(invoice.id), 0, "latest"),
        );
        const paymentEvent = paymentEvents.at(-1);
        if (paymentEvent?.transactionHash) {
          receiptLink.href = `${FUJI_EXPLORER}/tx/${paymentEvent.transactionHash}`;
          receiptLink.textContent = "前往 Snowtrace 调阅付款交易 ↗";
        } else {
          throw new Error("PAYMENT_EVENT_NOT_FOUND");
        }
      } catch (eventError) {
        console.error("Payment event lookup error:", eventError);
        receiptLink.href = `${FUJI_EXPLORER}/address/${contractAddress}`;
        receiptLink.textContent = "前往 Snowtrace 查看合约记录 ↗";
      }
    } else {
      badgeContainer.innerHTML = '<span class="status-badge status-pending">待付款</span>';
      const payButton = document.getElementById("payNowBtn");
      payButton.disabled = false;
      setButtonLabel(payButton, `支付 ${ethers.formatEther(invoice.amount)} AVAX`);

      payButton.addEventListener("click", async () => {
        if (!signer) {
          await connectWallet();
          if (!signer) return;
        }

        const payStatus = document.getElementById("payStatus");
        try {
          payButton.disabled = true;
          setButtonLabel(payButton, "等待钱包签名");
          setStatus(payStatus, "info", `请在钱包中确认支付 ${ethers.formatEther(invoice.amount)} AVAX`);

          const writeContract = getContract(signer);
          const transaction = await writeContract.payInvoice(invoice.id, { value: invoice.amount });

          setButtonLabel(payButton, "等待区块确认");
          setStatus(
            payStatus,
            "info",
            `交易已广播：<a href="${FUJI_EXPLORER}/tx/${transaction.hash}" target="_blank" rel="noreferrer">${transaction.hash.slice(0, 10)}…</a>，正在等待确认`,
            true,
          );
          await transaction.wait();

          setStatus(payStatus, "success", "支付已确认，正在刷新链上状态");
          setButtonLabel(payButton, "支付已完成");
          window.setTimeout(() => window.location.reload(), 1300);
        } catch (error) {
          console.error("Pay invoice error:", error);
          setStatus(payStatus, "error", humanizeTransactionError(error, "支付失败，请检查 Fuji 网络与钱包余额后重试"));
          payButton.disabled = false;
          setButtonLabel(payButton, "重新发起支付");
        }
      });
    }
  } catch (error) {
    console.error("Fetch invoice error:", error);
    loading.setAttribute("aria-busy", "false");
    loading.classList.add("hidden");
    errorBox.classList.remove("hidden");
    document.getElementById("errorHeading").textContent =
      error?.message === "RPC_TIMEOUT" ? "Fuji 节点响应超时" : "无法读取这张收款单";
    document.getElementById("errorMsg").textContent =
      error?.message === "RPC_TIMEOUT"
        ? "当前节点没有及时返回结果。请重新读取，或稍后再试。"
        : "没有读取到这张账单。请检查编号，或稍后重新连接 Fuji 节点。";
    errorBox.focus({ preventScroll: true });
  }
}

function resetDashboard() {
  const noWallet = document.getElementById("noWalletNotice");
  const loading = document.getElementById("dashboardLoading");
  const emptyNotice = document.getElementById("emptyNotice");
  const grid = document.getElementById("invoiceGrid");

  if (!grid) return;
  dashboardInvoices = [];
  loading?.setAttribute("aria-busy", "false");
  loading?.classList.add("hidden");
  emptyNotice?.classList.add("hidden");
  grid.classList.add("hidden");
  noWallet?.classList.remove("hidden");
  ["statTotal", "statPending", "statPaid"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = "—";
  });
}

function updateDashboardStats(invoices) {
  const total = invoices.length;
  const paid = invoices.filter((invoice) => Number(invoice.status) === 1).length;
  const pending = total - paid;
  document.getElementById("statTotal").textContent = total.toString();
  document.getElementById("statPending").textContent = pending.toString();
  document.getElementById("statPaid").textContent = paid.toString();
}

async function loadDashboardInvoices(account) {
  const loading = document.getElementById("dashboardLoading");
  const noWallet = document.getElementById("noWalletNotice");
  const emptyNotice = document.getElementById("emptyNotice");
  const grid = document.getElementById("invoiceGrid");

  if (!grid) return;

  noWallet.classList.add("hidden");
  loading.setAttribute("aria-busy", "true");
  loading.classList.remove("hidden");
  grid.classList.add("hidden");
  emptyNotice.classList.add("hidden");

  try {
    const contract = getContract(readOnlyProvider);
    const count = await withTimeout(contract.creatorInvoiceCount(account));

    if (count === 0n) {
      dashboardInvoices = [];
      updateDashboardStats([]);
      loading.setAttribute("aria-busy", "false");
      loading.classList.add("hidden");
      showDashboardEmpty("all");
      return;
    }

    const ids = await withTimeout(contract.getInvoicesByCreator(account, 0n, count));
    dashboardInvoices = (
      await withTimeout(Promise.all(ids.map((invoiceId) => contract.getInvoice(invoiceId))))
    ).reverse();

    updateDashboardStats(dashboardInvoices);
    loading.setAttribute("aria-busy", "false");
    loading.classList.add("hidden");
    renderInvoiceList(dashboardInvoices, "all");
  } catch (error) {
    console.error("Load dashboard error:", error);
    loading.setAttribute("aria-busy", "false");
    loading.classList.add("hidden");
    grid.classList.add("hidden");
    emptyNotice.classList.remove("hidden");
    document.getElementById("emptyNoticeTitle").textContent =
      error?.message === "RPC_TIMEOUT" ? "Fuji 节点响应超时" : "链上记录读取失败";
    document.getElementById("emptyNoticeCopy").textContent = "没有拿到完整账单数据。请检查网络后重新读取。";
    const action = document.getElementById("emptyNoticeAction");
    if (action) {
      action.classList.remove("hidden");
      action.href = window.location.href;
      setButtonLabel(action, "重新读取账单");
    }
    showToast("账单读取失败，请重新读取", "error");
  }
}

function setupDashboardFilters() {
  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active-filter", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });
      renderInvoiceList(dashboardInvoices, button.dataset.filter);
    });
  });
}

function showDashboardEmpty(filter) {
  const empty = document.getElementById("emptyNotice");
  const grid = document.getElementById("invoiceGrid");
  if (!empty || !grid) return;

  const title = document.getElementById("emptyNoticeTitle");
  const copy = document.getElementById("emptyNoticeCopy");
  const action = document.getElementById("emptyNoticeAction");
  const messages = {
    all: ["还没有收款单", "当前钱包尚未创建过收款请求。创建第一笔后，它会出现在这里。"],
    pending: ["没有待付款账单", "当前地址创建的收款单都已结清，或暂时没有账单。"],
    paid: ["还没有已结清账单", "完成一笔付款后，链上回执会显示在这里。"],
  };

  [title.textContent, copy.textContent] = messages[filter] || messages.all;
  if (action) {
    action.href = "create.html";
    setButtonLabel(action, "创建第一笔");
    action.classList.toggle("hidden", filter !== "all");
  }
  grid.classList.add("hidden");
  empty.classList.remove("hidden");
}

function renderInvoiceList(invoices, filter) {
  const grid = document.getElementById("invoiceGrid");
  const empty = document.getElementById("emptyNotice");
  if (!grid || !empty) return;

  const filtered = invoices.filter((invoice) => {
    if (filter === "pending") return Number(invoice.status) === 0;
    if (filter === "paid") return Number(invoice.status) === 1;
    return true;
  });

  if (filtered.length === 0) {
    showDashboardEmpty(filter);
    return;
  }

  empty.classList.add("hidden");
  grid.classList.remove("hidden");
  grid.innerHTML = filtered
    .map((invoice) => {
      const id = invoice.id.toString();
      const isPaid = Number(invoice.status) === 1;
      const status = isPaid
        ? '<span class="status-badge status-paid">已结清</span>'
        : '<span class="status-badge status-pending">待付款</span>';
      const shareUrl = new URL(`invoice.html?id=${id}`, window.location.href).href;

      return `
        <article class="invoice-card" data-od-id="invoice-card-${id}">
          <div>
            <div class="invoice-card-top">
              <span class="invoice-id">INVOICE #${id}</span>
              ${status}
            </div>
            <div class="invoice-card-amount">${ethers.formatEther(invoice.amount)} <small>AVAX</small></div>
            <p class="invoice-date">创建于 ${formatShortDate(invoice.createdAt)}</p>
          </div>
          <div class="invoice-card-actions">
            <a class="card-link" href="invoice.html?id=${id}">查看详情 <span aria-hidden="true">→</span></a>
            <button class="copy-link" type="button" data-copy-url="${shareUrl}" aria-label="复制账单 ${id} 的支付链接">复制链接</button>
          </div>
        </article>
      `;
    })
    .join("");

  grid.querySelectorAll("[data-copy-url]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copyUrl, "支付链接已复制"));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupRevealAnimations();
  setupDashboardFilters();
  setupCreatePage();

  document.getElementById("connectBtn")?.addEventListener("click", connectWallet);
  document.getElementById("noticeConnectBtn")?.addEventListener("click", connectWallet);

  initWallet();

  if (window.location.pathname.includes("invoice.html")) {
    setupInvoicePage();
  }
});
