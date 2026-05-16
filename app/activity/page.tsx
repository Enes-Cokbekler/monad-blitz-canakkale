"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { ErrorCallout } from "@/components/error-callout";

type SerializedEvent = {
  type: "ISSUED" | "REVOKED";
  user: string;
  validUntil?: number;
  txHash: string;
  blockNumber: string;
  logIndex: number;
};

type ActivityResponse = {
  events: SerializedEvent[];
  fromBlock: string;
  error?: string;
};

const EXPLORER_URL = "https://testnet.monadexplorer.com";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function formatValidUntil(ts: number) {
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;
  if (diff <= 0) return "Expired";
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}m ${s}s`;
}

function EventTypeBadge({ type }: { type: "ISSUED" | "REVOKED" }) {
  if (type === "ISSUED") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
        Issued
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
      Revoked
    </span>
  );
}

export default function ActivityPage() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchActivity = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/activity");
      const json = (await res.json()) as ActivityResponse;
      setData(json);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "ACTIVITY_FETCH_FAILED");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchActivity();
    }, 30_000);
    document.addEventListener("visibilitychange", fetchActivity);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", fetchActivity);
    };
  }, [fetchActivity]);

  const events = data?.events ?? [];
  const showContractError = data?.error === "CONTRACT_NOT_CONFIGURED";

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-monad-cyan/30 bg-monad-cyan/10 px-3 py-1 text-xs font-semibold text-monad-cyan">
              ON-CHAIN AUDIT TRAIL
            </div>
            <h1 className="text-3xl font-bold text-text-primary">Proof Activity</h1>
            <p className="mt-1 max-w-xl text-text-secondary">
              HumanPass proofs are emitted as on-chain events, so apps and users can audit
              verification activity without trusting the frontend.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchActivity}
            disabled={isLoading}
            className="btn-secondary shrink-0 disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" aria-hidden="true" />
                Loading…
              </span>
            ) : (
              "Refresh"
            )}
          </button>
        </div>

        {/* Auditability note */}
        <div className="mb-6 rounded-xl border border-monad-purple/30 bg-monad-purple/10 px-5 py-4 text-sm text-text-secondary">
          <span className="mr-2 font-semibold text-monad-purple-light">How it works:</span>
          Each proof issuance and revocation emits a{" "}
          <code className="text-monad-cyan">HumanProofIssued</code> or{" "}
          <code className="text-monad-cyan">HumanProofRevoked</code> event on Monad.
          Any app can read these events — no trust in this frontend required. Consumer apps
          can call{" "}
          <code className="text-monad-cyan">isHuman(address)</code> for current state or
          read event logs for full history.
        </div>

        {error && (
          <ErrorCallout
            title="Activity Unavailable"
            message="Could not fetch proof activity from the Monad RPC. The public endpoint may be temporarily rate-limited. Try refreshing."
            className="mb-6"
          />
        )}

        {showContractError && (
          <ErrorCallout
            title="Contract Not Configured"
            message="NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS is not set. Deploy the contract and configure the address."
            variant="warning"
            className="mb-6"
          />
        )}

        {/* Last refreshed */}
        {lastRefreshed && !error && (
          <p className="mb-3 text-xs text-text-muted">
            Last updated: {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 30s
          </p>
        )}

        {/* Events list */}
        {!isLoading && !error && events.length === 0 && !showContractError && (
          <div className="card-base bg-card-shine py-12 text-center">
            <p className="text-text-secondary">No on-chain proof events found in the recent block range.</p>
            <p className="mt-1 text-xs text-text-muted">
              Set <code>NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK</code> to scan from contract deployment.
            </p>
          </div>
        )}

        {events.length > 0 && (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={`${event.txHash}-${event.logIndex}`}
                className="card-base bg-card-shine flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <EventTypeBadge type={event.type} />
                  <div>
                    <p className="font-mono text-sm text-text-primary">
                      {shortAddress(event.user)}
                    </p>
                    {event.type === "ISSUED" && event.validUntil !== undefined && (
                      <p className="text-xs text-text-muted">
                        {formatValidUntil(event.validUntil)} ·{" "}
                        expires {new Date(event.validUntil * 1000).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
                  <span>Block {event.blockNumber}</span>
                  <a
                    href={`${EXPLORER_URL}/tx/${event.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-monad-cyan hover:text-monad-purple-light"
                  >
                    {shortHash(event.txHash)}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/status" className="btn-secondary">Check Status</Link>
          <Link href="/verify" className="btn-primary">Get Your HumanPass →</Link>
          <Link href="/developers" className="btn-secondary">Developer Docs</Link>
        </div>
      </div>
    </main>
  );
}
