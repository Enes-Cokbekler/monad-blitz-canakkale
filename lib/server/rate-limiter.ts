// ─── Types ────────────────────────────────────────────────────────────────────

export type RateLimitAction =
  | "challenge_start"
  | "challenge_verify"
  | "vote"
  | "reward_claim"
  | "global";

type WindowEntry = { count: number; windowStart: number };

// ─── Config ───────────────────────────────────────────────────────────────────

export const RATE_LIMITS: Record<RateLimitAction, { max: number; windowMs: number }> = {
  challenge_start:  { max: Number(process.env.RL_CHALLENGE_START_MAX  ?? 5),  windowMs: 60_000 },
  challenge_verify: { max: Number(process.env.RL_CHALLENGE_VERIFY_MAX ?? 10), windowMs: 60_000 },
  vote:             { max: Number(process.env.RL_VOTE_MAX             ?? 5),  windowMs: 60_000 },
  reward_claim:     { max: Number(process.env.RL_REWARD_CLAIM_MAX     ?? 5),  windowMs: 60_000 },
  global:           { max: Number(process.env.RL_GLOBAL_MAX           ?? 30), windowMs: 60_000 },
};

// ─── Store ────────────────────────────────────────────────────────────────────

declare global {
  var __humanPassRateLimitStore: Map<string, WindowEntry> | undefined;
}

const store: Map<string, WindowEntry> =
  (globalThis.__humanPassRateLimitStore ??= new Map());

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Returns true if the request is within limits (allowed).
 * Returns false if the rate limit has been exceeded (block).
 * Sliding-window counter: resets after windowMs.
 */
export function checkRateLimit(key: string, action: RateLimitAction): boolean {
  const { max, windowMs } = RATE_LIMITS[action];
  const now = Date.now();
  const storeKey = `${action}:${key}`;
  const entry = store.get(storeKey);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(storeKey, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count += 1;
  return true;
}

/** Extract the best available client identifier from request headers. */
export function clientKey(request: Request, fallback?: string): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return fallback ?? "unknown";
}

/** Rate-limit response helper. */
export function rateLimitResponse() {
  return Response.json(
    { ok: false, error: "Rate limit exceeded. Please wait and try again." },
    { status: 429 }
  );
}

/** Reset all buckets — for tests only. */
export function resetRateLimitForTests() {
  store.clear();
}
