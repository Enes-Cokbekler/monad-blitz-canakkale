import { randomBytes, randomUUID } from "crypto";

import {
  CHALLENGE_TTL_MS,
  FUNNY_QUESTIONS,
  MAX_ATTEMPTS,
  TYPING_PHRASE,
  type ChallengeSession,
  type ChallengeType,
} from "@/lib/server/challenge-schema";

type ChallengeStore = {
  challenges: Map<string, ChallengeSession>;
  activeChallengesByWallet: Map<string, string>;
};

declare global {
  var __humanPassChallengeStore: ChallengeStore | undefined;
}

const challengeStore =
  globalThis.__humanPassChallengeStore ??= {
    challenges: new Map<string, ChallengeSession>(),
    activeChallengesByWallet: new Map<string, string>(),
  };

const CHALLENGE_TYPES: ChallengeType[] = [
  "number_sequence",
  "reaction",
  "typing_phrase",
  "funny_question",
];

function walletKey(address: string) {
  return address.toLowerCase();
}

function isActive(challenge: ChallengeSession) {
  return !challenge.consumed && challenge.expiresAt > Date.now();
}

function createNonce() {
  return randomBytes(16).toString("hex");
}

function createNumbers() {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, 5);
}

function randomInt(min: number, max: number) {
  return min + (randomBytes(1)[0] % (max - min + 1));
}

function pickRandomType(): ChallengeType {
  return CHALLENGE_TYPES[randomBytes(1)[0] % CHALLENGE_TYPES.length];
}

function buildSession(
  address: string,
  chainId: number,
  type: ChallengeType
): ChallengeSession {
  const now = Date.now();
  const base: ChallengeSession = {
    challengeId: randomUUID(),
    nonce: createNonce(),
    createdAt: now,
    expiresAt: now + CHALLENGE_TTL_MS,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    consumed: false,
    address,
    chainId,
    type,
    numbers: [],
  };

  switch (type) {
    case "number_sequence":
      base.numbers = createNumbers();
      break;
    case "reaction": {
      const delayMs = randomInt(1500, 4000);
      const windowMs = randomInt(1000, 1500);
      base.reactionDelayMs = delayMs;
      base.reactionWindowMs = windowMs;
      base.reactionWindowOpenAt = Date.now() + delayMs;
      break;
    }
    case "typing_phrase":
      base.expectedPhrase = TYPING_PHRASE;
      break;
    case "funny_question":
      base.questionIndex = randomBytes(1)[0] % FUNNY_QUESTIONS.length;
      break;
  }

  return base;
}

export function createChallenge(address: string, chainId: number, forceType?: ChallengeType) {
  cleanupExpiredChallenges();
  const key = walletKey(address);
  const previousChallengeId = challengeStore.activeChallengesByWallet.get(key);
  if (previousChallengeId) {
    consumeChallenge(previousChallengeId);
  }

  const type = forceType ?? pickRandomType();
  const challenge = buildSession(address, chainId, type);

  challengeStore.challenges.set(challenge.challengeId, challenge);
  challengeStore.activeChallengesByWallet.set(key, challenge.challengeId);

  return challenge;
}

export function getChallenge(challengeId: string) {
  return challengeStore.challenges.get(challengeId);
}

export function consumeChallenge(challengeId: string) {
  const challenge = challengeStore.challenges.get(challengeId);
  if (!challenge) return undefined;

  challenge.consumed = true;
  challenge.consumedAt = Date.now();
  if (
    challengeStore.activeChallengesByWallet.get(walletKey(challenge.address)) ===
    challengeId
  ) {
    challengeStore.activeChallengesByWallet.delete(walletKey(challenge.address));
  }
  return challenge;
}

export function incrementAttempts(challengeId: string) {
  const challenge = challengeStore.challenges.get(challengeId);
  if (!challenge) return undefined;
  challenge.attempts += 1;
  return challenge;
}

export function getActiveChallenge(address: string) {
  const challengeId = challengeStore.activeChallengesByWallet.get(walletKey(address));
  if (!challengeId) return undefined;

  const challenge = challengeStore.challenges.get(challengeId);
  if (!challenge || !isActive(challenge)) {
    challengeStore.activeChallengesByWallet.delete(walletKey(address));
    return undefined;
  }
  return challenge;
}

/** Grace period after which a consumed challenge is eligible for cleanup. */
const CONSUMED_GRACE_MS = 30_000;

/**
 * Remove stale challenges from memory.
 * - Expired challenges (now > expiresAt) are always removed.
 * - Consumed challenges are removed after CONSUMED_GRACE_MS.
 * Called automatically on createChallenge; export for direct test use.
 */
export function cleanupExpiredChallenges() {
  const now = Date.now();
  for (const [id, challenge] of challengeStore.challenges) {
    const expired = now > challenge.expiresAt;
    const consumedAndGraced =
      challenge.consumed &&
      challenge.consumedAt !== undefined &&
      now > challenge.consumedAt + CONSUMED_GRACE_MS;

    if (expired || consumedAndGraced) {
      challengeStore.challenges.delete(id);
      if (challengeStore.activeChallengesByWallet.get(walletKey(challenge.address)) === id) {
        challengeStore.activeChallengesByWallet.delete(walletKey(challenge.address));
      }
    }
  }
}

export function clearChallengesForTests() {
  challengeStore.challenges.clear();
  challengeStore.activeChallengesByWallet.clear();
}
