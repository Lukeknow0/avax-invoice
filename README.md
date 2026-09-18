# Avax Invoice (Avalanche Fuji Testnet)

> **Avalanche Buildathon 2026 参赛项目**  
> 专为自由职业者与 Web3 创作者打造的轻量级链上收款单协议与前端套件。

---

## ⚠️ 重要声明与免责
- 本项目运行于 **Avalanche Fuji Testnet（Chain ID: 43113）**。
- 所使用的资产均为测试币，**无任何真实经济与财务价值**。
- 本系统出具的凭据为技术意义上的链上支付记录，**非法定税务发票**。

---

## 已部署的 Fuji 演示
- 合约：[InvoiceRegistry on Snowtrace](https://testnet.snowtrace.io/address/0xBbF1Ff4085682F708e12B9c9b06EfbB268e78e05)
- 完整的真实链上创建与支付证明见 [LIVE_DEMO.md](LIVE_DEMO.md)。

---

## 一、核心价值与特性
1. **零资金滞留（Non-Custodial）**：客户支付直接由智能合约原子级结算至收款人地址，无平台抽成、无资金池、无提现审批。
2. **严格安全防护（CEI）**：所有状态变更在转账前完成，杜绝重复支付、溢价支付或欠额支付。
3. **亚秒级对账体验**：充分发挥 Avalanche 亚秒级最终确认（Sub-second finality）优势，扫码或打开专属链接秒级确认付款。
4. **全套自动化测试护航**：包含完整测试套件，全面覆盖越权、重复支付、拒收回滚、分页索引等 16 项关键指标。

---

## 二、架构设计

```
projects/avax-invoice/
├── contracts/               # 智能合约工程 (Hardhat 3.x)
│   ├── src/                 # InvoiceRegistry.sol (主合约)
│   ├── test/                # InvoiceRegistry.test.ts (16/16 单元测试)
│   ├── scripts/             # deploy.ts (Fuji 部署脚本)
│   └── hardhat.config.ts    # 编译器与网络配置
└── frontend/                # 轻量化前端
    ├── index.html           # 首页介绍与功能导航
    ├── create.html          # 新建收款单
    ├── invoice.html         # 专属付款与回执查阅页
    ├── dashboard.html       # 历史账单看板
    ├── config.js            # 链参数与合约 ABI
    └── app.js               # Ethers.js 交互驱动
```

---

## 三、快速开始

### 1. 运行合约测试
```bash
cd projects/avax-invoice/contracts
npm install
npm test
```

### 2. 部署到 Fuji 测试网
1. 准备一个测试钱包并在 [Avalanche Faucet](https://core.app/tools/testnet-faucet/) 领取测试 AVAX。
2. 在 `contracts/.env` 填入你的私钥：
```env
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
DEPLOYER_PRIVATE_KEY=0x你的测试私钥
```
3. 执行部署脚本：
```bash
npm run deploy:fuji
```
4. 部署完成后，合约地址会保存至 `deployments.json`，并自动写入前端 `deployment.js`。

### 3. 本地启动前端演示
```bash
cd projects/avax-invoice/frontend
python3 -m http.server 3000
# 浏览器打开 http://localhost:3000
```
