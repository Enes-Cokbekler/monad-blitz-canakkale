import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";

import { requireHuman } from "@/lib/humanpass-sdk";
import {
  checkRateLimit,
  clientKey,
  rateLimitResponse,
} from "@/lib/server/rate-limiter";
import { claimReward } from "@/lib/server/reward-store";

type RewardClaimRequest = {
  address?: unknown;
};

export async function POST(request: Request) {
  let body: RewardClaimRequest;

  try {
    body = (await request.json()) as RewardClaimRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  if (body.address === undefined || body.address === null || body.address === "") {
    return NextResponse.json(
      { ok: false, error: "WALLET_REQUIRED", message: "Wallet required." },
      { status: 400 }
    );
  }

  if (typeof body.address !== "string" || !isAddress(body.address)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_ADDRESS", message: "Invalid wallet address." },
      { status: 400 }
    );
  }

  const address = getAddress(body.address);
  const rlKey = address.toLowerCase();
  const ipKey = clientKey(request);

  if (!checkRateLimit(rlKey, "reward_claim") || !checkRateLimit(ipKey, "global")) {
    return rateLimitResponse();
  }

  const human = await requireHuman(address);

  if (!human.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "HUMANPASS_REQUIRED",
        message: "Active HumanPass proof required.",
      },
      { status: 403 }
    );
  }

  try {
    const claim = claimReward(address);

    return NextResponse.json({
      ok: true,
      reward: claim.reward,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_CLAIMED") {
      return NextResponse.json(
        {
          ok: false,
          error: "ALREADY_CLAIMED",
          message: "Reward already claimed for this wallet.",
        },
        { status: 409 }
      );
    }

    throw error;
  }
}
