"use client";

import { useSwitchChain } from "wagmi";

import { useDemoAccount } from "@/lib/e2e-wallet";
import { monadTestnet } from "@/lib/wagmi/config";

export const MONAD_CHAIN_ID = monadTestnet.id;

/** Pure helper — testable without hooks. */
export function detectWrongNetwork(
  isConnected: boolean,
  connectedChainId: number | undefined
): boolean {
  return isConnected && connectedChainId !== undefined && connectedChainId !== MONAD_CHAIN_ID;
}

/** Human-readable message for a useSwitchChain error. */
export function switchErrorMessage(error: Error | null): string | null {
  if (!error) return null;
  const msg = error.message.toLowerCase();
  if (msg.includes("rejected") || msg.includes("4001") || msg.includes("user denied")) {
    return "Switch rejected. Please switch manually in your wallet.";
  }
  if (msg.includes("not supported") || msg.includes("unsupported")) {
    return "This wallet does not support automatic network switching. Switch to Monad Testnet manually.";
  }
  return "Switch failed. Please switch to Monad Testnet manually in your wallet.";
}

export function useMonadNetwork() {
  const { isConnected, chainId: connectedChainId } = useDemoAccount();
  const {
    switchChain,
    isPending: isSwitching,
    error: switchError,
  } = useSwitchChain();

  const expectedChainId = MONAD_CHAIN_ID;
  const isWrongNetwork = detectWrongNetwork(isConnected ?? false, connectedChainId);
  const isCorrectNetwork = !isWrongNetwork;

  const switchToMonad = () => {
    switchChain({ chainId: MONAD_CHAIN_ID });
  };

  return {
    connectedChainId,
    expectedChainId,
    isConnected: isConnected ?? false,
    isCorrectNetwork,
    isWrongNetwork,
    switchToMonad,
    isSwitching,
    switchError: switchError as Error | null,
  };
}
