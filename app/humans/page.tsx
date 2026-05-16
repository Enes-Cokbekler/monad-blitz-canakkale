"use client";

import { useCallback, useEffect, useState } from "react";

import { ErrorCallout } from "@/components/error-callout";
import { StatusBadge } from "@/components/status-badge";
import { WalletConnect } from "@/components/wallet-connect";
import { WrongNetworkBanner } from "@/components/wrong-network-banner";

type LiveHuman = {
  address: string;
  fullAddress: string;
  status: "verified";
  humanUntil: number;
  secondsRemaining: number;
  txHash?: string;
};

type LiveHumansResponse = {
  humans: LiveHuman[];
};

const EXPLORER_URL = "https://testnet.monadexplorer.com";

function formatCountdown(seconds: number) {
  if (seconds <= 0) return "Expired";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
}

export default function HumansPage() {
  const [humans, setHumans] = useState<LiveHuman[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHumans = useCallback(async () => {
    try {
      const response = await fetch("/api/humans/live");
      const data = (await response.json()) as LiveHumansResponse;

      if (!response.ok) {
        setError("LIVE_HUMANS_FAILED");
        return;
      }

      setHumans(data.humans);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "LIVE_HUMANS_FAILED");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHumans();

    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetchHumans();
      }
    };

    const interval = setInterval(refresh, 10_000);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchHumans]);

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Live Verified Humans</h1>
            <p className="mt-1 text-text-secondary">
              Recently verified wallets from this session&apos;s in-memory cache.{" "}
              <a href="/activity" className="text-monad-cyan hover:text-monad-purple-light">
                View on-chain event history →
              </a>
            </p>
          </div>
          <WalletConnect />
        </div>

        <WrongNetworkBanner className="mb-6" />

        {error && (
          <ErrorCallout
            title="Live Humans Unavailable"
            message="HumanPass could not load the live verified humans cache. Wait a moment and refresh this page."
            className="mb-6"
          />
        )}

        <section className="card-base bg-card-shine">
          {isLoading ? (
            <div className="flex items-center gap-3 text-text-secondary">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" aria-hidden="true" />
              <span>Loading verified humans...</span>
            </div>
          ) : humans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="text-4xl" aria-hidden="true">
                🧑‍🚀
              </span>
              <h2 className="text-xl font-semibold text-text-primary">
                No verified humans yet
              </h2>
              <p className="max-w-md text-text-secondary">
                Complete a HumanPass verification and this list will update automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {humans.map((human) => (
                <div
                  key={human.fullAddress}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-sm font-semibold text-text-primary">
                        {human.address}
                      </p>
                      <StatusBadge variant="verified" label="Verified" />
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      Expires in {formatCountdown(human.secondsRemaining)}
                    </p>
                  </div>

                  {human.txHash && (
                    <a
                      href={`${EXPLORER_URL}/tx/${human.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-monad-cyan hover:text-monad-purple-light"
                    >
                      Transaction →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
