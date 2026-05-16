import { NextResponse } from "next/server";

import { getResults } from "@/lib/server/vote-store";

export async function GET() {
  return NextResponse.json({ results: getResults() });
}
