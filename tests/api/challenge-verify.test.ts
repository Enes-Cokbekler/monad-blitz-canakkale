import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import type { Address } from "viem";

import { POST } from "@/app/api/challenge/verify/route";
import {
  buildHumanPassVerificationMessage,
  getHumanPassDomain,
  getHumanPassTypes,
} from "@/lib/eip712";
import {
  FUNNY_QUESTIONS,
  TYPING_PHRASE,
} from "@/lib/server/challenge-schema";
import {
  clearChallengesForTests,
  consumeChallenge,
  createChallenge,
  getChallenge,
  incrementAttempts,
} from "@/lib/server/challenge-store";
import { clearProofsForTests, getProof } from "@/lib/server/proof-cache";
import { resetRateLimitForTests } from "@/lib/server/rate-limiter";
import { getHumanPassContract } from "@/lib/server/verifier-client";

vi.mock("@/lib/server/verifier-client", () => ({
  getHumanPassContract: vi.fn(),
}));

const TEST_PRIVATE_KEY =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const WRONG_PRIVATE_KEY =
  "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
const TEST_ACCOUNT = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`);
const VALID_ADDRESS = TEST_ACCOUNT.address;
const VALID_CHAIN_ID = 10143;
const CONTRACT_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const TX_HASH =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const { createPublicClient, waitForTransactionReceipt } = vi.hoisted(() => ({
  createPublicClient: vi.fn(() => ({})),
  waitForTransactionReceipt: vi.fn(),
}));

const writeContract = vi.fn();

vi.mock("viem/actions", () => ({
  waitForTransactionReceipt,
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return { ...actual, createPublicClient };
});

function mockConfiguredVerifier() {
  writeContract.mockResolvedValue(TX_HASH);
  waitForTransactionReceipt.mockResolvedValue({ transactionHash: TX_HASH });
  vi.mocked(getHumanPassContract).mockReturnValue({
    abi: [],
    address: CONTRACT_ADDRESS,
    walletClient: { writeContract },
  } as unknown as ReturnType<typeof getHumanPassContract>);
}

function createRequest(body: unknown) {
  return new Request("http://localhost/api/challenge/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postVerify(body: unknown) {
  const response = await POST(createRequest(body) as NextRequest);
  const json = (await response.json()) as Record<string, unknown>;
  return { response, json };
}

async function signChallenge(
  challenge: ReturnType<typeof createChallenge>,
  signerAddress: string,
  privateKey: string = TEST_PRIVATE_KEY,
  overrideDomain?: { chainId?: number; verifyingContract?: Address },
): Promise<`0x${string}`> {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const domain = getHumanPassDomain(
    overrideDomain?.chainId ?? challenge.chainId,
    overrideDomain?.verifyingContract ?? (CONTRACT_ADDRESS as Address),
  );
  return account.signTypedData({
    domain,
    types: getHumanPassTypes(),
    primaryType: "HumanPassVerification",
    message: buildHumanPassVerificationMessage(
      signerAddress as Address,
      challenge.challengeId,
      challenge.nonce,
      challenge.createdAt,
      challenge.expiresAt,
    ),
  });
}

async function createSignedBody(
  answerFields: Record<string, unknown>,
  params: { address?: string; chainId?: number; privateKey?: string; forceType?: "number_sequence" | "reaction" | "typing_phrase" | "funny_question" } = {}
) {
  const privateKey = params.privateKey ?? TEST_PRIVATE_KEY;
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const address = params.address ?? account.address;
  const chainId = params.chainId ?? VALID_CHAIN_ID;
  const challenge = createChallenge(address, chainId, params.forceType ?? "number_sequence");
  const signature = await signChallenge(challenge, address, privateKey);

  return {
    challenge,
    body: { challengeId: challenge.challengeId, address, chainId, nonce: challenge.nonce, signature, ...answerFields },
  };
}

describe("POST /api/challenge/verify", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearChallengesForTests();
    clearProofsForTests();
    resetRateLimitForTests();
    mockConfiguredVerifier();
    process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS = CONTRACT_ADDRESS;
  });

  // ── number_sequence ──────────────────────────────────────────────────────────

  it("verifies a number_sequence challenge with correct sequence and signature", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    const signature = await signChallenge(challenge, VALID_ADDRESS);

    const before = Date.now();
    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedNumbers: challenge.numbers,
    });
    const after = Date.now();

    expect(response.status).toBe(200);
    expect(json.status).toBe("verified");
    expect(json.txHash).toBe(TX_HASH);
    expect(json.contractAddress).toBe(CONTRACT_ADDRESS);
    expect(json.validUntil as number).toBeGreaterThanOrEqual(before + 600_000);
    expect(json.validUntil as number).toBeLessThanOrEqual(after + 600_000);
    expect(getChallenge(challenge.challengeId)?.consumed).toBe(true);
    expect(getProof(VALID_ADDRESS)?.txHash).toBe(TX_HASH);
  });

  it("rejects the wrong clicked number sequence", async () => {
    const { body } = await createSignedBody(
      { clickedNumbers: [9, 8, 7, 6, 5] },
      { forceType: "number_sequence" }
    );
    const { response, json } = await postVerify(body);
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "WRONG_SEQUENCE" });
  });

  // ── reaction ─────────────────────────────────────────────────────────────────

  it("verifies a reaction challenge with clickedAt inside the window", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "reaction");
    const signature = await signChallenge(challenge, VALID_ADDRESS);
    // Simulate clicking exactly at window open
    const clickedAt = challenge.reactionWindowOpenAt!;

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedAt,
    });

    expect(response.status).toBe(200);
    expect(json.status).toBe("verified");
  });

  it("rejects reaction challenge when clickedAt is too early", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "reaction");
    const signature = await signChallenge(challenge, VALID_ADDRESS);
    const clickedAt = challenge.reactionWindowOpenAt! - 5_000; // 5s before window

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedAt,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "TOO_EARLY" });
  });

  it("rejects reaction challenge when clickedAt is too late", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "reaction");
    const signature = await signChallenge(challenge, VALID_ADDRESS);
    const clickedAt = challenge.reactionWindowOpenAt! + challenge.reactionWindowMs! + 10_000;

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedAt,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "TOO_LATE" });
  });

  // ── typing_phrase ─────────────────────────────────────────────────────────────

  it("verifies a typing_phrase challenge with the correct phrase", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "typing_phrase");
    const signature = await signChallenge(challenge, VALID_ADDRESS);

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      typedPhrase: TYPING_PHRASE,
    });

    expect(response.status).toBe(200);
    expect(json.status).toBe("verified");
  });

  it("rejects typing_phrase challenge with wrong phrase", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "typing_phrase");
    const signature = await signChallenge(challenge, VALID_ADDRESS);

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      typedPhrase: "wrong phrase here",
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "WRONG_PHRASE" });
  });

  it("accepts typing_phrase with extra whitespace trimmed", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "typing_phrase");
    const signature = await signChallenge(challenge, VALID_ADDRESS);

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      typedPhrase: `  ${TYPING_PHRASE}  `,
    });

    expect(response.status).toBe(200);
    expect(json.status).toBe("verified");
  });

  // ── funny_question ───────────────────────────────────────────────────────────

  it("verifies a funny_question challenge with the correct answer", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "funny_question");
    const signature = await signChallenge(challenge, VALID_ADDRESS);
    const correctIndex = FUNNY_QUESTIONS[challenge.questionIndex!].correctIndex;

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      selectedAnswer: correctIndex,
    });

    expect(response.status).toBe(200);
    expect(json.status).toBe("verified");
  });

  it("rejects funny_question with wrong answer index", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "funny_question");
    const signature = await signChallenge(challenge, VALID_ADDRESS);
    const correctIndex = FUNNY_QUESTIONS[challenge.questionIndex!].correctIndex;
    const wrongIndex = (correctIndex + 1) % 4;

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      selectedAnswer: wrongIndex,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "WRONG_ANSWER" });
  });

  // ── common error cases ───────────────────────────────────────────────────────

  it("rejects a missing challenge", async () => {
    const { response, json } = await postVerify({
      challengeId: "missing",
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      signature: TX_HASH,
    });
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "CHALLENGE_NOT_FOUND" });
  });

  it("rejects an expired challenge", async () => {
    const { challenge, body } = await createSignedBody(
      { clickedNumbers: [] },
      { forceType: "number_sequence" }
    );
    challenge.expiresAt = Date.now() - 1;
    const { response, json } = await postVerify(body);
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "CHALLENGE_EXPIRED" });
  });

  it("rejects a consumed challenge", async () => {
    const { challenge, body } = await createSignedBody(
      { clickedNumbers: [] },
      { forceType: "number_sequence" }
    );
    consumeChallenge(challenge.challengeId);
    const { response, json } = await postVerify(body);
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "CHALLENGE_ALREADY_USED" });
  });

  it("rejects the wrong chain", async () => {
    const { body } = await createSignedBody(
      { clickedNumbers: [] },
      { forceType: "number_sequence" }
    );
    const { response, json } = await postVerify({ ...body, chainId: 1 });
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "WRONG_CHAIN" });
  });

  it("rejects challenges after max attempts", async () => {
    const { challenge, body } = await createSignedBody(
      { clickedNumbers: [] },
      { forceType: "number_sequence" }
    );
    incrementAttempts(challenge.challengeId);
    incrementAttempts(challenge.challengeId);
    incrementAttempts(challenge.challengeId);
    const { response, json } = await postVerify(body);
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "TOO_MANY_ATTEMPTS" });
  });

  it("rejects an invalid signature", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    const wrongSignature = await signChallenge(challenge, VALID_ADDRESS, WRONG_PRIVATE_KEY);

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature: wrongSignature,
      clickedNumbers: challenge.numbers,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_SIGNATURE" });
  });

  it("returns VERIFIER_NOT_CONFIGURED when verifier env is missing", async () => {
    vi.mocked(getHumanPassContract).mockImplementation(() => {
      throw new Error("VERIFIER_PRIVATE_KEY is not configured");
    });
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    const signature = await signChallenge(challenge, VALID_ADDRESS);

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedNumbers: challenge.numbers,
    });

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: "VERIFIER_NOT_CONFIGURED" });
  });

  it("returns VERIFIER_INSUFFICIENT_FUNDS when the verifier wallet cannot pay gas", async () => {
    writeContract.mockRejectedValue(new Error("insufficient funds for gas"));
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    const signature = await signChallenge(challenge, VALID_ADDRESS);

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedNumbers: challenge.numbers,
    });

    expect(response.status).toBe(503);
    expect(json).toEqual({ error: "VERIFIER_INSUFFICIENT_FUNDS" });
  });

  // ── nonce / replay protection ─────────────────────────────────────────────────

  it("rejects wrong nonce with NONCE_MISMATCH", async () => {
    const { body } = await createSignedBody(
      { clickedNumbers: [] },
      { forceType: "number_sequence" }
    );
    const { response, json } = await postVerify({ ...body, nonce: "deadbeefdeadbeef" });
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "NONCE_MISMATCH" });
  });

  it("rejects missing nonce with NONCE_MISMATCH", async () => {
    const { body } = await createSignedBody(
      { clickedNumbers: [] },
      { forceType: "number_sequence" }
    );
    const bodyWithoutNonce = Object.fromEntries(Object.entries(body).filter(([k]) => k !== "nonce"));
    const { response, json } = await postVerify(bodyWithoutNonce);
    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "NONCE_MISMATCH" });
  });

  it("prevents replay — second verify with same challengeId fails with CHALLENGE_ALREADY_USED", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    const signature = await signChallenge(challenge, VALID_ADDRESS);
    const body = {
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedNumbers: challenge.numbers,
    };

    const first = await postVerify(body);
    expect(first.response.status).toBe(200);

    const second = await postVerify(body);
    expect(second.response.status).toBe(400);
    expect(second.json).toEqual({ error: "CHALLENGE_ALREADY_USED" });
  });

  it("rejects wrong wallet address with INVALID_ADDRESS", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    const signature = await signChallenge(challenge, VALID_ADDRESS);
    const wrongAddress = "0x000000000000000000000000000000000000dead";

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: wrongAddress,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedNumbers: challenge.numbers,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_ADDRESS" });
  });

  it("wrong nonce does not increment the attempt counter", async () => {
    const { challenge, body } = await createSignedBody(
      {},
      { forceType: "number_sequence" }
    );
    const attemptsBefore = challenge.attempts;
    await postVerify({ ...body, nonce: "wrongnonce", clickedNumbers: challenge.numbers });
    expect(challenge.attempts).toBe(attemptsBefore);
  });

  // ── EIP-712 signature binding ──────────────────────────────────────────────────

  it("rejects EIP-712 signature from wrong wallet (signed by different key)", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    // Sign with WRONG_PRIVATE_KEY — recovered address != VALID_ADDRESS
    const signature = await signChallenge(challenge, VALID_ADDRESS, WRONG_PRIVATE_KEY);

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedNumbers: challenge.numbers,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_SIGNATURE" });
  });

  it("rejects EIP-712 signature built with wrong challengeId", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    const domain = getHumanPassDomain(VALID_CHAIN_ID, CONTRACT_ADDRESS as Address);
    const signature = await TEST_ACCOUNT.signTypedData({
      domain,
      types: getHumanPassTypes(),
      primaryType: "HumanPassVerification",
      message: buildHumanPassVerificationMessage(
        VALID_ADDRESS as Address,
        "wrong-challenge-id",
        challenge.nonce,
        challenge.createdAt,
        challenge.expiresAt,
      ),
    });

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedNumbers: challenge.numbers,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_SIGNATURE" });
  });

  it("rejects EIP-712 signature built with wrong nonce", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    const domain = getHumanPassDomain(VALID_CHAIN_ID, CONTRACT_ADDRESS as Address);
    const signature = await TEST_ACCOUNT.signTypedData({
      domain,
      types: getHumanPassTypes(),
      primaryType: "HumanPassVerification",
      message: buildHumanPassVerificationMessage(
        VALID_ADDRESS as Address,
        challenge.challengeId,
        "wrong-nonce",
        challenge.createdAt,
        challenge.expiresAt,
      ),
    });

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedNumbers: challenge.numbers,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_SIGNATURE" });
  });

  it("rejects EIP-712 signature built with wrong chainId in domain", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    // Sign with chainId=1 (mainnet) instead of Monad Testnet
    const signature = await signChallenge(challenge, VALID_ADDRESS, TEST_PRIVATE_KEY, { chainId: 1 });

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedNumbers: challenge.numbers,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_SIGNATURE" });
  });

  it("rejects EIP-712 signature built with wrong verifyingContract", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    const wrongContract = "0x000000000000000000000000000000000000dead" as Address;
    const signature = await signChallenge(challenge, VALID_ADDRESS, TEST_PRIVATE_KEY, {
      verifyingContract: wrongContract,
    });

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature,
      clickedNumbers: challenge.numbers,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_SIGNATURE" });
  });

  it("rejects plain signMessage (non-EIP-712) as INVALID_SIGNATURE", async () => {
    const challenge = createChallenge(VALID_ADDRESS, VALID_CHAIN_ID, "number_sequence");
    const plainSignature = await TEST_ACCOUNT.signMessage({ message: "not typed data" });

    const { response, json } = await postVerify({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      nonce: challenge.nonce,
      signature: plainSignature,
      clickedNumbers: challenge.numbers,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_SIGNATURE" });
  });
});
