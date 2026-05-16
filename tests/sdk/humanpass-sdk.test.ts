import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { PublicClient } from "viem";

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// Use known-checksummed addresses (EIP-55) — viem isAddress() is strict by default.

const VALID_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat acc 0
const CONTRACT_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat acc 1
const NOW = Math.floor(Date.now() / 1000);
const FUTURE_UNTIL = NOW + 3600;   // 1 hr from now — active proof
const EXPIRED_UNTIL = NOW - 100;   // already expired

function makeMockClient(isHumanResult: boolean, humanUntilResult: bigint): PublicClient {
  return {
    readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === "isHuman") return Promise.resolve(isHumanResult);
      if (functionName === "getHumanUntil") return Promise.resolve(humanUntilResult);
      return Promise.reject(new Error(`Unexpected function: ${functionName}`));
    }),
  } as unknown as PublicClient;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let savedContractAddress: string | undefined;

beforeEach(() => {
  savedContractAddress = process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
  process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS = CONTRACT_ADDRESS;
});

afterEach(() => {
  if (savedContractAddress === undefined) {
    delete process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
  } else {
    process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS = savedContractAddress;
  }
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getHumanPassStatus", () => {
  it("returns verified status for active human proof", async () => {
    const { getHumanPassStatus } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(true, BigInt(FUTURE_UNTIL));
    const status = await getHumanPassStatus(VALID_ADDRESS, client);

    expect(status.isHuman).toBe(true);
    expect(status.humanUntil).toBe(FUTURE_UNTIL);
    expect(status.expiresInSeconds).toBeGreaterThan(0);
    expect(status.chainId).toBe(10143);
    expect(status.contractAddress).toBeTruthy();
  });

  it("returns not-verified status for wallet with no proof", async () => {
    const { getHumanPassStatus } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(false, 0n);
    const status = await getHumanPassStatus(VALID_ADDRESS, client);

    expect(status.isHuman).toBe(false);
    expect(status.humanUntil).toBe(0);
    expect(status.expiresInSeconds).toBe(0);
  });

  it("throws INVALID_ADDRESS for a non-address string", async () => {
    const { getHumanPassStatus } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(false, 0n);

    await expect(getHumanPassStatus("not-an-address", client)).rejects.toThrow("INVALID_ADDRESS");
  });

  it("throws CONTRACT_NOT_CONFIGURED when env var is missing", async () => {
    delete process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
    const { getHumanPassStatus } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(false, 0n);

    await expect(getHumanPassStatus(VALID_ADDRESS, client)).rejects.toThrow(
      "CONTRACT_NOT_CONFIGURED"
    );
  });

  it("correctly calculates expiresInSeconds for an active proof", async () => {
    const { getHumanPassStatus } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(true, BigInt(FUTURE_UNTIL));
    const status = await getHumanPassStatus(VALID_ADDRESS, client);

    // Should be within 5 seconds of 3600 (accounting for test execution time)
    expect(status.expiresInSeconds).toBeGreaterThan(3590);
    expect(status.expiresInSeconds).toBeLessThanOrEqual(3600);
  });
});

describe("isHuman", () => {
  it("returns true for a verified wallet", async () => {
    const { isHuman } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(true, BigInt(FUTURE_UNTIL));
    expect(await isHuman(VALID_ADDRESS, client)).toBe(true);
  });

  it("returns false for an unverified wallet", async () => {
    const { isHuman } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(false, 0n);
    expect(await isHuman(VALID_ADDRESS, client)).toBe(false);
  });
});

describe("getHumanUntil", () => {
  it("returns the expiry timestamp", async () => {
    const { getHumanUntil } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(true, BigInt(FUTURE_UNTIL));
    expect(await getHumanUntil(VALID_ADDRESS, client)).toBe(FUTURE_UNTIL);
  });

  it("returns 0 for wallet with no proof", async () => {
    const { getHumanUntil } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(false, 0n);
    expect(await getHumanUntil(VALID_ADDRESS, client)).toBe(0);
  });
});

describe("requireHuman", () => {
  it("returns ok:true for a verified wallet", async () => {
    const { requireHuman } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(true, BigInt(FUTURE_UNTIL));
    const result = await requireHuman(VALID_ADDRESS, client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status.isHuman).toBe(true);
    }
  });

  it("returns ok:false with HUMANPASS_REQUIRED for unverified wallet", async () => {
    const { requireHuman } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(false, 0n);
    const result = await requireHuman(VALID_ADDRESS, client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("HUMANPASS_REQUIRED");
    }
  });

  it("returns ok:false with PROOF_EXPIRED for expired proof", async () => {
    const { requireHuman } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(false, BigInt(EXPIRED_UNTIL));
    const result = await requireHuman(VALID_ADDRESS, client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("PROOF_EXPIRED");
    }
  });

  it("returns ok:false with INVALID_ADDRESS for bad address", async () => {
    const { requireHuman } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(false, 0n);
    const result = await requireHuman("not-valid", client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("INVALID_ADDRESS");
    }
  });

  it("returns ok:false with CONTRACT_NOT_CONFIGURED when env var is missing", async () => {
    delete process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
    const { requireHuman } = await import("@/lib/humanpass-sdk");
    const client = makeMockClient(false, 0n);
    const result = await requireHuman(VALID_ADDRESS, client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("CONTRACT_NOT_CONFIGURED");
    }
  });
});
