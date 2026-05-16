import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  parseAbiItem,
  type PublicClient,
} from "viem";

import { monadTestnet } from "@/lib/chains/monad";
import { getHumanPassAddress, isHumanPassConfigured } from "@/lib/contracts/humanpass";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HumanPassEvent = {
  type: "ISSUED" | "REVOKED";
  user: string;
  validUntil?: number;
  txHash: string;
  blockNumber: bigint;
  logIndex: number;
};

export type FetchEventsResult = {
  events: HumanPassEvent[];
  fromBlock: bigint;
  error?: string;
};

// ─── Event signatures ─────────────────────────────────────────────────────────

const ISSUED_EVENT = parseAbiItem(
  "event HumanProofIssued(address indexed user, uint256 validUntil)"
);
const REVOKED_EVENT = parseAbiItem(
  "event HumanProofRevoked(address indexed user)"
);

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFE_BLOCK_RANGE = 50_000n;
const FALLBACK_BLOCK_RANGE = 1_000n;

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

// ─── Block range ─────────────────────────────────────────────────────────────

async function resolveFromBlock(client: PublicClient): Promise<bigint> {
  const deployBlock = process.env.NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK;
  if (deployBlock) {
    try {
      return BigInt(deployBlock);
    } catch {
      // invalid value — fall through to safe range
    }
  }
  try {
    const latest = await client.getBlockNumber();
    return latest > SAFE_BLOCK_RANGE ? latest - SAFE_BLOCK_RANGE : 0n;
  } catch {
    return 0n;
  }
}

// ─── Log fetching ─────────────────────────────────────────────────────────────

async function fetchAllLogs(
  client: PublicClient,
  contractAddress: `0x${string}`,
  fromBlock: bigint,
  userFilter?: `0x${string}`
): Promise<HumanPassEvent[]> {
  const base = { address: contractAddress, fromBlock, toBlock: "latest" as const };
  const args = userFilter ? { user: userFilter } : undefined;

  type IssuedLogs = Awaited<ReturnType<typeof client.getLogs<typeof ISSUED_EVENT>>>;
  type RevokedLogs = Awaited<ReturnType<typeof client.getLogs<typeof REVOKED_EVENT>>>;

  let issuedLogs: IssuedLogs = [];
  let revokedLogs: RevokedLogs = [];

  try {
    [issuedLogs, revokedLogs] = await Promise.all([
      client.getLogs({ ...base, event: ISSUED_EVENT, args }),
      client.getLogs({ ...base, event: REVOKED_EVENT, args }),
    ]);
  } catch {
    // RPC may enforce a tighter block range — try a smaller fallback window
    try {
      const latest = await client.getBlockNumber();
      const fallbackFrom = latest > FALLBACK_BLOCK_RANGE ? latest - FALLBACK_BLOCK_RANGE : 0n;
      [issuedLogs, revokedLogs] = await Promise.all([
        client.getLogs({ ...base, event: ISSUED_EVENT, args, fromBlock: fallbackFrom }),
        client.getLogs({ ...base, event: REVOKED_EVENT, args, fromBlock: fallbackFrom }),
      ]);
    } catch {
      return [];
    }
  }

  const events: HumanPassEvent[] = [];

  for (const log of issuedLogs) {
    if (!log.args?.user || log.transactionHash === null || log.blockNumber === null) continue;
    events.push({
      type: "ISSUED",
      user: getAddress(log.args.user as string),
      validUntil: Number(log.args.validUntil as bigint),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.logIndex ?? 0,
    });
  }

  for (const log of revokedLogs) {
    if (!log.args?.user || log.transactionHash === null || log.blockNumber === null) continue;
    events.push({
      type: "REVOKED",
      user: getAddress(log.args.user as string),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.logIndex ?? 0,
    });
  }

  // Newest first
  return events.sort((a, b) =>
    a.blockNumber !== b.blockNumber
      ? a.blockNumber > b.blockNumber ? -1 : 1
      : b.logIndex - a.logIndex
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns recent HumanProofIssued and HumanProofRevoked events for all wallets.
 * Never throws — returns an empty result with an error string on failure.
 */
export async function getRecentHumanPassEvents(
  limit = 100,
  client?: PublicClient
): Promise<FetchEventsResult> {
  if (!isHumanPassConfigured()) {
    return { events: [], fromBlock: 0n, error: "CONTRACT_NOT_CONFIGURED" };
  }

  const c = client ?? getClient();
  const contractAddress = getHumanPassAddress();
  const fromBlock = await resolveFromBlock(c);
  const events = await fetchAllLogs(c, contractAddress, fromBlock);

  return { events: events.slice(0, limit), fromBlock };
}

/**
 * Returns HumanProofIssued and HumanProofRevoked events for a specific wallet.
 * Never throws — returns an empty result with an error string on failure.
 */
export async function getHumanProofEventsForAddress(
  rawAddress: string,
  limit = 20,
  client?: PublicClient
): Promise<FetchEventsResult> {
  if (!isHumanPassConfigured()) {
    return { events: [], fromBlock: 0n, error: "CONTRACT_NOT_CONFIGURED" };
  }

  if (!isAddress(rawAddress)) {
    return { events: [], fromBlock: 0n, error: "INVALID_ADDRESS" };
  }

  const c = client ?? getClient();
  const contractAddress = getHumanPassAddress();
  const userAddress = getAddress(rawAddress) as `0x${string}`;
  const fromBlock = await resolveFromBlock(c);
  const events = await fetchAllLogs(c, contractAddress, fromBlock, userAddress);

  return { events: events.slice(0, limit), fromBlock };
}
