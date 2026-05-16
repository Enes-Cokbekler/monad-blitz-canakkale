import { NextResponse } from "next/server";

import {
  buildChallengeMessage,
  MONAD_TESTNET_CHAIN_ID,
} from "@/lib/server/challenge-schema";
import { createChallenge } from "@/lib/server/challenge-store";

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

  const challenge = createChallenge(body.address, body.chainId);

  return NextResponse.json({
    challengeId: challenge.challengeId,
    nonce: challenge.nonce,
    expiresAt: challenge.expiresAt,
    numbers: challenge.numbers,
    message: buildChallengeMessage(challenge),
  });
}
