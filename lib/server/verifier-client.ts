import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { monadTestnet } from "@/lib/chains/monad";
import { getHumanPassAddress, humanPassAbi } from "@/lib/contracts/humanpass";

function getVerifierPrivateKey(): string {
  const privateKey = process.env.VERIFIER_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("VERIFIER_PRIVATE_KEY is not configured");
  }

  return privateKey;
}

export function getVerifierClient() {
  const privateKey = getVerifierPrivateKey();
  const contractAddress = getHumanPassAddress();

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(monadTestnet.rpcUrls.default.http[0]),
  });

  return { walletClient, contractAddress };
}

export function getHumanPassContract() {
  const { walletClient, contractAddress } = getVerifierClient();

  return {
    abi: humanPassAbi,
    address: contractAddress,
    walletClient,
  };
}