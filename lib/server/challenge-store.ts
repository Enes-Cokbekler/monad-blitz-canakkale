import { randomBytes, randomUUID } from "crypto";

import {
  CHALLENGE_TTL_MS,
  type ChallengeSession,
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

  for (let index = digits.length - 1; index > 0; index -= 1) {
    const swapIndex = randomBytes(1)[0] % (index + 1);
    [digits[index], digits[swapIndex]] = [digits[swapIndex], digits[index]];
  }

  return digits.slice(0, 5);
}

export function createChallenge(address: string, chainId: number) {
  const key = walletKey(address);
  const previousChallengeId = challengeStore.activeChallengesByWallet.get(key);

  if (previousChallengeId) {
    consumeChallenge(previousChallengeId);
  }

  const challenge: ChallengeSession = {
    challengeId: randomUUID(),
    nonce: createNonce(),
    numbers: createNumbers(),
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
    attempts: 0,
    consumed: false,
    address,
    chainId,
  };

  challengeStore.challenges.set(challenge.challengeId, challenge);
  challengeStore.activeChallengesByWallet.set(key, challenge.challengeId);

  return challenge;
}

export function getChallenge(challengeId: string) {
  return challengeStore.challenges.get(challengeId);
}

export function consumeChallenge(challengeId: string) {
  const challenge = challengeStore.challenges.get(challengeId);

  if (!challenge) {
    return undefined;
  }

  challenge.consumed = true;

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

  if (!challenge) {
    return undefined;
  }

  challenge.attempts += 1;

  return challenge;
}

export function getActiveChallenge(address: string) {
  const challengeId = challengeStore.activeChallengesByWallet.get(
    walletKey(address)
  );

  if (!challengeId) {
    return undefined;
  }

  const challenge = challengeStore.challenges.get(challengeId);

  if (!challenge || !isActive(challenge)) {
    challengeStore.activeChallengesByWallet.delete(walletKey(address));
    return undefined;
  }

  return challenge;
}

export function clearChallengesForTests() {
  challengeStore.challenges.clear();
  challengeStore.activeChallengesByWallet.clear();
}
