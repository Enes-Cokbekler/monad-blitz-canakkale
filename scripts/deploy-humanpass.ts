import hre from "hardhat";

const { ethers, network } = hre;

const MONAD_TESTNET_CHAIN_ID = 10143;
const MAX_DURATION = 900;
const PRIVATE_KEY_PATTERN = /^0x[0-9a-fA-F]{64}$/;

type DeploymentOutput = {
  chainId: number;
  contractAddress: string | null;
  verifier: string;
  maxDuration: number;
  txHash: string | null;
};

function isDryRun() {
  return process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";
}

function getVerifierPrivateKey() {
  const privateKey = process.env.VERIFIER_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing required env var: VERIFIER_PRIVATE_KEY");
  }

  if (!PRIVATE_KEY_PATTERN.test(privateKey)) {
    throw new Error("VERIFIER_PRIVATE_KEY must be a 0x-prefixed 32-byte private key");
  }

  return privateKey;
}

function getChainId(preferMonadFallback = false) {
  if (preferMonadFallback && network.name === "hardhat") {
    return MONAD_TESTNET_CHAIN_ID;
  }

  return network.config.chainId ?? MONAD_TESTNET_CHAIN_ID;
}

async function deployHumanPass(verifier: string): Promise<DeploymentOutput> {
  const HumanPass = await ethers.getContractFactory("HumanPass");
  const humanPass = await HumanPass.deploy(verifier, MAX_DURATION);
  const txHash = humanPass.deploymentTransaction()?.hash ?? null;

  await humanPass.waitForDeployment();

  return {
    chainId: getChainId(),
    contractAddress: await humanPass.getAddress(),
    verifier,
    maxDuration: MAX_DURATION,
    txHash,
  };
}

async function main() {
  const dryRun = isDryRun();
  const verifierWallet = new ethers.Wallet(getVerifierPrivateKey());
  const verifier = verifierWallet.address;

  if (dryRun) {
    const output: DeploymentOutput = {
      chainId: getChainId(true),
      contractAddress: null,
      verifier,
      maxDuration: MAX_DURATION,
      txHash: null,
    };

    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const output = await deployHumanPass(verifier);
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`HumanPass deployment failed: ${message}`);
  process.exitCode = 1;
});
