import { beforeEach, describe, expect, it } from "vitest";

import { GET } from "@/app/api/humans/live/route";
import { cacheProof, clearProofsForTests } from "@/lib/server/proof-cache";

const ACTIVE_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const EXPIRED_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const ACTIVE_TX_HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EXPIRED_TX_HASH = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

async function getLiveHumans() {
  const response = await GET();
  const json = (await response.json()) as {
    humans: Array<Record<string, unknown>>;
  };

  return { response, json };
}

describe("GET /api/humans/live", () => {
  beforeEach(() => {
    clearProofsForTests();
  });

  it("returns cached verified humans and filters expired entries", async () => {
    cacheProof(ACTIVE_ADDRESS, Date.now() + 300_000, ACTIVE_TX_HASH);
    cacheProof(EXPIRED_ADDRESS, Date.now() - 1_000, EXPIRED_TX_HASH);

    const { response, json } = await getLiveHumans();

    expect(response.status).toBe(200);
    expect(json.humans).toHaveLength(1);
    expect(json.humans[0]).toMatchObject({
      address: "0x1234...5678",
      fullAddress: ACTIVE_ADDRESS.toLowerCase(),
      status: "verified",
      txHash: ACTIVE_TX_HASH,
    });
    expect(json.humans[0].secondsRemaining).toBeGreaterThan(0);
  });

  it("returns an empty list when no cached proofs are active", async () => {
    cacheProof(EXPIRED_ADDRESS, Date.now() - 1_000, EXPIRED_TX_HASH);

    const { response, json } = await getLiveHumans();

    expect(response.status).toBe(200);
    expect(json.humans).toEqual([]);
  });
});
