export type RewardClaim = {
  address: string;
  reward: {
    name: string;
    claimCode: string;
    claimedAt: string;
  };
};

export const REWARD_NAME = "Hackathon Coffee Coupon";

type RewardStore = {
  claims: Map<string, RewardClaim>;
};

declare global {
  var __humanPassRewardStore: RewardStore | undefined;
}

const rewardStore =
  globalThis.__humanPassRewardStore ??= {
    claims: new Map<string, RewardClaim>(),
  };

function walletKey(address: string) {
  return address.toLowerCase();
}

function createMockClaimCode(address: string) {
  const suffix = address.slice(2, 6).toUpperCase();
  const entropy = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0")
    .toUpperCase();

  return `HUMAN-${suffix}-${entropy}`;
}

export function claimReward(address: string): RewardClaim {
  const key = walletKey(address);

  if (rewardStore.claims.has(key)) {
    throw new Error("ALREADY_CLAIMED");
  }

  const claim: RewardClaim = {
    address: key,
    reward: {
      name: REWARD_NAME,
      claimCode: createMockClaimCode(address),
      claimedAt: new Date().toISOString(),
    },
  };

  rewardStore.claims.set(key, claim);
  return claim;
}

export function getRewardClaim(address: string): RewardClaim | undefined {
  return rewardStore.claims.get(walletKey(address));
}

export function hasClaimedReward(address: string): boolean {
  return rewardStore.claims.has(walletKey(address));
}

export function clearRewardClaimsForTests() {
  rewardStore.claims.clear();
}
