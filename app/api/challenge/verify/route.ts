import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  type Abi,
  type Address,
  type Hash,
} from "viem";
import { waitForTransactionReceipt } from "viem/actions";

import { verifyHumanPassSignature } from "@/lib/eip712";
import { monadTestnet } from "@/lib/chains/monad";
import {
  FUNNY_QUESTIONS,
  type ChallengeSession,
} from "@/lib/server/challenge-schema";
import {
  consumeChallenge,
  getChallenge,
  incrementAttempts,
} from "@/lib/server/challenge-store";
import { cacheProof } from "@/lib/server/proof-cache";
import { getHumanPassContract } from "@/lib/server/verifier-client";

const PROOF_DURATION_SECONDS = 600n;
const PROOF_DURATION_MS = 600_000;
const REACTION_TOLERANCE_MS = 2_000;

type VerifyChallengeRequest = {
  challengeId?: unknown;
  address?: unknown;
  chainId?: unknown;
  nonce?: unknown;
  signature?: unknown;
  // number_sequence
  clickedNumbers?: unknown;
  // reaction
  clickedAt?: unknown;
  // typing_phrase
  typedPhrase?: unknown;
  // funny_question
  selectedAnswer?: unknown;
};

type HumanPassContract = {
  abi: Abi;
  address: Address;
  walletClient: {
    writeContract: (parameters: {
      abi: Abi;
      address: Address;
      functionName: "issueHumanProof";
      args: readonly [string, bigint];
    }) => Promise<Hash>;
  };
};

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(monadTestnet.rpcUrls.default.http[0]),
});

function sequencesMatch(expected: number[], actual: unknown) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((n, i) => n === expected[i])
  );
}

function validateAnswer(
  challenge: ChallengeSession,
  body: VerifyChallengeRequest
): string | null {
  switch (challenge.type) {
    case "number_sequence":
      if (!sequencesMatch(challenge.numbers, body.clickedNumbers)) {
        return "WRONG_SEQUENCE";
      }
      return null;

    case "reaction": {
      if (typeof body.clickedAt !== "number") return "WRONG_ANSWER";
      const windowOpen = challenge.reactionWindowOpenAt!;
      const windowClose = windowOpen + challenge.reactionWindowMs!;
      if (body.clickedAt < windowOpen - REACTION_TOLERANCE_MS) return "TOO_EARLY";
      if (body.clickedAt > windowClose + REACTION_TOLERANCE_MS) return "TOO_LATE";
      return null;
    }

    case "typing_phrase": {
      if (typeof body.typedPhrase !== "string") return "WRONG_ANSWER";
      const expected = challenge.expectedPhrase!.trim().toLowerCase();
      const actual = body.typedPhrase.trim().toLowerCase();
      if (actual !== expected) return "WRONG_PHRASE";
      return null;
    }

    case "funny_question": {
      if (
        typeof body.selectedAnswer !== "number" ||
        !Number.isInteger(body.selectedAnswer)
      ) {
        return "WRONG_ANSWER";
      }
      const q = FUNNY_QUESTIONS[challenge.questionIndex!];
      if (body.selectedAnswer !== q.correctIndex) return "WRONG_ANSWER";
      return null;
    }
  }
}

function isVerifierConfigurationError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("VERIFIER_PRIVATE_KEY") ||
      error.message.includes("NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS"))
  );
}

function isVerifierInsufficientFundsError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("insufficient funds")
  );
}

export async function POST(request: NextRequest) {
  let body: VerifyChallengeRequest;

  try {
    body = (await request.json()) as VerifyChallengeRequest;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (typeof body.challengeId !== "string") {
    return NextResponse.json({ error: "CHALLENGE_NOT_FOUND" }, { status: 400 });
  }

  const challenge = getChallenge(body.challengeId);

  if (!challenge) {
    return NextResponse.json({ error: "CHALLENGE_NOT_FOUND" }, { status: 400 });
  }

  // Address check first — don't leak state to wrong callers
  if (
    typeof body.address !== "string" ||
    body.address.toLowerCase() !== challenge.address.toLowerCase()
  ) {
    return NextResponse.json({ error: "INVALID_ADDRESS" }, { status: 400 });
  }

  // Explicit nonce check — defense-in-depth on top of signature binding
  if (typeof body.nonce !== "string" || body.nonce !== challenge.nonce) {
    return NextResponse.json({ error: "NONCE_MISMATCH" }, { status: 400 });
  }

  if (Date.now() > challenge.expiresAt) {
    return NextResponse.json({ error: "CHALLENGE_EXPIRED" }, { status: 400 });
  }

  if (challenge.consumed) {
    return NextResponse.json({ error: "CHALLENGE_ALREADY_USED" }, { status: 400 });
  }

  if (body.chainId !== challenge.chainId) {
    return NextResponse.json({ error: "WRONG_CHAIN" }, { status: 400 });
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 400 });
  }

  incrementAttempts(challenge.challengeId);

  const answerError = validateAnswer(challenge, body);
  if (answerError) {
    return NextResponse.json({ error: answerError }, { status: 400 });
  }

  if (typeof body.signature !== "string") {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  const contractEnv = process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
  const verifyingContract =
    contractEnv && isAddress(contractEnv) ? getAddress(contractEnv) : undefined;

  let recovered: string;

  try {
    recovered = await verifyHumanPassSignature({
      wallet: body.address as Address,
      challengeId: challenge.challengeId,
      nonce: challenge.nonce,
      issuedAt: challenge.createdAt,
      expiresAt: challenge.expiresAt,
      signature: body.signature as `0x${string}`,
      chainId: challenge.chainId,
      verifyingContract,
    });
  } catch {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  if (recovered.toLowerCase() !== body.address.toLowerCase()) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  let contract: HumanPassContract;

  try {
    contract = getHumanPassContract() as unknown as HumanPassContract;
  } catch (error) {
    if (isVerifierConfigurationError(error)) {
      return NextResponse.json({ error: "VERIFIER_NOT_CONFIGURED" }, { status: 500 });
    }
    throw error;
  }

  let txHash: Hash;
  let receipt: { transactionHash: Hash };

  try {
    txHash = await contract.walletClient.writeContract({
      abi: contract.abi,
      address: contract.address,
      functionName: "issueHumanProof",
      args: [body.address, PROOF_DURATION_SECONDS],
    });
    receipt = await waitForTransactionReceipt(publicClient, { hash: txHash });
  } catch (error) {
    if (isVerifierInsufficientFundsError(error)) {
      return NextResponse.json({ error: "VERIFIER_INSUFFICIENT_FUNDS" }, { status: 503 });
    }
    throw error;
  }

  const validUntil = Date.now() + PROOF_DURATION_MS;

  // Mark as used immediately after success — replay protection
  consumeChallenge(challenge.challengeId);
  cacheProof(body.address, validUntil, receipt.transactionHash);

  return NextResponse.json({
    status: "verified",
    txHash: receipt.transactionHash,
    validUntil,
    contractAddress: contract.address,
  });
}
