import { createPublicClient, getAddress, http, isAddress, type PublicClient } from "viem";

import { monadTestnet } from "@/lib/chains/monad";
import { getHumanPassAddress, humanPassAbi, isHumanPassConfigured } from "@/lib/contracts/humanpass";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HumanPassStatus = {
  address: string;
  isHuman: boolean;
  humanUntil: number;
  expiresInSeconds: number;
  contractAddress: string;
  chainId: number;
};

export type HumanPassErrorReason =
  | "HUMANPASS_REQUIRED"
  | "PROOF_EXPIRED"
  | "INVALID_ADDRESS"
  | "CONTRACT_NOT_CONFIGURED";

export type RequireHumanResult =
  | { ok: true; status: HumanPassStatus }
  | { ok: false; reason: HumanPassErrorReason; status?: HumanPassStatus };

// ─── Internal client (lazy) ───────────────────────────────────────────────────

let _client: PublicClient | null = null;

function getClient(): PublicClient {
  if (!_client) {
    _client = createPublicClient({
      chain: monadTestnet,
      transport: http(monadTestnet.rpcUrls.default.http[0]),
    });
  }
  return _client;
}

// ─── Core read ────────────────────────────────────────────────────────────────

async function readOnChainState(
  address: string,
  client: PublicClient
): Promise<{ isHumanVal: boolean; humanUntilVal: number }> {
  const contractAddress = getHumanPassAddress();
  const [humanUntilRaw, isHumanRaw] = (await Promise.all([
    client.readContract({
      address: contractAddress,
      abi: humanPassAbi,
      functionName: "getHumanUntil",
      args: [address as `0x${string}`],
    }),
    client.readContract({
      address: contractAddress,
      abi: humanPassAbi,
      functionName: "isHuman",
      args: [address as `0x${string}`],
    }),
  ])) as [bigint, boolean];

  return {
    isHumanVal: Boolean(isHumanRaw),
    humanUntilVal: Number(humanUntilRaw),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns full HumanPass status for a wallet.
 * Throws with "INVALID_ADDRESS" or "CONTRACT_NOT_CONFIGURED" for unrecoverable input errors.
 */
export async function getHumanPassStatus(
  rawAddress: string,
  client?: PublicClient
): Promise<HumanPassStatus> {
  if (!isAddress(rawAddress)) throw new Error("INVALID_ADDRESS");
  if (!isHumanPassConfigured()) throw new Error("CONTRACT_NOT_CONFIGURED");

  const address = getAddress(rawAddress);
  const c = client ?? getClient();
  const { isHumanVal, humanUntilVal } = await readOnChainState(address, c);
  const nowSeconds = Math.floor(Date.now() / 1000);

  return {
    address,
    isHuman: isHumanVal,
    humanUntil: humanUntilVal,
    expiresInSeconds: isHumanVal ? Math.max(0, humanUntilVal - nowSeconds) : 0,
    contractAddress: getHumanPassAddress(),
    chainId: monadTestnet.id,
  };
}

/** Returns true if the wallet has an active, non-expired HumanPass proof. */
export async function isHuman(rawAddress: string, client?: PublicClient): Promise<boolean> {
  const status = await getHumanPassStatus(rawAddress, client);
  return status.isHuman;
}

/** Returns the Unix timestamp (seconds) when the proof expires. 0 if none. */
export async function getHumanUntil(rawAddress: string, client?: PublicClient): Promise<number> {
  const status = await getHumanPassStatus(rawAddress, client);
  return status.humanUntil;
}

/**
 * Gate a protected action behind a HumanPass check.
 * Never throws — returns { ok: true } or { ok: false, reason }.
 *
 * @example
 * const result = await requireHuman(userAddress);
 * if (!result.ok) redirect("/verify");
 * allowProtectedAction();
 */
export async function requireHuman(
  rawAddress: string,
  client?: PublicClient
): Promise<RequireHumanResult> {
  if (!rawAddress || !isAddress(rawAddress)) {
    return { ok: false, reason: "INVALID_ADDRESS" };
  }

  if (!isHumanPassConfigured()) {
    return { ok: false, reason: "CONTRACT_NOT_CONFIGURED" };
  }

  let status: HumanPassStatus;
  try {
    status = await getHumanPassStatus(rawAddress, client);
  } catch {
    return { ok: false, reason: "CONTRACT_NOT_CONFIGURED" };
  }

  if (status.isHuman) {
    return { ok: true, status };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const hasExpired = status.humanUntil > 0 && status.humanUntil <= nowSeconds;
  return {
    ok: false,
    reason: hasExpired ? "PROOF_EXPIRED" : "HUMANPASS_REQUIRED",
    status,
  };
}
