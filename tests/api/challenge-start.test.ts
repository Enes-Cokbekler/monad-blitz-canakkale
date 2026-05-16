import { afterEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/challenge/start/route";
import {
  clearChallengesForTests,
  getActiveChallenge,
  getChallenge,
} from "@/lib/server/challenge-store";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const VALID_CHAIN_ID = 10143;

function createRequest(body: unknown) {
  return new Request("http://localhost/api/challenge/start", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function postChallenge(body: unknown) {
  const response = await POST(createRequest(body));
  const json = (await response.json()) as Record<string, unknown>;

  return { response, json };
}

describe("POST /api/challenge/start", () => {
  afterEach(() => {
    clearChallengesForTests();
  });

  it("returns a challenge session with a deterministic signable message", async () => {
    const { response, json } = await postChallenge({
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
    });

    expect(response.status).toBe(200);
    expect(json.challengeId).toEqual(expect.any(String));
    expect(json.nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(json.expiresAt).toEqual(expect.any(Number));
    expect(json.numbers).toHaveLength(5);
    expect(json.message).toBe(
      [
        "HumanPass challenge",
        `Wallet: ${VALID_ADDRESS}`,
        `Chain: ${VALID_CHAIN_ID}`,
        `Challenge: ${json.challengeId}`,
        `Nonce: ${json.nonce}`,
        `Numbers: ${(json.numbers as number[]).join(",")}`,
        `Expires: ${json.expiresAt}`,
      ].join("\n")
    );
  });

  it("rejects the wrong chain", async () => {
    const { response, json } = await postChallenge({
      address: VALID_ADDRESS,
      chainId: 1,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "WRONG_CHAIN" });
  });

  it("rejects an invalid address", async () => {
    const { response, json } = await postChallenge({
      address: "0xinvalid",
      chainId: VALID_CHAIN_ID,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_ADDRESS" });
  });

  it("keeps one active challenge per wallet", async () => {
    const first = await postChallenge({
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
    });
    const second = await postChallenge({
      address: VALID_ADDRESS.toUpperCase().replace("X", "x"),
      chainId: VALID_CHAIN_ID,
    });

    const firstChallengeId = first.json.challengeId as string;
    const secondChallengeId = second.json.challengeId as string;

    expect(getChallenge(firstChallengeId)?.consumed).toBe(true);
    expect(getActiveChallenge(VALID_ADDRESS)?.challengeId).toBe(secondChallengeId);
  });

  it("sets expiry about 120 seconds from creation", async () => {
    const before = Date.now();
    const { json } = await postChallenge({
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
    });
    const after = Date.now();

    expect(json.expiresAt as number).toBeGreaterThanOrEqual(before + 119_000);
    expect(json.expiresAt as number).toBeLessThanOrEqual(after + 120_000);
  });

  it("returns five unique digits from 1 through 9", async () => {
    const { json } = await postChallenge({
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
    });

    const numbers = json.numbers as number[];

    expect(new Set(numbers)).toHaveLength(5);
    expect(numbers.every((number) => Number.isInteger(number))).toBe(true);
    expect(numbers.every((number) => number >= 1 && number <= 9)).toBe(true);
  });
});
