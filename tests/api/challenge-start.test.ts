import { afterEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/challenge/start/route";
import {
  clearChallengesForTests,
  getActiveChallenge,
  getChallenge,
} from "@/lib/server/challenge-store";
import { FUNNY_QUESTIONS, TYPING_PHRASE } from "@/lib/server/challenge-schema";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const VALID_CHAIN_ID = 10143;

function createRequest(body: unknown) {
  return new Request("http://localhost/api/challenge/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
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

  it("returns a challenge with required base fields", async () => {
    const { response, json } = await postChallenge({
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
    });

    expect(response.status).toBe(200);
    expect(json.challengeId).toEqual(expect.any(String));
    expect(json.nonce).toMatch(/^[a-f0-9]{32}$/);
    expect(json.expiresAt).toEqual(expect.any(Number));
    expect(["number_sequence", "reaction", "typing_phrase", "funny_question"]).toContain(json.type);
    expect(typeof json.message).toBe("string");
  });

  it("message includes wallet, chain, challenge id, type, nonce, expiry", async () => {
    const { json } = await postChallenge({
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
    });

    const message = json.message as string;
    expect(message).toContain(`Wallet: ${VALID_ADDRESS}`);
    expect(message).toContain(`Chain: ${VALID_CHAIN_ID}`);
    expect(message).toContain(`Challenge: ${json.challengeId}`);
    expect(message).toContain(`Type: ${json.type}`);
    expect(message).toContain(`Nonce: ${json.nonce}`);
    expect(message).toContain(`Expires: ${json.expiresAt}`);
  });

  it("number_sequence challenge returns 5 numbers", async () => {
    let json: Record<string, unknown> = {};
    for (let i = 0; i < 30; i++) {
      clearChallengesForTests();
      const result = await postChallenge({ address: VALID_ADDRESS, chainId: VALID_CHAIN_ID });
      json = result.json;
      if (json.type === "number_sequence") break;
    }
    if (json.type !== "number_sequence") return;

    expect(Array.isArray(json.numbers)).toBe(true);
    expect((json.numbers as number[]).length).toBe(5);
  });

  it("reaction challenge returns delayMs and windowMs in valid ranges", async () => {
    let json: Record<string, unknown> = {};
    for (let i = 0; i < 30; i++) {
      clearChallengesForTests();
      const result = await postChallenge({ address: VALID_ADDRESS, chainId: VALID_CHAIN_ID });
      json = result.json;
      if (json.type === "reaction") break;
    }
    if (json.type !== "reaction") return;

    expect(typeof json.delayMs).toBe("number");
    expect(typeof json.windowMs).toBe("number");
    expect(json.delayMs as number).toBeGreaterThanOrEqual(1500);
    expect(json.delayMs as number).toBeLessThanOrEqual(4000);
    expect(json.windowMs as number).toBeGreaterThanOrEqual(1000);
    expect(json.windowMs as number).toBeLessThanOrEqual(1500);
  });

  it("typing_phrase challenge returns the expected phrase", async () => {
    let json: Record<string, unknown> = {};
    for (let i = 0; i < 30; i++) {
      clearChallengesForTests();
      const result = await postChallenge({ address: VALID_ADDRESS, chainId: VALID_CHAIN_ID });
      json = result.json;
      if (json.type === "typing_phrase") break;
    }
    if (json.type !== "typing_phrase") return;

    expect(json.phrase).toBe(TYPING_PHRASE);
  });

  it("funny_question challenge returns question and options without correctIndex", async () => {
    let json: Record<string, unknown> = {};
    for (let i = 0; i < 30; i++) {
      clearChallengesForTests();
      const result = await postChallenge({ address: VALID_ADDRESS, chainId: VALID_CHAIN_ID });
      json = result.json;
      if (json.type === "funny_question") break;
    }
    if (json.type !== "funny_question") return;

    expect(typeof json.question).toBe("string");
    expect(Array.isArray(json.options)).toBe(true);
    expect((json.options as string[]).length).toBe(4);
    expect(json.correctIndex).toBeUndefined();

    const validQuestions = FUNNY_QUESTIONS.map((q) => q.question);
    expect(validQuestions).toContain(json.question);
  });

  it("rejects the wrong chain", async () => {
    const { response, json } = await postChallenge({ address: VALID_ADDRESS, chainId: 1 });
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "WRONG_CHAIN" });
  });

  it("rejects an invalid address", async () => {
    const { response, json } = await postChallenge({ address: "0xinvalid", chainId: VALID_CHAIN_ID });
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_ADDRESS" });
  });

  it("keeps one active challenge per wallet", async () => {
    const first = await postChallenge({ address: VALID_ADDRESS, chainId: VALID_CHAIN_ID });
    const second = await postChallenge({ address: VALID_ADDRESS.toUpperCase().replace("X", "x"), chainId: VALID_CHAIN_ID });

    const firstId = first.json.challengeId as string;
    const secondId = second.json.challengeId as string;

    expect(getChallenge(firstId)?.consumed).toBe(true);
    expect(getActiveChallenge(VALID_ADDRESS)?.challengeId).toBe(secondId);
  });

  it("sets expiry about 120 seconds from creation", async () => {
    const before = Date.now();
    const { json } = await postChallenge({ address: VALID_ADDRESS, chainId: VALID_CHAIN_ID });
    const after = Date.now();

    expect(json.expiresAt as number).toBeGreaterThanOrEqual(before + 119_000);
    expect(json.expiresAt as number).toBeLessThanOrEqual(after + 120_100);
  });
});
