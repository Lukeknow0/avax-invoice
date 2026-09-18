import { network } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

const { ethers } = await network.create();

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer account. Set DEPLOYER_PRIVATE_KEY in .env");

  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance === 0n) throw new Error("Deployer has no Fuji AVAX for gas");

  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "AVAX");

  const Factory = await ethers.getContractFactory("InvoiceRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const tx = contract.deploymentTransaction();
  if (!tx) throw new Error("Missing deployment transaction");

  const record = {
    network: "fuji",
    chainId: 43113,
    contractAddress: address,
    deployerAddress: deployer.address,
    txHash: tx.hash,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.resolve("deployments.json"), JSON.stringify(record, null, 2) + "\n");
  fs.writeFileSync(
    path.resolve("../frontend/deployment.js"),
    'export const DEPLOYED_CONTRACT_ADDRESS = "' + address + '";\n',
  );

  console.log("InvoiceRegistry:", address);
  console.log("Transaction:", tx.hash);
  console.log("Updated deployments.json and frontend/deployment.js");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
