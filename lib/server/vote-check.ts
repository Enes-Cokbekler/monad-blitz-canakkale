import { createPublicClient, http, isAddress } from "viem";

import { monadTestnet } from "@/lib/chains/monad";
import { humanPassAbi } from "@/lib/contracts/HumanPass.abi";

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(monadTestnet.rpcUrls.default.http[0]),
});

export async function checkIsHuman(address: string): Promise<boolean> {
  const contractAddress = process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;

  if (!contractAddress || !isAddress(contractAddress)) {
    throw new Error("HUMANPASS_CONTRACT_NOT_CONFIGURED");
  }

  if (!isAddress(address)) {
    return false;
  }

  try {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: humanPassAbi,
      functionName: "isHuman",
      args: [address],
    });

    return result;
  } catch {
    return false;
  }
}
