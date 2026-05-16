"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { StatusBadge, type StatusBadgeVariant } from "./status-badge";

const EXPLORER_URL = "https://testnet.monadexplorer.com";

type HumanPassCardProps = {
  status: StatusBadgeVariant;
  txHash?: string;
  validUntil?: number;
  chainName?: string;
  walletAddress?: string;
  contractAddress?: string;
  showActions?: boolean;
  isDemo?: boolean;
  className?: string;
};

function formatExpiry(validUntil: number): string {
  const remaining = validUntil - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Expired";
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m ${secs}s remaining`;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function ExpiryCountdown({ validUntil }: { validUntil: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{formatExpiry(validUntil)}</span>;
}

export function HumanPassCard({
  status,
  txHash,
  validUntil,
  chainName,
  walletAddress,
  contractAddress,
  showActions = false,
  isDemo = false,
  className,
}: HumanPassCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const proof = JSON.stringify(
      {
        status,
        wallet: walletAddress,
        validUntil,
        txHash,
        contract: contractAddress,
        chain: chainName,
        issuedBy: "HumanPass",
        demo: isDemo || undefined,
      },
      null,
      2
    );
    navigator.clipboard.writeText(proof).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isExpired = validUntil ? validUntil < Math.floor(Date.now() / 1000) : false;

  return (
    <div
      className={clsx(
        "card-base animate-fade-in",
        status === "verified" && !isExpired
          ? "border-emerald-500/40 bg-gradient-to-br from-surface-card via-surface-card to-emerald-950/10"
          : "bg-card-shine",
        className
      )}
    >
      {/* Demo mode banner */}
      {isDemo && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400">
          Demo Mode — simulated transaction (Monad RPC unavailable)
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {status === "verified" && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-2xl shadow-sm ring-1 ring-emerald-500/30">
              ✓
            </div>
          )}
          {status === "expired" && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-2xl ring-1 ring-amber-500/30">
              ⏰
            </div>
          )}
          {status === "not_verified" && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-2xl ring-1 ring-surface-border">
              🔒
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              {status === "verified" ? "Verified Human" : status === "expired" ? "Proof Expired" : "HumanPass Proof"}
            </h3>
            <p className={clsx(
              "text-xs font-semibold",
              status === "verified" ? "text-emerald-400" :
              status === "expired" ? "text-amber-400" : "text-text-muted"
            )}>
              {status === "verified" ? "Active proof on-chain · Monad Testnet" :
               status === "expired" ? "Proof expired — re-verify to continue" :
               "No active proof found"}
            </p>
          </div>
        </div>
        <StatusBadge variant={status} />
      </div>

      {/* Proof fields */}
      <div className="space-y-2.5 text-sm">
        {walletAddress && (
          <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-secondary/50 px-3 py-2">
            <span className="text-text-muted">Wallet</span>
            <span className="font-mono text-text-primary">{truncateAddress(walletAddress)}</span>
          </div>
        )}

        {chainName && (
          <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-secondary/50 px-3 py-2">
            <span className="text-text-muted">Network</span>
            <span className="rounded-full bg-monad-purple/20 px-2.5 py-0.5 text-xs font-bold text-monad-purple-light">
              {chainName}
            </span>
          </div>
        )}

        {contractAddress && (
          <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-secondary/50 px-3 py-2">
            <span className="text-text-muted">Contract</span>
            <span className="font-mono text-xs text-text-secondary">
              {truncateAddress(contractAddress)}
            </span>
          </div>
        )}

        {txHash && !isDemo && (
          <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-secondary/50 px-3 py-2">
            <span className="text-text-muted">Transaction</span>
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-monad-cyan transition-colors hover:text-monad-purple-light"
            >
              {truncateHash(txHash)} ↗
            </a>
          </div>
        )}

        {validUntil && validUntil > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-secondary/50 px-3 py-2">
            <span className="text-text-muted">Expires</span>
            <span className={clsx(
              "font-semibold",
              isExpired || status === "expired" ? "text-error" : "text-emerald-400"
            )}>
              <ExpiryCountdown validUntil={validUntil} />
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {status === "verified" && !isExpired && (
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-monad-purple to-monad-cyan" />
        </div>
      )}

      {/* Action buttons */}
      {showActions && status === "verified" && !isExpired && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/status" className="btn-secondary text-xs px-3 py-2">
            View Status
          </Link>
          <Link href="/vote" className="btn-primary text-xs px-3 py-2">
            Vote Demo
          </Link>
          <button onClick={handleCopy} className="btn-secondary text-xs px-3 py-2">
            {copied ? "Copied!" : "Copy Proof"}
          </button>
          {txHash && !isDemo && (
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-xs px-3 py-2"
            >
              View on Explorer ↗
            </a>
          )}
        </div>
      )}

      {/* Expired CTA */}
      {(status === "expired" || isExpired) && (
        <div className="mt-5">
          <Link href="/verify" className="btn-primary w-full text-center text-sm">
            Re-verify to get new proof →
          </Link>
        </div>
      )}
    </div>
  );
}
