import { NextResponse } from "next/server";

import { getHealthStatus } from "@/lib/server/health";

export async function GET() {
  try {
    const health = await getHealthStatus();
    return NextResponse.json(health, {
      status: health.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "HEALTH_CHECK_FAILED" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
