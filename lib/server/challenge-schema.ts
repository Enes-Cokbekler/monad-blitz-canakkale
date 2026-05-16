export const CHALLENGE_TTL_MS = 120_000;
export const MONAD_TESTNET_CHAIN_ID = 10143;

export type ChallengeSession = {
  challengeId: string;
  nonce: string;
  numbers: number[];
  expiresAt: number;
  attempts: number;
  consumed: boolean;
  address: string;
  chainId: number;
};

export type ChallengeStartResponse = Pick<
  ChallengeSession,
  "challengeId" | "nonce" | "expiresAt" | "numbers"
> & {
  message: string;
};

export function buildChallengeMessage(challenge: ChallengeSession) {
  return [
    "HumanPass challenge",
    `Wallet: ${challenge.address}`,
    `Chain: ${challenge.chainId}`,
    `Challenge: ${challenge.challengeId}`,
    `Nonce: ${challenge.nonce}`,
    `Numbers: ${challenge.numbers.join(",")}`,
    `Expires: ${challenge.expiresAt}`,
  ].join("\n");
}
