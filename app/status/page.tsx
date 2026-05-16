"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { ErrorCallout } from "@/components/error-callout";
import { StatusBadge, type StatusBadgeVariant } from "@/components/status-badge";
import { WalletConnect } from "@/components/wallet-connect";
import { useDemoAccount } from "@/lib/e2e-wallet";

type ProofStatusResponse = {
  address: string;
  status: "verified" | "not_verified" | "expired";
  humanUntil: number;
  secondsRemaining: number;
  latestTxHash?: string;
  error?: string;
};

type WalletEvent = {
  type: "ISSUED" | "REVOKED";
  txHash: string;
  blockNumber: string;
  validUntil?: number;
};

type ActivityResponse = {
  events: WalletEvent[];
};

const EXPLORER_URL = "https://testnet.monadexplorer.com";

function formatCountdown(seconds: number) {
  if (seconds <= 0) return "Expired";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s remaining`;
}

function getStatusLabel(status: ProofStatusResponse["status"]) {
  if (status === "verified") return "Verified";
  if (status === "expired") return "Expired";
  return "Not Verified";
}

export default function StatusPage() {
  const { address } = useDemoAccount();
  const [lookupAddress, setLookupAddress] = useState("");
  const [status, setStatus] = useState<ProofStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletEvents, setWalletEvents] = useState<WalletEvent[]>([]);

  useEffect(() => {
    if (address && !lookupAddress) {
      setLookupAddress(address);
    }
  }, [address, lookupAddress]);

  const fetchStatus = useCallback(async (addressToLookup: string) => {
    const trimmedAddress = addressToLookup.trim();
    if (!trimmedAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const [statusRes, eventsRes] = await Promise.all([
        fetch(`/api/proof/status?address=${encodeURIComponent(trimmedAddress)}`),
        fetch(`/api/activity?address=${encodeURIComponent(trimmedAddress)}`),
      ]);

      const data = (await statusRes.json()) as ProofStatusResponse;

      if (!statusRes.ok) {
        setStatus(null);
        setError(data.error ?? "STATUS_LOOKUP_FAILED");
        return;
      }

      setStatus(data);

      if (eventsRes.ok) {
        const eventsData = (await eventsRes.json()) as ActivityResponse;
        setWalletEvents(eventsData.events ?? []);
      }
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "STATUS_LOOKUP_FAILED");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (address) {
      fetchStatus(address);
    }
  }, [address, fetchStatus]);

  useEffect(() => {
    if (!lookupAddress.trim()) return;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetchStatus(lookupAddress);
      }
    };

    const interval = setInterval(refresh, 10_000);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchStatus, lookupAddress]);

  const handleSubmit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    fetchStatus(lookupAddress);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Proof Status</h1>
            <p className="mt-1 text-text-secondary">
              Look up the current HumanPass proof status for any wallet.
            </p>
          </div>
          <WalletConnect />
        </div>

        <form onSubmit={handleSubmit} className="card-base bg-card-shine mb-6 space-y-4">
          <label className="block text-sm font-semibold text-text-primary" htmlFor="address">
            Wallet address
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="address"
              value={lookupAddress}
              onChange={(event) => setLookupAddress(event.target.value)}
              placeholder="0x..."
              className="min-w-0 flex-1 rounded-lg border border-surface-border bg-surface-secondary px-4 py-3 font-mono text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-monad-purple"
            />
            <button type="submit" disabled={isLoading} className="btn-primary disabled:opacity-60">
              {isLoading && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              )}
              {isLoading ? "Checking..." : "Check Status"}
            </button>
          </div>
        </form>

        {error && (
          <ErrorCallout
            title={error === "INVALID_ADDRESS" ? "Invalid Address" : "Status Lookup Failed"}
            message={
              error === "INVALID_ADDRESS"
                ? "Enter a valid EVM wallet address."
                : "HumanPass could not read this proof from Monad right now. The public RPC may be temporarily unavailable."
            }
            variant={error === "INVALID_ADDRESS" ? "warning" : "error"}
            className="mb-6"
          />
        )}

        {status && (
          <section className="card-base bg-card-shine space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-text-muted">Wallet</p>
                <p className="break-all font-mono text-sm text-text-primary">{status.address}</p>
              </div>
              <StatusBadge
                variant={status.status as StatusBadgeVariant}
                label={getStatusLabel(status.status)}
              />
            </div>

            {status.status === "verified" && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <p className="font-semibold text-emerald-400">
                  {formatCountdown(status.secondsRemaining)}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Proof expires at {new Date(status.humanUntil * 1000).toLocaleString()}.
                </p>
              </div>
            )}

            {status.status === "expired" && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <p className="font-semibold text-amber-400">Expired</p>
                <p className="mt-1 text-sm text-text-secondary">
                  This wallet had a proof, but it is no longer valid.
                </p>
                <Link href="/verify" className="btn-primary mt-4 inline-flex">
                  Re-verify →
                </Link>
              </div>
            )}

            {status.status === "not_verified" && (
              <p className="text-text-secondary">No active HumanPass proof was found.</p>
            )}

            {status.latestTxHash && (
              <a
                href={`${EXPLORER_URL}/tx/${status.latestTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-semibold text-monad-cyan hover:text-monad-purple-light"
              >
                View proof transaction →
              </a>
            )}
          </section>
        )}

        {walletEvents.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Recent On-Chain Activity</h2>
            <div className="space-y-2">
              {walletEvents.map((event) => (
                <div
                  key={`${event.txHash}-${event.blockNumber}`}
                  className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-secondary px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    {event.type === "ISSUED" ? (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                        Issued
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
                        Revoked
                      </span>
                    )}
                    <span className="text-xs text-text-muted">Block {event.blockNumber}</span>
                  </div>
                  <a
                    href={`${EXPLORER_URL}/tx/${event.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-monad-cyan hover:text-monad-purple-light"
                  >
                    {event.txHash.slice(0, 10)}…{event.txHash.slice(-6)}
                  </a>
                </div>
              ))}
            </div>
            <p className="mt-2 text-right text-xs text-text-muted">
              <Link href="/activity" className="text-monad-cyan hover:text-monad-purple-light">
                View all activity →
              </Link>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
