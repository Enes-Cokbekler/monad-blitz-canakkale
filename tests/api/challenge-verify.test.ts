import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { privateKeyToAccount } from "viem/accounts";

import { POST } from "@/app/api/challenge/verify/route";
import { buildChallengeMessage } from "@/lib/server/challenge-schema";
import {
  clearChallengesForTests,
  consumeChallenge,
  createChallenge,
  getChallenge,
  incrementAttempts,
} from "@/lib/server/challenge-store";
import { clearProofsForTests, getProof } from "@/lib/server/proof-cache";
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

  return {
    ...actual,
    createPublicClient,
  };
});

function mockConfiguredVerifier() {
  writeContract.mockResolvedValue(TX_HASH);
  waitForTransactionReceipt.mockResolvedValue({ transactionHash: TX_HASH });
  vi.mocked(getHumanPassContract).mockReturnValue({
    abi: [],
    address: CONTRACT_ADDRESS,
    walletClient: {
      writeContract,
    },
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

async function createSignedChallengeBody(params: {
  address?: string;
  chainId?: number;
  privateKey?: string;
} = {}) {
  const privateKey = params.privateKey ?? TEST_PRIVATE_KEY;
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const address = params.address ?? account.address;
  const chainId = params.chainId ?? VALID_CHAIN_ID;
  const challenge = createChallenge(address, chainId);
  const signature = await account.signMessage({
    message: buildChallengeMessage(challenge),
  });

  return {
    challenge,
    body: {
      challengeId: challenge.challengeId,
      address,
      chainId,
      signature,
      clickedNumbers: challenge.numbers,
    },
  };
}

describe("POST /api/challenge/verify", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearChallengesForTests();
    clearProofsForTests();
    mockConfiguredVerifier();
  });

  it("verifies a challenge with the correct sequence and signature", async () => {
    const { challenge, body } = await createSignedChallengeBody();

    const before = Date.now();
    const { response, json } = await postVerify(body);
    const after = Date.now();

    expect(response.status).toBe(200);
    expect(json.status).toBe("verified");
    expect(json.txHash).toBe(TX_HASH);
    expect(json.contractAddress).toBe(CONTRACT_ADDRESS);
    expect(json.validUntil as number).toBeGreaterThanOrEqual(before + 600_000);
    expect(json.validUntil as number).toBeLessThanOrEqual(after + 600_000);
    expect(getChallenge(challenge.challengeId)?.consumed).toBe(true);
    expect(getProof(VALID_ADDRESS)?.txHash).toBe(TX_HASH);
    expect(writeContract).toHaveBeenCalledWith({
      abi: [],
      address: CONTRACT_ADDRESS,
      functionName: "issueHumanProof",
      args: [VALID_ADDRESS, 600n],
    });
    expect(waitForTransactionReceipt).toHaveBeenCalledWith({}, { hash: TX_HASH });
  });

  it("rejects a missing challenge", async () => {
    const { response, json } = await postVerify({
      challengeId: "missing",
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
      signature: TX_HASH,
      clickedNumbers: [1, 2, 3, 4, 5],
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "CHALLENGE_NOT_FOUND" });
  });

  it("rejects an expired challenge", async () => {
    const { challenge, body } = await createSignedChallengeBody();
    challenge.expiresAt = Date.now() - 1;

    const { response, json } = await postVerify(body);

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "CHALLENGE_EXPIRED" });
  });

  it("rejects a consumed challenge", async () => {
    const { challenge, body } = await createSignedChallengeBody();
    consumeChallenge(challenge.challengeId);

    const { response, json } = await postVerify(body);

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "CHALLENGE_CONSUMED" });
  });

  it("rejects the wrong chain", async () => {
    const { body } = await createSignedChallengeBody();

    const { response, json } = await postVerify({ ...body, chainId: 1 });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "WRONG_CHAIN" });
  });

  it("rejects challenges after max attempts", async () => {
    const { challenge, body } = await createSignedChallengeBody();
    incrementAttempts(challenge.challengeId);
    incrementAttempts(challenge.challengeId);
    incrementAttempts(challenge.challengeId);

    const { response, json } = await postVerify(body);

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "MAX_ATTEMPTS" });
  });

  it("rejects the wrong clicked number sequence", async () => {
    const { body } = await createSignedChallengeBody();

    const { response, json } = await postVerify({
      ...body,
      clickedNumbers: [...(body.clickedNumbers as number[])].reverse(),
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "WRONG_SEQUENCE" });
  });

  it("rejects an invalid signature", async () => {
    const { body } = await createSignedChallengeBody();
    const wrongAccount = privateKeyToAccount(WRONG_PRIVATE_KEY as `0x${string}`);
    const wrongSignature = await wrongAccount.signMessage({ message: "wrong" });

    const { response, json } = await postVerify({
      ...body,
      signature: wrongSignature,
    });

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_SIGNATURE" });
  });

  it("returns VERIFIER_NOT_CONFIGURED when verifier env is missing", async () => {
    vi.mocked(getHumanPassContract).mockImplementation(() => {
      throw new Error("VERIFIER_PRIVATE_KEY is not configured");
    });
    const { body } = await createSignedChallengeBody();

    const { response, json } = await postVerify(body);

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: "VERIFIER_NOT_CONFIGURED" });
  });

  it("returns VERIFIER_INSUFFICIENT_FUNDS when the verifier wallet cannot pay gas", async () => {
    writeContract.mockRejectedValue(new Error("insufficient funds for gas"));
    const { body } = await createSignedChallengeBody();

    const { response, json } = await postVerify(body);

    expect(response.status).toBe(503);
    expect(json).toEqual({ error: "VERIFIER_INSUFFICIENT_FUNDS" });
  });
});
