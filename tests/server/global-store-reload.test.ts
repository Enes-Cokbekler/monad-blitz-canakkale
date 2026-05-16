import { afterEach, describe, expect, it, vi } from "vitest";

const VALID_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const VALID_CHAIN_ID = 10143;

describe("global server stores", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("keeps challenge sessions across module reloads", async () => {
    const first = await import("@/lib/server/challenge-store");
    first.clearChallengesForTests();

    const challenge = first.createChallenge(VALID_ADDRESS, VALID_CHAIN_ID);

    vi.resetModules();

    const second = await import("@/lib/server/challenge-store");

    expect(second.getChallenge(challenge.challengeId)).toMatchObject({
      challengeId: challenge.challengeId,
      address: VALID_ADDRESS,
      chainId: VALID_CHAIN_ID,
    });
    expect(second.getActiveChallenge(VALID_ADDRESS)?.challengeId).toBe(
      challenge.challengeId
    );

    second.clearChallengesForTests();
  });

  it("keeps cached proofs across module reloads", async () => {
    const first = await import("@/lib/server/proof-cache");
    first.clearProofsForTests();

    first.cacheProof(VALID_ADDRESS, Date.now() + 600_000, "0xabc");

    vi.resetModules();

    const second = await import("@/lib/server/proof-cache");

    expect(second.getProof(VALID_ADDRESS)).toMatchObject({
      address: VALID_ADDRESS,
      txHash: "0xabc",
    });
    expect(second.getAllProofs()).toHaveLength(1);

    second.clearProofsForTests();
  });

  it("keeps votes and tallies across module reloads", async () => {
    const first = await import("@/lib/server/vote-store");
    first.clearVotesForTests();

    const vote = first.recordVote(VALID_ADDRESS, "sdk");

    vi.resetModules();

    const second = await import("@/lib/server/vote-store");

    expect(second.getVote(VALID_ADDRESS)).toMatchObject(vote);
    expect(second.hasVoted(VALID_ADDRESS)).toBe(true);
    expect(second.getResults()).toEqual({ sdk: 1, votes: 0, events: 0 });

    second.clearVotesForTests();
  });
});
