export interface ProofEntry {
  address: string;
  humanUntil: number;
  txHash: string;
  issuedAt: number;
}

type ProofCache = {
  proofs: Map<string, ProofEntry>;
};

declare global {
  var __humanPassProofCache: ProofCache | undefined;
}

const proofCache =
  globalThis.__humanPassProofCache ??= {
    proofs: new Map<string, ProofEntry>(),
  };

export function cacheProof(address: string, humanUntil: number, txHash: string) {
  const entry: ProofEntry = {
    address: address.toLowerCase(),
    humanUntil,
    txHash,
    issuedAt: Date.now(),
  };

  proofCache.proofs.set(address.toLowerCase(), entry);
}

export function getProof(address: string) {
  return proofCache.proofs.get(address.toLowerCase());
}

export function getAllProofs() {
  return Array.from(proofCache.proofs.values());
}

export function clearProofsForTests() {
  proofCache.proofs.clear();
}
