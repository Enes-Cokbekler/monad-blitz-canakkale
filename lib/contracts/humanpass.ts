import type { Abi, Address } from "viem";
import { getAddress, isAddress } from "viem";

import HumanPassArtifact from "../../artifacts/contracts/HumanPass.sol/HumanPass.json";

export const DEFAULT_DURATION = 600;
export const MAX_DURATION = 900;

export const humanPassAbi = HumanPassArtifact.abi as Abi;

export function getHumanPassAddress(): Address {
  const address = process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;

  if (!address) {
    throw new Error("NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS is not configured");
  }

  if (!isAddress(address)) {
    throw new Error("NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS is not a valid EVM address");
  }

  return getAddress(address);
}

export function isHumanPassConfigured() {
  const address = process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;

  return Boolean(address && isAddress(address));
}

export function createHumanPassReadConfig(functionName: string, args: readonly unknown[] = []) {
  return {
    address: getHumanPassAddress(),
    abi: humanPassAbi,
    functionName,
    args,
  } as const;
}

export function createHumanPassWriteConfig(functionName: string, args: readonly unknown[] = []) {
  return {
    address: getHumanPassAddress(),
    abi: humanPassAbi,
    functionName,
    args,
  } as const;
}
