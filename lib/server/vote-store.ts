export type VoteOptionId = "sdk" | "votes" | "events";

export type VoteRecord = {
  address: string;
  optionId: VoteOptionId;
  timestamp: number;
};

export const VOTE_OPTIONS: { id: VoteOptionId; label: string }[] = [
  { id: "sdk", label: "Ship HumanPass SDK" },
  { id: "votes", label: "Protect consumer votes" },
  { id: "events", label: "Event check-in badges" },
];

type VoteStore = {
  votes: Map<string, VoteRecord>;
  tallies: Record<VoteOptionId, number>;
};

declare global {
  var __humanPassVoteStore: VoteStore | undefined;
}

const voteStore =
  globalThis.__humanPassVoteStore ??= {
    votes: new Map<string, VoteRecord>(),
    tallies: {
      sdk: 0,
      votes: 0,
      events: 0,
    },
  };

function walletKey(address: string) {
  return address.toLowerCase();
}

export function recordVote(address: string, optionId: VoteOptionId): VoteRecord {
  const key = walletKey(address);

  if (voteStore.votes.has(key)) {
    throw new Error("ALREADY_VOTED");
  }

  if (!VOTE_OPTIONS.some((opt) => opt.id === optionId)) {
    throw new Error("INVALID_OPTION");
  }

  const vote: VoteRecord = {
    address: key,
    optionId,
    timestamp: Date.now(),
  };

  voteStore.votes.set(key, vote);
  voteStore.tallies[optionId] += 1;

  return vote;
}

export function hasVoted(address: string): boolean {
  return voteStore.votes.has(walletKey(address));
}

export function getVote(address: string): VoteRecord | undefined {
  return voteStore.votes.get(walletKey(address));
}

export function getResults(): Record<VoteOptionId, number> {
  return { ...voteStore.tallies };
}

export function clearVotesForTests() {
  voteStore.votes.clear();
  voteStore.tallies.sdk = 0;
  voteStore.tallies.votes = 0;
  voteStore.tallies.events = 0;
}
