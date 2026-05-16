import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getAddress } from "viem";

import { POST } from "@/app/api/reward/claim/route";
import { GET } from "@/app/api/reward/status/route";
import { resetRateLimitForTests, RATE_LIMITS } from "@/lib/server/rate-limiter";
import { clearRewardClaimsForTests } from "@/lib/server/reward-store";

vi.mock("@/lib/humanpass-sdk", () => ({
  requireHuman: vi.fn(),
}));

import { requireHuman } from "@/lib/humanpass-sdk";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const SECOND_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const CHECKSUM_VALID_ADDRESS = getAddress(VALID_ADDRESS);

function createClaimRequest(body: unknown, ip = "127.0.0.1") {
  return new Request("http://localhost/api/reward/claim", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

async function postClaim(body: unknown, ip?: string) {
  const response = await POST(createClaimRequest(body, ip));
  const json = (await response.json()) as Record<string, unknown>;
  return { response, json };
}

function createStatusRequest(address?: string) {
  const query = address === undefined ? "" : `?address=${encodeURIComponent(address)}`;
  return new NextRequest(`http://localhost/api/reward/status${query}`);
}

async function getStatus(address?: string) {
  const response = await GET(createStatusRequest(address));
  const json = (await response.json()) as Record<string, unknown>;
  return { response, json };
}

describe("/api/reward", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearRewardClaimsForTests();
    resetRateLimitForTests();
  });

  afterEach(() => {
    clearRewardClaimsForTests();
    resetRateLimitForTests();
  });

  it("rejects missing wallet cleanly", async () => {
    const { response, json } = await postClaim({});

    expect(response.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "WALLET_REQUIRED", message: "Wallet required." });
    expect(requireHuman).not.toHaveBeenCalled();
  });

  it("rejects invalid wallet cleanly", async () => {
    const { response, json } = await postClaim({ address: "not-an-address" });

    expect(response.status).toBe(400);
    expect(json).toEqual({ ok: false, error: "INVALID_ADDRESS", message: "Invalid wallet address." });
    expect(requireHuman).not.toHaveBeenCalled();
  });

  it("blocks unverified wallet from claiming reward", async () => {
    vi.mocked(requireHuman).mockResolvedValue({ ok: false, reason: "HUMANPASS_REQUIRED" });

    const { response, json } = await postClaim({ address: VALID_ADDRESS });

    expect(response.status).toBe(403);
    expect(json).toEqual({
      ok: false,
      error: "HUMANPASS_REQUIRED",
      message: "Active HumanPass proof required.",
    });
  });

  it("lets verified wallet claim reward once", async () => {
    vi.mocked(requireHuman).mockResolvedValue({
      ok: true,
      status: {
        address: VALID_ADDRESS,
        isHuman: true,
        humanUntil: Math.floor(Date.now() / 1000) + 300,
        expiresInSeconds: 300,
        contractAddress: SECOND_ADDRESS,
        chainId: 10143,
      },
    });

    const { response, json } = await postClaim({ address: VALID_ADDRESS });
    const reward = json.reward as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(reward.name).toBe("Hackathon Coffee Coupon");
    expect(reward.claimCode).toMatch(/^HUMAN-[A-F0-9]{4}-[A-F0-9]{4}$/);
    expect(typeof reward.claimedAt).toBe("string");
    expect(requireHuman).toHaveBeenCalledWith(CHECKSUM_VALID_ADDRESS);
  });

  it("blocks duplicate reward claim for same wallet", async () => {
    vi.mocked(requireHuman).mockResolvedValue({
      ok: true,
      status: {
        address: VALID_ADDRESS,
        isHuman: true,
        humanUntil: Math.floor(Date.now() / 1000) + 300,
        expiresInSeconds: 300,
        contractAddress: SECOND_ADDRESS,
        chainId: 10143,
      },
    });

    const first = await postClaim({ address: VALID_ADDRESS });
    expect(first.response.status).toBe(200);

    const second = await postClaim({ address: VALID_ADDRESS });
    expect(second.response.status).toBe(409);
    expect(second.json).toEqual({
      ok: false,
      error: "ALREADY_CLAIMED",
      message: "Reward already claimed for this wallet.",
    });
  });

  it("returns unclaimed reward status", async () => {
    const { response, json } = await getStatus(VALID_ADDRESS);

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.claimed).toBe(false);
    expect(json.rewardName).toBe("Hackathon Coffee Coupon");
    expect(json.reward).toBeUndefined();
  });

  it("returns claimed reward status", async () => {
    vi.mocked(requireHuman).mockResolvedValue({
      ok: true,
      status: {
        address: VALID_ADDRESS,
        isHuman: true,
        humanUntil: Math.floor(Date.now() / 1000) + 300,
        expiresInSeconds: 300,
        contractAddress: SECOND_ADDRESS,
        chainId: 10143,
      },
    });

    await postClaim({ address: VALID_ADDRESS });
    const { response, json } = await getStatus(VALID_ADDRESS);
    const reward = json.reward as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(json.claimed).toBe(true);
    expect(reward.name).toBe("Hackathon Coffee Coupon");
    expect(reward.claimCode).toMatch(/^HUMAN-/);
  });

  it("reward claim uses HumanPass status helper", async () => {
    vi.mocked(requireHuman).mockResolvedValue({ ok: false, reason: "HUMANPASS_REQUIRED" });

    await postClaim({ address: VALID_ADDRESS });

    expect(requireHuman).toHaveBeenCalledTimes(1);
    expect(requireHuman).toHaveBeenCalledWith(CHECKSUM_VALID_ADDRESS);
  });

  it("applies reward claim rate limiting", async () => {
    vi.mocked(requireHuman).mockResolvedValue({ ok: false, reason: "HUMANPASS_REQUIRED" });

    for (let i = 0; i < RATE_LIMITS.reward_claim.max; i += 1) {
      const attempt = await postClaim({ address: VALID_ADDRESS }, "10.0.0.1");
      expect(attempt.response.status).toBe(403);
    }

    const blocked = await postClaim({ address: VALID_ADDRESS }, "10.0.0.1");
    expect(blocked.response.status).toBe(429);
    expect(blocked.json).toEqual({ ok: false, error: "Rate limit exceeded. Please wait and try again." });
  });

  it("status rejects missing and invalid wallet cleanly", async () => {
    const missing = await getStatus();
    expect(missing.response.status).toBe(400);
    expect(missing.json).toEqual({ ok: false, error: "WALLET_REQUIRED", message: "Wallet required." });

    const invalid = await getStatus("not-an-address");
    expect(invalid.response.status).toBe(400);
    expect(invalid.json).toEqual({ ok: false, error: "INVALID_ADDRESS", message: "Invalid wallet address." });
  });
});
