import { NextResponse } from "next/server";

import { getAllProofs } from "@/lib/server/proof-cache";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function GET() {
  const now = Date.now();

  const humans = getAllProofs()
    .filter((proof) => proof.humanUntil > now)
    .map((proof) => ({
      address: truncateAddress(proof.address),
      fullAddress: proof.address,
      status: "verified" as const,
      humanUntil: proof.humanUntil,
      secondsRemaining: Math.max(0, Math.floor((proof.humanUntil - now) / 1000)),
      txHash: proof.txHash,
    }));

  return NextResponse.json({ humans });
}
