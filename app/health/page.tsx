"use client";

import { useCallback, useEffect, useState } from "react";

import { WalletConnect } from "@/components/wallet-connect";
import { MONAD_CHAIN_ID, useMonadNetwork } from "@/hooks/use-monad-network";

type HealthResponse = {
  ok: boolean;
  chainId?: number;
  rpc: "ok" | "error" | "not_configured";
  contract: "ok" | "error" | "not_configured";
  verifier: {
    address?: string;
    balanceMON?: string;
    hasGas: boolean;
    error?: string;
  };
  config: {
    contractConfigured: boolean;
    deployBlockConfigured: boolean;
  };
};

function StatusDot({ ok }: { ok: boolean | null }) {
  if (ok === null)
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-text-muted" />;
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`}
    />
  );
}

function Row({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="flex items-center gap-2 text-text-muted">
        {ok !== undefined && <StatusDot ok={ok ?? null} />}
        {label}
      </span>
      <span
        className={`font-semibold ${ok === false ? "text-red-400" : ok === true ? "text-emerald-400" : "text-text-primary"}`}
      >
        {value}
      </span>
    </div>
  );
}

function statusLabel(s: "ok" | "error" | "not_configured") {
  return s === "ok" ? "OK" : s === "error" ? "Error" : "Not configured";
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setFetchError(false);
    try {
      const res = await fetch("/api/health");
      const data = (await res.json()) as HealthResponse;
      setHealth(data);
      setCheckedAt(new Date());
    } catch {
      setFetchError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const overallOk = health?.ok ?? null;
  const { connectedChainId, isConnected, isCorrectNetwork } = useMonadNetwork();

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">System Health</h1>
            <p className="mt-1 text-text-secondary">
              Operational status — RPC, contract, and verifier gas.
            </p>
          </div>
          <WalletConnect />
        </div>

        {/* Overall banner */}
        <div
          className={`mb-6 flex items-center gap-3 rounded-xl border px-5 py-4 ${
            isLoading
              ? "border-surface-border bg-surface-secondary"
              : overallOk === true
                ? "border-emerald-500/30 bg-emerald-500/10"
                : overallOk === false
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-amber-500/30 bg-amber-500/10"
          }`}
        >
          {isLoading ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" aria-hidden="true" />
              <span className="text-text-secondary">Checking system health…</span>
            </>
          ) : fetchError ? (
            <span className="font-semibold text-red-400">Could not reach /api/health</span>
          ) : (
            <>
              <StatusDot ok={overallOk} />
              <span
                className={`font-bold ${overallOk ? "text-emerald-400" : "text-red-400"}`}
              >
                {overallOk ? "All systems operational" : "One or more systems need attention"}
              </span>
            </>
          )}
        </div>

        {health && (
          <div className="card-base bg-card-shine space-y-5">
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Network
              </h2>
              <Row
                label="RPC"
                value={statusLabel(health.rpc)}
                ok={health.rpc === "ok" ? true : health.rpc === "not_configured" ? null : false}
              />
              {health.chainId !== undefined && (
                <Row label="RPC chain ID" value={String(health.chainId)} />
              )}
              <Row label="Expected chain ID" value={String(MONAD_CHAIN_ID)} />
              {isConnected && (
                <Row
                  label="Wallet chain ID"
                  value={connectedChainId !== undefined ? String(connectedChainId) : "Unknown"}
                  ok={isCorrectNetwork}
                />
              )}
              {isConnected && (
                <Row
                  label="Correct network"
                  value={isCorrectNetwork ? "Yes" : "No — wrong network"}
                  ok={isCorrectNetwork}
                />
              )}
            </section>

            <div className="border-t border-surface-border" />

            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Contract
              </h2>
              <Row
                label="HumanPass contract"
                value={statusLabel(health.contract)}
                ok={
                  health.contract === "ok"
                    ? true
                    : health.contract === "not_configured"
                      ? null
                      : false
                }
              />
              <Row
                label="Contract address set"
                value={health.config.contractConfigured ? "Yes" : "No"}
                ok={health.config.contractConfigured}
              />
              <Row
                label="Deploy block set"
                value={health.config.deployBlockConfigured ? "Yes" : "No"}
                ok={health.config.deployBlockConfigured ?? null}
              />
            </section>

            <div className="border-t border-surface-border" />

            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Verifier Wallet
              </h2>
              {health.verifier.error && (
                <p className="text-sm text-red-400">{health.verifier.error}</p>
              )}
              {health.verifier.address && (
                <Row label="Address" value={shortAddress(health.verifier.address)} />
              )}
              {health.verifier.balanceMON !== undefined && (
                <Row
                  label="Balance"
                  value={`${health.verifier.balanceMON} MON`}
                  ok={health.verifier.hasGas}
                />
              )}
              <Row
                label="Has gas"
                value={health.verifier.hasGas ? "Yes" : "No (top up needed)"}
                ok={health.verifier.hasGas}
              />
            </section>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-xs text-text-muted">
          {checkedAt && <span>Last checked: {checkedAt.toLocaleTimeString()}</span>}
          <button
            onClick={fetchHealth}
            disabled={isLoading}
            className="ml-auto rounded-lg border border-surface-border bg-surface-secondary px-3 py-1.5 font-semibold transition-colors hover:border-monad-purple hover:text-monad-purple-light disabled:opacity-50"
          >
            {isLoading ? "Checking…" : "Refresh"}
          </button>
        </div>
      </div>
    </main>
  );
}
