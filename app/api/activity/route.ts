import { getAddress, isAddress } from "viem";
import { NextRequest, NextResponse } from "next/server";

import {
  getHumanProofEventsForAddress,
  getRecentHumanPassEvents,
  type HumanPassEvent,
} from "@/lib/humanpass-events";

function serializeEvent(event: HumanPassEvent) {
  return {
    ...event,
    blockNumber: event.blockNumber.toString(),
  };
}

export async function GET(request: NextRequest) {
  const rawAddress = request.nextUrl.searchParams.get("address");

  if (rawAddress) {
    if (!isAddress(rawAddress)) {
      return NextResponse.json({ error: "INVALID_ADDRESS" }, { status: 400 });
    }

    const address = getAddress(rawAddress);
    const result = await getHumanProofEventsForAddress(address);

    return NextResponse.json(
      {
        events: result.events.map(serializeEvent),
        fromBlock: result.fromBlock.toString(),
        ...(result.error ? { error: result.error } : {}),
      },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } }
    );
  }

  const result = await getRecentHumanPassEvents();

  return NextResponse.json(
    {
      events: result.events.map(serializeEvent),
      fromBlock: result.fromBlock.toString(),
      ...(result.error ? { error: result.error } : {}),
    },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } }
  );
}
