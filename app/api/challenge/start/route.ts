import { NextResponse } from "next/server";

import {
  FUNNY_QUESTIONS,
  MONAD_TESTNET_CHAIN_ID,
} from "@/lib/server/challenge-schema";
import { createChallenge } from "@/lib/server/challenge-store";
import {
  checkRateLimit,
  clientKey,
  rateLimitResponse,
} from "@/lib/server/rate-limiter";

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

type StartChallengeRequest = {
  address?: unknown;
  chainId?: unknown;
};

export async function POST(request: Request) {
  let body: StartChallengeRequest;

  try {
    body = (await request.json()) as StartChallengeRequest;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (typeof body.address !== "string" || !EVM_ADDRESS_PATTERN.test(body.address)) {
    return NextResponse.json({ error: "INVALID_ADDRESS" }, { status: 400 });
  }

  if (body.chainId !== MONAD_TESTNET_CHAIN_ID) {
    return NextResponse.json({ error: "WRONG_CHAIN" }, { status: 400 });
  }

  // Rate limit by wallet; fallback to IP
  const rlKey = body.address.toLowerCase();
  const ipKey = clientKey(request);
  if (!checkRateLimit(rlKey, "challenge_start") || !checkRateLimit(ipKey, "global")) {
    return rateLimitResponse();
  }

  const challenge = createChallenge(body.address, body.chainId);

  const base = {
    challengeId: challenge.challengeId,
    nonce: challenge.nonce,
    issuedAt: challenge.createdAt,
    expiresAt: challenge.expiresAt,
    type: challenge.type,
  };

  switch (challenge.type) {
    case "number_sequence":
      return NextResponse.json({ ...base, numbers: challenge.numbers });

    case "reaction":
      return NextResponse.json({
        ...base,
        delayMs: challenge.reactionDelayMs,
        windowMs: challenge.reactionWindowMs,
      });

    case "typing_phrase":
      return NextResponse.json({ ...base, phrase: challenge.expectedPhrase });

    case "funny_question": {
      const q = FUNNY_QUESTIONS[challenge.questionIndex!];
      return NextResponse.json({
        ...base,
        question: q.question,
        options: q.options,
        // correctIndex intentionally omitted
      });
    }
  }
}
