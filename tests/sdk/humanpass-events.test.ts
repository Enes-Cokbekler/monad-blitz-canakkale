import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { PublicClient } from "viem";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_A = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat acc 0
const USER_B = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat acc 1
const CONTRACT = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Hardhat acc 2

const NOW = Math.floor(Date.now() / 1000);
const TX_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TX_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function makeIssuedLog(user: string, validUntil: number, blockNumber: bigint, txHash: string) {
  return {
    args: { user, validUntil: BigInt(validUntil) },
    transactionHash: txHash,
    blockNumber,
    logIndex: 0,
  };
}

function makeRevokedLog(user: string, blockNumber: bigint, txHash: string) {
  return {
    args: { user },
    transactionHash: txHash,
    blockNumber,
    logIndex: 1,
  };
}

function makeMockClient(opts: {
  issuedLogs?: ReturnType<typeof makeIssuedLog>[];
  revokedLogs?: ReturnType<typeof makeRevokedLog>[];
  latestBlock?: bigint;
  failLogs?: boolean;
}): PublicClient {
  const { issuedLogs = [], revokedLogs = [], latestBlock = 1000n, failLogs = false } = opts;

  return {
    getBlockNumber: vi.fn().mockResolvedValue(latestBlock),
    getLogs: vi.fn().mockImplementation(({ event }: { event: { name: string } }) => {
      if (failLogs) return Promise.reject(new Error("RPC error"));
      if (event.name === "HumanProofIssued") return Promise.resolve(issuedLogs);
      if (event.name === "HumanProofRevoked") return Promise.resolve(revokedLogs);
      return Promise.resolve([]);
    }),
  } as unknown as PublicClient;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let savedContractAddress: string | undefined;
let savedDeployBlock: string | undefined;

beforeEach(() => {
  savedContractAddress = process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
  savedDeployBlock = process.env.NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK;
  process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS = CONTRACT;
  delete process.env.NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK;
});

afterEach(() => {
  if (savedContractAddress === undefined) delete process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
  else process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS = savedContractAddress;

  if (savedDeployBlock === undefined) delete process.env.NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK;
  else process.env.NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK = savedDeployBlock;

  vi.restoreAllMocks();
});

// ─── getRecentHumanPassEvents ─────────────────────────────────────────────────

describe("getRecentHumanPassEvents", () => {
  it("returns ISSUED and REVOKED events sorted newest first", async () => {
    const { getRecentHumanPassEvents } = await import("@/lib/humanpass-events");
    const client = makeMockClient({
      issuedLogs: [makeIssuedLog(USER_A, NOW + 600, 100n, TX_A)],
      revokedLogs: [makeRevokedLog(USER_B, 200n, TX_B)],
      latestBlock: 1000n,
    });

    const result = await getRecentHumanPassEvents(100, client);

    expect(result.error).toBeUndefined();
    expect(result.events).toHaveLength(2);
    expect(result.events[0].blockNumber).toBe(200n); // newest first
    expect(result.events[0].type).toBe("REVOKED");
    expect(result.events[1].type).toBe("ISSUED");
  });

  it("returns CONTRACT_NOT_CONFIGURED when env var is missing", async () => {
    delete process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
    const { getRecentHumanPassEvents } = await import("@/lib/humanpass-events");
    const client = makeMockClient({});

    const result = await getRecentHumanPassEvents(100, client);

    expect(result.error).toBe("CONTRACT_NOT_CONFIGURED");
    expect(result.events).toHaveLength(0);
  });

  it("returns empty events on RPC log failure", async () => {
    const { getRecentHumanPassEvents } = await import("@/lib/humanpass-events");
    const client = makeMockClient({ failLogs: true });

    const result = await getRecentHumanPassEvents(100, client);

    expect(result.events).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  it("respects the limit parameter", async () => {
    const { getRecentHumanPassEvents } = await import("@/lib/humanpass-events");
    const manyLogs = Array.from({ length: 10 }, (_, i) =>
      makeIssuedLog(USER_A, NOW + i * 60, BigInt(100 + i), TX_A)
    );
    const client = makeMockClient({ issuedLogs: manyLogs });

    const result = await getRecentHumanPassEvents(3, client);

    expect(result.events).toHaveLength(3);
  });

  it("uses NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK when set", async () => {
    process.env.NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK = "500";
    const { getRecentHumanPassEvents } = await import("@/lib/humanpass-events");
    const client = makeMockClient({ issuedLogs: [] });

    const result = await getRecentHumanPassEvents(100, client);

    expect(result.fromBlock).toBe(500n);
  });

  it("ISSUED event has correct shape", async () => {
    const { getRecentHumanPassEvents } = await import("@/lib/humanpass-events");
    const client = makeMockClient({
      issuedLogs: [makeIssuedLog(USER_A, NOW + 600, 100n, TX_A)],
      latestBlock: 1000n,
    });

    const result = await getRecentHumanPassEvents(100, client);
    const event = result.events[0];

    expect(event.type).toBe("ISSUED");
    expect(event.user).toBe(USER_A);
    expect(event.validUntil).toBe(NOW + 600);
    expect(event.txHash).toBe(TX_A);
    expect(event.blockNumber).toBe(100n);
  });

  it("REVOKED event has correct shape", async () => {
    const { getRecentHumanPassEvents } = await import("@/lib/humanpass-events");
    const client = makeMockClient({
      revokedLogs: [makeRevokedLog(USER_B, 200n, TX_B)],
      latestBlock: 1000n,
    });

    const result = await getRecentHumanPassEvents(100, client);
    const event = result.events[0];

    expect(event.type).toBe("REVOKED");
    expect(event.user).toBe(USER_B);
    expect(event.validUntil).toBeUndefined();
    expect(event.txHash).toBe(TX_B);
  });
});

// ─── getHumanProofEventsForAddress ────────────────────────────────────────────

describe("getHumanProofEventsForAddress", () => {
  it("returns events for the specified address", async () => {
    const { getHumanProofEventsForAddress } = await import("@/lib/humanpass-events");
    const client = makeMockClient({
      issuedLogs: [makeIssuedLog(USER_A, NOW + 600, 100n, TX_A)],
    });

    const result = await getHumanProofEventsForAddress(USER_A, 20, client);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].user).toBe(USER_A);
  });

  it("returns INVALID_ADDRESS for a bad address", async () => {
    const { getHumanProofEventsForAddress } = await import("@/lib/humanpass-events");
    const client = makeMockClient({});

    const result = await getHumanProofEventsForAddress("not-valid", 20, client);

    expect(result.error).toBe("INVALID_ADDRESS");
    expect(result.events).toHaveLength(0);
  });

  it("returns CONTRACT_NOT_CONFIGURED when env var is missing", async () => {
    delete process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
    const { getHumanProofEventsForAddress } = await import("@/lib/humanpass-events");
    const client = makeMockClient({});

    const result = await getHumanProofEventsForAddress(USER_A, 20, client);

    expect(result.error).toBe("CONTRACT_NOT_CONFIGURED");
    expect(result.events).toHaveLength(0);
  });

  it("returns empty events on RPC log failure", async () => {
    const { getHumanProofEventsForAddress } = await import("@/lib/humanpass-events");
    const client = makeMockClient({ failLogs: true });

    const result = await getHumanProofEventsForAddress(USER_A, 20, client);

    expect(result.events).toHaveLength(0);
  });
});
