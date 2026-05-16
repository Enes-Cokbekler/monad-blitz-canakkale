import { getAddress, isAddress } from "viem";
import { NextRequest, NextResponse } from "next/server";

import { getHumanPassStatus } from "@/lib/humanpass-sdk";
import { getProof } from "@/lib/server/proof-cache";

export async function GET(request: NextRequest) {
  const rawAddress = request.nextUrl.searchParams.get("address");

  if (!rawAddress || !isAddress(rawAddress)) {
    return NextResponse.json({ error: "INVALID_ADDRESS" }, { status: 400 });
  }

  const address = getAddress(rawAddress);

  let proofStatus: Awaited<ReturnType<typeof getHumanPassStatus>>;
  try {
    proofStatus = await getHumanPassStatus(address);
  } catch (error) {
    if (error instanceof Error && error.message === "CONTRACT_NOT_CONFIGURED") {
      return NextResponse.json({ error: "CONTRACT_NOT_CONFIGURED" }, { status: 500 });
    }
    throw error;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const status = proofStatus.isHuman
    ? "verified"
    : proofStatus.humanUntil > 0 && proofStatus.humanUntil <= nowSeconds
      ? "expired"
      : "not_verified";

  const latestProof = getProof(address);

  return NextResponse.json(
    {
      address: proofStatus.address,
      status,
      humanUntil: proofStatus.humanUntil,
      secondsRemaining: proofStatus.expiresInSeconds,
      ...(latestProof ? { latestTxHash: latestProof.txHash } : {}),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    }
  );
}
