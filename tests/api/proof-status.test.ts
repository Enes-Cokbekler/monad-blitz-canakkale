import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getAddress } from "viem";

import { GET } from "@/app/api/proof/status/route";
import { cacheProof, clearProofsForTests } from "@/lib/server/proof-cache";

const { readContract } = vi.hoisted(() => ({
  readContract: vi.fn(),
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();

  return {
    ...actual,
    createPublicClient: vi.fn(() => ({ readContract })),
  };
});

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const TX_HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CONTRACT_ADDRESS = "0x9876543210abcdef9876543210abcdef98765432";

function createStatusRequest(address: string) {
  return new NextRequest(`http://localhost/api/proof/status?address=${address}`);
}

async function getStatus(address: string) {
  const response = await GET(createStatusRequest(address));
  const json = (await response.json()) as Record<string, unknown>;

  return { response, json };
}

describe("GET /api/proof/status", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearProofsForTests();
    process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS = CONTRACT_ADDRESS;
  });

  it("returns verified status with remaining seconds and cached tx hash", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    readContract.mockResolvedValueOnce(BigInt(nowSeconds + 300));
    readContract.mockResolvedValueOnce(true);
    cacheProof(VALID_ADDRESS, Date.now() + 300_000, TX_HASH);

    const { response, json } = await getStatus(VALID_ADDRESS);

    expect(response.status).toBe(200);
    expect(json.address).toBe(getAddress(VALID_ADDRESS));
    expect(json.status).toBe("verified");
    expect(json.humanUntil).toBe(nowSeconds + 300);
    expect(json.secondsRemaining).toBeGreaterThan(0);
    expect(json.latestTxHash).toBe(TX_HASH);
  });

  it("returns not_verified when the contract has no proof", async () => {
    readContract.mockResolvedValueOnce(0n);
    readContract.mockResolvedValueOnce(false);

    const { response, json } = await getStatus(VALID_ADDRESS);

    expect(response.status).toBe(200);
    expect(json.status).toBe("not_verified");
    expect(json.humanUntil).toBe(0);
    expect(json.secondsRemaining).toBe(0);
    expect(json.latestTxHash).toBeUndefined();
  });

  it("returns expired when a proof timestamp is in the past", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    readContract.mockResolvedValueOnce(BigInt(nowSeconds - 1));
    readContract.mockResolvedValueOnce(false);

    const { response, json } = await getStatus(VALID_ADDRESS);

    expect(response.status).toBe(200);
    expect(json.status).toBe("expired");
    expect(json.humanUntil).toBe(nowSeconds - 1);
    expect(json.secondsRemaining).toBe(0);
  });

  it("rejects invalid addresses", async () => {
    const { response, json } = await getStatus("not-an-address");

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_ADDRESS" });
    expect(readContract).not.toHaveBeenCalled();
  });
});
