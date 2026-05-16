"use client";

import { useState } from "react";
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
  className?: string;
};

function formatExpiry(validUntil: number): string {
  const remaining = validUntil - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Expired";
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${mins}m remaining`;
  return `${mins}m ${remaining % 60}s remaining`;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function HumanPassCard({
  status,
  txHash,
  validUntil,
  chainName,
  walletAddress,
  contractAddress,
  showActions = false,
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
      },
      null,
      2
    );
    navigator.clipboard.writeText(proof).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className={clsx(
        "card-base bg-card-shine animate-fade-in",
        status === "verified" && "border-emerald-500/30",
        className
      )}
    >
      {/* Header: badge + title */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {status === "verified" && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xl">
              ✓
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              {status === "verified" ? "Verified Human" : "HumanPass Proof"}
            </h3>
            {status === "verified" && (
              <p className="text-xs text-emerald-400 font-semibold">Active proof on-chain</p>
            )}
          </div>
        </div>
        <StatusBadge variant={status} />
      </div>

      {/* Proof fields */}
      <div className="space-y-3 text-sm">
        {walletAddress && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-text-muted">Wallet</span>
            <span className="font-mono text-text-primary">{truncateAddress(walletAddress)}</span>
          </div>
        )}

        {chainName && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-text-muted">Network</span>
            <span className="rounded-full bg-monad-purple/20 px-2 py-0.5 text-xs font-semibold text-monad-purple-light">
              {chainName}
            </span>
          </div>
        )}

        {contractAddress && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-text-muted">Contract</span>
            <span className="font-mono text-xs text-text-secondary">
              {truncateAddress(contractAddress)}
            </span>
          </div>
        )}

        {txHash && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-text-muted">Transaction</span>
            <a
              href={`${EXPLORER_URL}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-monad-cyan hover:text-monad-purple-light transition-colors"
            >
              {truncateHash(txHash)} ↗
            </a>
          </div>
        )}

        {validUntil && validUntil > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-text-muted">Expires</span>
            <span
              className={clsx(
                "font-semibold",
                status === "expired" ? "text-error" : "text-emerald-400"
              )}
            >
              {formatExpiry(validUntil)}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {status === "verified" && (
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-surface-secondary">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-monad-purple to-monad-cyan" />
        </div>
      )}

      {/* Action buttons */}
      {showActions && status === "verified" && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/status" className="btn-secondary text-xs px-3 py-2">
            View Status
          </Link>
          <Link href="/vote" className="btn-primary text-xs px-3 py-2">
            Go to Vote Demo
          </Link>
          <button
            onClick={handleCopy}
            className="btn-secondary text-xs px-3 py-2"
          >
            {copied ? "Copied!" : "Copy Proof"}
          </button>
        </div>
      )}
    </div>
  );
}
