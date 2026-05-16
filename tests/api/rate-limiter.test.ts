import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkRateLimit,
  clientKey,
  RATE_LIMITS,
  resetRateLimitForTests,
} from "@/lib/server/rate-limiter";

beforeEach(() => resetRateLimitForTests());
afterEach(() => {
  vi.useRealTimers();
  resetRateLimitForTests();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit", () => {
    const max = RATE_LIMITS.challenge_start.max;
    for (let i = 0; i < max; i++) {
      expect(checkRateLimit("0xabc", "challenge_start")).toBe(true);
    }
  });

  it("blocks after limit is exceeded", () => {
    const max = RATE_LIMITS.challenge_start.max;
    for (let i = 0; i < max; i++) checkRateLimit("0xabc", "challenge_start");
    expect(checkRateLimit("0xabc", "challenge_start")).toBe(false);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    const max = RATE_LIMITS.challenge_verify.max;
    const { windowMs } = RATE_LIMITS.challenge_verify;

    for (let i = 0; i < max; i++) checkRateLimit("0xdef", "challenge_verify");
    expect(checkRateLimit("0xdef", "challenge_verify")).toBe(false);

    vi.advanceTimersByTime(windowMs + 1);
    expect(checkRateLimit("0xdef", "challenge_verify")).toBe(true);
  });

  it("separate keys do not share limits", () => {
    const max = RATE_LIMITS.vote.max;
    for (let i = 0; i < max; i++) checkRateLimit("wallet-a", "vote");
    // wallet-a is blocked, wallet-b should still be allowed
    expect(checkRateLimit("wallet-a", "vote")).toBe(false);
    expect(checkRateLimit("wallet-b", "vote")).toBe(true);
  });

  it("enforces global IP limit independently", () => {
    const max = RATE_LIMITS.global.max;
    for (let i = 0; i < max; i++) checkRateLimit("1.2.3.4", "global");
    expect(checkRateLimit("1.2.3.4", "global")).toBe(false);
    // different IP unaffected
    expect(checkRateLimit("5.6.7.8", "global")).toBe(true);
  });
});

describe("clientKey", () => {
  it("extracts first IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" },
    });
    expect(clientKey(req)).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "3.3.3.3" },
    });
    expect(clientKey(req)).toBe("3.3.3.3");
  });

  it("returns fallback string when no header present", () => {
    const req = new Request("http://localhost");
    expect(clientKey(req, "sentinel")).toBe("sentinel");
  });
});
