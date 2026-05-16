import { NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";

import { checkIsHuman } from "@/lib/server/vote-check";
import { recordVote, type VoteOptionId } from "@/lib/server/vote-store";

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const MONAD_TESTNET_CHAIN_ID = 10143;
const VOTE_MESSAGE_TTL_MS = 300_000;

type VoteRequest = {
  address?: unknown;
  optionId?: unknown;
  signature?: unknown;
  nonce?: unknown;
  chainId?: unknown;
  timestamp?: unknown;
};

function buildVoteMessage(params: {
  address: string;
  optionId: string;
  nonce: string;
  chainId: number;
  timestamp: number;
}) {
  return [
    "HumanPass vote",
    `Wallet: ${params.address}`,
    `Option: ${params.optionId}`,
    `Nonce: ${params.nonce}`,
    `Chain: ${params.chainId}`,
    `Timestamp: ${params.timestamp}`,
  ].join("\n");
}

export async function POST(request: Request) {
  let body: VoteRequest;

  try {
    body = (await request.json()) as VoteRequest;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (
    typeof body.address !== "string" ||
    !EVM_ADDRESS_PATTERN.test(body.address)
  ) {
    return NextResponse.json({ error: "INVALID_ADDRESS" }, { status: 400 });
  }

  if (typeof body.optionId !== "string") {
    return NextResponse.json({ error: "INVALID_OPTION" }, { status: 400 });
  }

  if (typeof body.signature !== "string" || !body.signature.startsWith("0x")) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  if (typeof body.nonce !== "string") {
    return NextResponse.json({ error: "INVALID_NONCE" }, { status: 400 });
  }

  if (typeof body.chainId !== "number" || body.chainId !== MONAD_TESTNET_CHAIN_ID) {
    return NextResponse.json({ error: "WRONG_CHAIN" }, { status: 400 });
  }

  if (typeof body.timestamp !== "number") {
    return NextResponse.json({ error: "INVALID_TIMESTAMP" }, { status: 400 });
  }

  const now = Date.now();
  if (body.timestamp < now - VOTE_MESSAGE_TTL_MS || body.timestamp > now + VOTE_MESSAGE_TTL_MS) {
    return NextResponse.json({ error: "EXPIRED_SIGNATURE" }, { status: 400 });
  }

  const message = buildVoteMessage({
    address: body.address,
    optionId: body.optionId,
    nonce: body.nonce,
    chainId: body.chainId,
    timestamp: body.timestamp,
  });

  let recoveredAddress: string;

  try {
    recoveredAddress = await recoverMessageAddress({
      message,
      signature: body.signature as `0x${string}`,
    });
  } catch {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  if (recoveredAddress.toLowerCase() !== body.address.toLowerCase()) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  let isHuman: boolean;

  try {
    isHuman = await checkIsHuman(body.address);
  } catch {
    return NextResponse.json({ error: "NOT_HUMAN" }, { status: 403 });
  }

  if (!isHuman) {
    return NextResponse.json({ error: "NOT_HUMAN" }, { status: 403 });
  }

  try {
    recordVote(body.address, body.optionId as VoteOptionId);
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_VOTED") {
      return NextResponse.json({ error: "ALREADY_VOTED" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVALID_OPTION") {
      return NextResponse.json({ error: "INVALID_OPTION" }, { status: 400 });
    }
    throw error;
  }

  const { getResults } = await import("@/lib/server/vote-store");

  return NextResponse.json({ success: true, results: getResults() });
}
