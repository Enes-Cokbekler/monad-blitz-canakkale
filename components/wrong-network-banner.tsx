"use client";

import { monadTestnet } from "@/lib/wagmi/config";
import {
  switchErrorMessage,
  useMonadNetwork,
} from "@/hooks/use-monad-network";

type WrongNetworkBannerProps = {
  className?: string;
};

/**
 * Self-managing banner — renders nothing when on the correct network.
 * Drop on any page to surface wrong-network state with a Switch button.
 */
export function WrongNetworkBanner({ className }: WrongNetworkBannerProps) {
  const { isWrongNetwork, switchToMonad, isSwitching, switchError } =
    useMonadNetwork();

  if (!isWrongNetwork) return null;

  const errMsg = switchErrorMessage(switchError);

  return (
    <div
      role="alert"
      className={`rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-amber-400">Wrong Network</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            HumanPass requires {monadTestnet.name} (chain ID {monadTestnet.id}).
            Switch to continue.
          </p>
          {errMsg && (
            <p className="mt-1 text-sm text-red-400">{errMsg}</p>
          )}
        </div>
        <button
          onClick={switchToMonad}
          disabled={isSwitching}
          className="shrink-0 rounded-lg bg-monad-purple px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSwitching ? "Switching…" : `Switch to ${monadTestnet.name}`}
        </button>
      </div>
    </div>
  );
}
