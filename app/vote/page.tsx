"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { WalletConnect } from "@/components/wallet-connect";
import { ErrorCallout } from "@/components/error-callout";
import { StatusBadge } from "@/components/status-badge";
import { humanPassAbi } from "@/lib/contracts/HumanPass.abi";
import { WrongNetworkBanner } from "@/components/wrong-network-banner";
import { useDemoAccount, useDemoSignMessage } from "@/lib/e2e-wallet";
import { useMonadNetwork } from "@/hooks/use-monad-network";
import { VOTE_OPTIONS, type VoteOptionId } from "@/lib/server/vote-store";
import { monadTestnet } from "@/lib/wagmi/config";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;

function formatExpiry(validUntil: number): string {
  const remaining = validUntil - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Expired";
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `${mins}m ${secs}s remaining`;
}

function buildVoteMessage(params: {
  address: string;
  optionId: string;
  nonce: string;
  chainId: number;
  timestamp: number;
}) {
  return [
    "HumanPass vote",
    `Wallet: ${params.address}`,
    `Option: ${params.optionId}`,
    `Nonce: ${params.nonce}`,
    `Chain: ${params.chainId}`,
    `Timestamp: ${params.timestamp}`,
  ].join("\n");
}

function createNonce() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Results = Record<VoteOptionId, number>;

export default function VotePage() {
  const { address, isConnected } = useDemoAccount();
  const { signMessageAsync } = useDemoSignMessage();
  const { isWrongNetwork: isWrongChain } = useMonadNetwork();

  const [results, setResults] = useState<Results>({ sdk: 0, votes: 0, events: 0 });
  const [userVote, setUserVote] = useState<VoteOptionId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: isHuman, isError: isHumanReadError } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}` | undefined,
    abi: humanPassAbi,
    functionName: "isHuman",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && CONTRACT_ADDRESS) },
  });

  const { data: humanUntil, isError: isHumanUntilReadError } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}` | undefined,
    abi: humanPassAbi,
    functionName: "getHumanUntil",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && CONTRACT_ADDRESS) },
  });

  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpired = humanUntil !== undefined && humanUntil > 0 && humanUntil < nowSeconds;
  const proofStatus = useMemo(() => {
    if (!isConnected || !address) return "not_verified" as const;
    if (isHuman === undefined) return "pending" as const;
    if (!isHuman || isExpired) return "not_verified" as const;
    return "verified" as const;
  }, [isConnected, address, isHuman, isExpired]);
  const hasProofReadError = isHumanReadError || isHumanUntilReadError;

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch("/api/vote/results");
      const data = (await res.json()) as { results: Results };
      setResults(data.results);
    } catch {}
  }, []);

  const checkUserVote = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch("/api/vote/results");
      const data = (await res.json()) as { results: Results };
      setResults(data.results);
    } catch {}
  }, [address]);

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 3000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  useEffect(() => {
    if (address) {
      checkUserVote();
    } else {
      setUserVote(null);
      setSuccess(false);
      setError(null);
    }
  }, [address, checkUserVote]);

  const handleVote = async (optionId: VoteOptionId) => {
    if (!address || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const nonce = createNonce();
      const timestamp = Date.now();
      const message = buildVoteMessage({
        address,
        optionId,
        nonce,
        chainId: monadTestnet.id,
        timestamp,
      });

      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address,
          optionId,
          signature,
          nonce,
          chainId: monadTestnet.id,
          timestamp,
        }),
      });

      const data = (await res.json()) as { error?: string; results?: Results };

      if (!res.ok) {
        setError(data.error ?? "VOTE_FAILED");
        return;
      }

      setSuccess(true);
      setUserVote(optionId);
      if (data.results) {
        setResults(data.results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "VOTE_FAILED");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalVotes = results.sdk + results.votes + results.events;

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Protected Voting</h1>
            <p className="mt-1 text-text-secondary">
              Cast your vote in a demo poll gated by HumanPass.
            </p>
          </div>
          <WalletConnect />
        </div>

        <WrongNetworkBanner className="mb-6" />

        {isConnected && !isWrongChain && hasProofReadError && (
          <ErrorCallout
            title="RPC Unavailable"
            message="HumanPass could not read your proof from Monad right now. The public RPC may be rate-limited; wait a moment and try again."
            variant="warning"
            className="mb-6"
          />
        )}

        {error && (
          <ErrorCallout
            title={
              error === "NOT_HUMAN"
                ? "Not Verified"
                : error === "ALREADY_VOTED"
                  ? "Already Voted"
                  : error === "INVALID_SIGNATURE"
                    ? "Invalid Signature"
                    : error === "RPC_UNAVAILABLE"
                      ? "RPC Unavailable"
                      : "Vote Failed"
            }
            message={
              error === "NOT_HUMAN"
                ? "Your wallet does not have a valid HumanPass proof. Please verify first."
                : error === "ALREADY_VOTED"
                  ? "This wallet has already cast a vote."
                  : error === "INVALID_SIGNATURE"
                    ? "The vote signature could not be verified."
                    : error === "RPC_UNAVAILABLE"
                      ? "HumanPass could not confirm your proof on Monad. The public RPC may be temporarily unavailable."
                      : error
            }
            variant={error === "NOT_HUMAN" ? "warning" : "error"}
            className="mb-6"
          />
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-base leading-none" aria-hidden="true">
                ✓
              </span>
              <div>
                <p className="font-semibold">Vote Recorded</p>
                <p className="mt-0.5 text-text-secondary">
                  Your vote has been recorded and the results have been updated.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isConnected ? (
          <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
            <span className="text-4xl" aria-hidden="true">
              🔒
            </span>
            <h2 className="text-xl font-semibold text-text-primary">
              Connect Your Wallet
            </h2>
            <p className="max-w-md text-text-secondary">
              You need to connect a Monad Testnet wallet to participate in protected voting.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm text-text-muted">HumanPass status:</span>
              {proofStatus === "verified" ? (
                <StatusBadge variant="verified" label="Verified" />
              ) : proofStatus === "pending" ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" aria-hidden="true" />
                  <StatusBadge variant="pending" label="Checking..." />
                </span>
              ) : (
                <StatusBadge variant="not_verified" label="Not Verified" />
              )}
              {humanUntil !== undefined && humanUntil > 0 && !isExpired && (
                <span className="text-xs text-text-muted">
                  {formatExpiry(Number(humanUntil))}
                </span>
              )}
            </div>

            {proofStatus !== "verified" && (
              <div className="card-base bg-card-shine mb-6 flex flex-col items-center gap-4 py-10 text-center">
                <span className="text-4xl" aria-hidden="true">
                  🛡️
                </span>
                <h2 className="text-xl font-semibold text-text-primary">
                  Verification Required
                </h2>
                <p className="max-w-md text-text-secondary">
                  {isExpired
                    ? "Your HumanPass proof has expired. Please re-verify to continue voting."
                    : "You need a valid HumanPass proof to vote in this demo. Complete the verification challenge first."}
                </p>
                <Link href="/verify" className="btn-primary mt-2">
                  {isExpired ? "Re-verify →" : "Get your HumanPass →"}
                </Link>
              </div>
            )}

            {proofStatus === "verified" && userVote && (
              <div className="card-base bg-card-shine mb-6 flex flex-col items-center gap-3 py-8 text-center">
                <span className="text-3xl" aria-hidden="true">
                  🗳️
                </span>
                <h2 className="text-lg font-semibold text-text-primary">
                  You have already voted
                </h2>
                <p className="text-text-secondary">
                  You voted for: {" "}
                  <strong className="text-monad-cyan">
                    {VOTE_OPTIONS.find((o) => o.id === userVote)?.label}
                  </strong>
                </p>
              </div>
            )}

            {proofStatus === "verified" && !userVote && (
              <div className="mb-8 grid gap-4 sm:grid-cols-3">
                {VOTE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleVote(option.id)}
                    disabled={isSubmitting}
                    className="card-base bg-card-shine group flex flex-col items-center gap-3 py-8 text-center transition-transform hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <span className="text-3xl" aria-hidden="true">
                      {option.id === "sdk"
                        ? "📦"
                        : option.id === "votes"
                          ? "🗳️"
                          : "🎫"}
                    </span>
                    <h3 className="text-base font-semibold text-text-primary">
                      {option.label}
                    </h3>
                    <span className="text-sm font-semibold text-monad-purple transition-colors group-hover:text-monad-purple-light">
                      {isSubmitting ? "Signing..." : "Vote →"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="card-base bg-card-shine">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-primary">Live Results</h3>
                <span className="text-xs text-text-muted">
                  {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-4">
                {VOTE_OPTIONS.map((option) => {
                  const count = results[option.id];
                  const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;

                  return (
                    <div key={option.id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{option.label}</span>
                        <span className="font-mono text-text-primary">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-secondary">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-monad-purple to-monad-cyan transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
