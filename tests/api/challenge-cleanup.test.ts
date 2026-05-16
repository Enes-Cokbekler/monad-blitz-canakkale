import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cleanupExpiredChallenges,
  clearChallengesForTests,
  consumeChallenge,
  createChallenge,
  getChallenge,
} from "@/lib/server/challenge-store";

const CHAIN_ID = 10143;
const ADDR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

beforeEach(() => {
  vi.useFakeTimers();
  clearChallengesForTests();
});

afterEach(() => {
  vi.useRealTimers();
  clearChallengesForTests();
});

describe("cleanupExpiredChallenges", () => {
  it("removes expired challenges", () => {
    const ch = createChallenge(ADDR, CHAIN_ID);
    const id = ch.challengeId;

    // Advance past expiry
    vi.advanceTimersByTime(ch.expiresAt - Date.now() + 1);

    cleanupExpiredChallenges();
    expect(getChallenge(id)).toBeUndefined();
  });

  it("does not remove active (non-expired, non-consumed) challenges", () => {
    const ch = createChallenge(ADDR, CHAIN_ID);
    const id = ch.challengeId;

    // Only advance half the TTL — still active
    vi.advanceTimersByTime(60_000);

    cleanupExpiredChallenges();
    expect(getChallenge(id)).toBeDefined();
  });

  it("removes consumed challenges after grace period", () => {
    const ch = createChallenge(ADDR, CHAIN_ID);
    const id = ch.challengeId;

    consumeChallenge(id);

    // Grace period is 30s — advance past it
    vi.advanceTimersByTime(31_000);

    cleanupExpiredChallenges();
    expect(getChallenge(id)).toBeUndefined();
  });

  it("keeps freshly consumed challenges within grace period", () => {
    const ch = createChallenge(ADDR, CHAIN_ID);
    const id = ch.challengeId;

    consumeChallenge(id);

    // Only 5 seconds elapsed — within grace period
    vi.advanceTimersByTime(5_000);

    cleanupExpiredChallenges();
    expect(getChallenge(id)).toBeDefined();
  });
});
