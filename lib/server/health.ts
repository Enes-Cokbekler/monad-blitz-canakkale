import { createPublicClient, formatEther, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { monadTestnet } from "@/lib/chains/monad";
import { humanPassAbi } from "@/lib/contracts/humanpass";
import {
  getHumanPassAddress,
  isHumanPassConfigured,
} from "@/lib/contracts/humanpass";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RpcStatus = "ok" | "error" | "not_configured";
export type ContractStatus = "ok" | "error" | "not_configured";

export type HealthStatus = {
  ok: boolean;
  chainId?: number;
  rpc: RpcStatus;
  contract: ContractStatus;
  verifier: {
    address?: string;
    balanceMON?: string;
    hasGas: boolean;
    error?: string;
  };
  config: {
    contractConfigured: boolean;
    deployBlockConfigured: boolean;
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GAS_THRESHOLD = parseEther("0.01");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveVerifierAddress(): { address: string } | { error: string } {
  const privateKey = process.env.VERIFIER_PRIVATE_KEY;
  if (!privateKey) return { error: "VERIFIER_PRIVATE_KEY not set" };
  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    return { address: account.address };
  } catch {
    return { error: "Invalid VERIFIER_PRIVATE_KEY format" };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a safe operational health snapshot.
 * Never throws. Never exposes private keys.
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const contractConfigured = isHumanPassConfigured();
  const deployBlockConfigured = Boolean(process.env.NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK);

  const config = { contractConfigured, deployBlockConfigured };

  // Resolve verifier address — safe public info derived from private key
  const verifierResult = deriveVerifierAddress();
  const verifierAddress = "address" in verifierResult ? verifierResult.address : undefined;
  const verifierError = "error" in verifierResult ? verifierResult.error : undefined;

  let rpc: RpcStatus = "not_configured";
  let contract: ContractStatus = contractConfigured ? "error" : "not_configured";
  let chainId: number | undefined;
  let balanceMON: string | undefined;
  let hasGas = false;

  try {
    const client = createPublicClient({
      chain: monadTestnet,
      transport: http(monadTestnet.rpcUrls.default.http[0]),
    });

    chainId = await client.getChainId();
    rpc = "ok";

    // Contract smoke test
    if (contractConfigured) {
      try {
        const contractAddress = getHumanPassAddress();
        const probe = verifierAddress ?? contractAddress;
        await client.readContract({
          address: contractAddress,
          abi: humanPassAbi,
          functionName: "isHuman",
          args: [probe as `0x${string}`],
        });
        contract = "ok";
      } catch {
        contract = "error";
      }
    }

    // Verifier balance
    if (verifierAddress) {
      try {
        const balance = await client.getBalance({
          address: verifierAddress as `0x${string}`,
        });
        balanceMON = parseFloat(formatEther(balance)).toFixed(4);
        hasGas = balance >= GAS_THRESHOLD;
      } catch {
        // Non-critical — leave undefined
      }
    }
  } catch {
    rpc = "error";
  }

  const ok =
    rpc === "ok" &&
    contract !== "error" &&
    verifierAddress !== undefined &&
    hasGas;

  return {
    ok,
    ...(chainId !== undefined ? { chainId } : {}),
    rpc,
    contract,
    verifier: {
      ...(verifierAddress ? { address: verifierAddress } : {}),
      ...(balanceMON !== undefined ? { balanceMON } : {}),
      hasGas,
      ...(verifierError ? { error: verifierError } : {}),
    },
    config,
  };
}
