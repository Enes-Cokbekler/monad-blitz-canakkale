import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";

import { getRewardClaim, REWARD_NAME } from "@/lib/server/reward-store";

export async function GET(request: NextRequest) {
  const rawAddress = request.nextUrl.searchParams.get("address");

  if (!rawAddress) {
    return NextResponse.json(
      { ok: false, error: "WALLET_REQUIRED", message: "Wallet required." },
      { status: 400 }
    );
  }

  if (!isAddress(rawAddress)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_ADDRESS", message: "Invalid wallet address." },
      { status: 400 }
    );
  }

  const address = getAddress(rawAddress);
  const claim = getRewardClaim(address);

  return NextResponse.json({
    ok: true,
    address,
    rewardName: REWARD_NAME,
    claimed: Boolean(claim),
    ...(claim ? { reward: claim.reward } : {}),
  });
}
