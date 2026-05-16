"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";

import { ErrorCallout } from "@/components/error-callout";
import { StatusBadge } from "@/components/status-badge";
import { WalletConnect } from "@/components/wallet-connect";
import { WrongNetworkBanner } from "@/components/wrong-network-banner";
import { useMonadNetwork } from "@/hooks/use-monad-network";
import { humanPassAbi } from "@/lib/contracts/HumanPass.abi";
import { useDemoAccount } from "@/lib/e2e-wallet";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
const REWARD_NAME = "Hackathon Coffee Coupon";

type Reward = {
  name: string;
  claimCode: string;
  claimedAt: string;
};

type RewardStatusResponse = {
  ok: boolean;
  claimed?: boolean;
  reward?: Reward;
  error?: string;
  message?: string;
};

type ClaimResponse = {
  ok: boolean;
  reward?: Reward;
  error?: string;
  message?: string;
};

function formatExpiry(validUntil: number): string {
  const remaining = validUntil - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Expired";

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `${mins}m ${secs}s remaining`;
}

function formatClaimedAt(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RewardsPage() {
  const { address, isConnected } = useDemoAccount();
  const { isWrongNetwork: isWrongChain } = useMonadNetwork();
  const [reward, setReward] = useState<Reward | null>(null);
  const [isClaimed, setIsClaimed] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
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
  }, [address, isConnected, isExpired, isHuman]);
  const hasProofReadError = isHumanReadError || isHumanUntilReadError;

  const fetchRewardStatus = useCallback(async () => {
    if (!address) {
      setReward(null);
      setIsClaimed(false);
      return;
    }

    setIsLoadingStatus(true);
    try {
      const res = await fetch(`/api/reward/status?address=${encodeURIComponent(address)}`);
      const data = (await res.json()) as RewardStatusResponse;

      if (!res.ok) {
        setError(data.message ?? data.error ?? "REWARD_STATUS_FAILED");
        return;
      }

      setIsClaimed(Boolean(data.claimed));
      setReward(data.reward ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "REWARD_STATUS_FAILED");
    } finally {
      setIsLoadingStatus(false);
    }
  }, [address]);

  useEffect(() => {
    setError(null);
    setSuccess(false);
    fetchRewardStatus();
  }, [fetchRewardStatus]);

  const handleClaim = async () => {
    if (!address || isClaiming) return;

    setIsClaiming(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/reward/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = (await res.json()) as ClaimResponse;

      if (!res.ok) {
        if (data.error === "ALREADY_CLAIMED") {
          setIsClaimed(true);
          await fetchRewardStatus();
        }

        setError(data.message ?? data.error ?? "REWARD_CLAIM_FAILED");
        return;
      }

      setReward(data.reward ?? null);
      setIsClaimed(true);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "REWARD_CLAIM_FAILED");
    } finally {
      setIsClaiming(false);
    }
  };

  const canClaim = isConnected && !isWrongChain && proofStatus === "verified" && !isClaimed;

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
      <div className="w-full max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-monad-cyan/30 bg-monad-cyan/10 px-3 py-1 text-xs font-semibold text-monad-cyan">
              SECOND CONSUMER DEMO
            </div>
            <h1 className="text-3xl font-bold text-text-primary">HumanPass-protected rewards</h1>
            <p className="mt-1 max-w-2xl text-text-secondary">
              Claim a mock hackathon perk only after your wallet has an active on-chain HumanPass proof.
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
            title={isClaimed ? "Already Claimed" : error === "Active HumanPass proof required." ? "Verification Required" : "Reward Claim Failed"}
            message={error}
            variant={error === "Active HumanPass proof required." || isClaimed ? "warning" : "error"}
            className="mb-6"
          />
        )}

        {success && reward && (
          <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <p className="font-semibold">Claim Accepted</p>
            <p className="mt-0.5 text-text-secondary">
              Your mock reward code is ready: <span className="font-mono text-emerald-300">{reward.claimCode}</span>
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="card-base bg-card-shine overflow-hidden p-0">
            <div className="border-b border-surface-border bg-gradient-to-br from-monad-purple/20 via-surface-card to-monad-cyan/10 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-monad-cyan">Featured reward</p>
                  <h2 className="mt-2 text-2xl font-black text-text-primary">{REWARD_NAME}</h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    A demo-only coffee coupon proving rewards can reuse the same HumanPass proof as voting.
                  </p>
                </div>
                <span className="rounded-2xl border border-surface-border bg-surface-secondary px-4 py-3 text-4xl" aria-hidden="true">
                  ☕
                </span>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-surface-border bg-surface-secondary p-4">
                  <p className="text-xs text-text-muted">Wallet</p>
                  <p className="mt-1 break-all font-mono text-sm text-text-primary">
                    {address ?? "Not connected"}
                  </p>
                </div>
                <div className="rounded-lg border border-surface-border bg-surface-secondary p-4">
                  <p className="mb-2 text-xs text-text-muted">HumanPass</p>
                  {proofStatus === "verified" ? (
                    <StatusBadge variant="verified" label="Verified Human" />
                  ) : proofStatus === "pending" ? (
                    <StatusBadge variant="pending" label="Checking..." />
                  ) : (
                    <StatusBadge variant="not_verified" label="Blocked" />
                  )}
                  {humanUntil !== undefined && humanUntil > 0 && !isExpired && (
                    <p className="mt-2 text-xs text-text-muted">{formatExpiry(Number(humanUntil))}</p>
                  )}
                </div>
                <div className="rounded-lg border border-surface-border bg-surface-secondary p-4">
                  <p className="mb-2 text-xs text-text-muted">Reward State</p>
                  {isLoadingStatus ? (
                    <StatusBadge variant="pending" label="Loading..." />
                  ) : isClaimed ? (
                    <StatusBadge variant="verified" label="Claimed" />
                  ) : (
                    <StatusBadge variant="pending" label="Unclaimed" />
                  )}
                </div>
              </div>

              {!isConnected && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                  Connect your Monad Testnet wallet before claiming this reward.
                </div>
              )}

              {isConnected && proofStatus !== "verified" && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <p className="font-semibold text-red-300">Unverified wallet → blocked</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Active HumanPass proof required. Verify once, then return to claim the reward.
                  </p>
                  <Link href="/verify" className="btn-primary mt-4 inline-flex">
                    Verify with HumanPass →
                  </Link>
                </div>
              )}

              {proofStatus === "verified" && !isClaimed && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="font-semibold text-emerald-300">Verified human → claim accepted</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Your active proof unlocks this consumer action without another challenge.
                  </p>
                </div>
              )}

              {isClaimed && reward && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="font-semibold text-emerald-300">Reward already claimed</p>
                  <p className="mt-1 text-sm text-text-secondary">Duplicate claims from this wallet are blocked.</p>
                  <div className="mt-4 rounded-lg border border-surface-border bg-surface-primary p-4">
                    <p className="text-xs text-text-muted">Mock claim code</p>
                    <p className="mt-1 font-mono text-xl font-black text-monad-cyan">{reward.claimCode}</p>
                    <p className="mt-2 text-xs text-text-muted">Claimed {formatClaimedAt(reward.claimedAt)}</p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleClaim}
                disabled={!canClaim || isClaiming}
                className="btn-primary w-full py-3 text-base disabled:opacity-50"
              >
                {isClaiming ? "Claiming..." : isClaimed ? "Reward already claimed" : "Claim Coffee Coupon"}
              </button>

              <div className="flex flex-wrap gap-3 text-sm">
                <Link href="/verify" className="btn-secondary">Verify with HumanPass</Link>
                <Link href="/status" className="btn-secondary">Check proof status</Link>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            {[
              ["Coffee Coupon", "MVP reward protected today"],
              ["Hackathon Snack Pass", "Same proof can gate event perks"],
              ["Monad Human Badge Access", "No NFT minting needed for this demo"],
              ["Mystery Reward", "Any sensitive action can reuse the check"],
            ].map(([name, body]) => (
              <div key={name} className="rounded-xl border border-surface-border bg-surface-card p-4">
                <p className="font-semibold text-text-primary">{name}</p>
                <p className="mt-1 text-sm text-text-secondary">{body}</p>
              </div>
            ))}

            <div className="rounded-xl border border-monad-purple/30 bg-monad-purple/10 p-5">
              <h3 className="font-bold text-monad-purple-light">Reusable proof layer</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Voting and rewards both read the same on-chain HumanPass proof. Consumer apps do not need their own challenge system.
              </p>
              <Link href="/developers" className="mt-4 inline-flex text-sm font-semibold text-monad-cyan hover:text-monad-purple-light">
                See integration example →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
