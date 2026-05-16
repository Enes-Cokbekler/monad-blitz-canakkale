import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, getAddress, http, isAddress, type Address } from "viem";

import { monadTestnet } from "@/lib/chains/monad";
import { createHumanPassReadConfig } from "@/lib/contracts/humanpass";
import { getProof } from "@/lib/server/proof-cache";

type ProofStatus = "verified" | "not_verified" | "expired";

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(monadTestnet.rpcUrls.default.http[0]),
});

function getStatus(isHuman: boolean, humanUntil: number, nowSeconds: number): ProofStatus {
  if (isHuman && humanUntil > nowSeconds) {
    return "verified";
  }

  if (humanUntil > 0 && humanUntil <= nowSeconds) {
    return "expired";
  }

  return "not_verified";
}

function getSecondsRemaining(status: ProofStatus, humanUntil: number, nowSeconds: number) {
  return status === "verified" ? Math.max(0, humanUntil - nowSeconds) : 0;
}

function isContractNotConfiguredError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS")
  );
}

export async function GET(request: NextRequest) {
  const rawAddress = request.nextUrl.searchParams.get("address");

  if (!rawAddress || !isAddress(rawAddress)) {
    return NextResponse.json({ error: "INVALID_ADDRESS" }, { status: 400 });
  }

  const address = getAddress(rawAddress) as Address;
  let humanUntilResult: bigint = 0n;
  let isHumanResult = false;

  try {
    const [fetchedHumanUntil, fetchedIsHuman] = (await Promise.all([
      publicClient.readContract(createHumanPassReadConfig("getHumanUntil", [address])),
      publicClient.readContract(createHumanPassReadConfig("isHuman", [address])),
    ])) as [bigint, boolean];
    humanUntilResult = fetchedHumanUntil;
    isHumanResult = fetchedIsHuman;
  } catch (error) {
    if (isContractNotConfiguredError(error)) {
      return NextResponse.json({ error: "CONTRACT_NOT_CONFIGURED" }, { status: 500 });
    }

    throw error;
  }

  const humanUntil = Number(humanUntilResult);
  const isHuman = Boolean(isHumanResult);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const status = getStatus(isHuman, humanUntil, nowSeconds);
  const latestProof = getProof(address);

  return NextResponse.json({
    address,
    status,
    humanUntil,
    secondsRemaining: getSecondsRemaining(status, humanUntil, nowSeconds),
    ...(latestProof ? { latestTxHash: latestProof.txHash } : {}),
  });
}
