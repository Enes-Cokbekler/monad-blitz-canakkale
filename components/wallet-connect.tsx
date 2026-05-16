"use client";
/* eslint-disable @next/next/no-img-element */

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDemoAccount } from "@/lib/e2e-wallet";
import { monadTestnet } from "@/lib/wagmi/config";

export function WalletConnect() {
  const { address, isConnected, chainId } = useDemoAccount();
  const isWrongChain = isConnected && chainId !== monadTestnet.id;

  if (process.env.NEXT_PUBLIC_E2E_MOCKS === "1" && address) {
    return (
      <div data-testid="wallet-connect" className="inline-flex items-center gap-3">
        <span className="btn-secondary">Monad Testnet</span>
        <span className="btn-secondary font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>
    );
  }

  return (
    <div data-testid="wallet-connect">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const connected = mounted && account && chain;

          return (
            <div
              {...(!mounted && {
                "aria-hidden": true,
                style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button onClick={openConnectModal} className="btn-primary">
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      className="btn-primary !bg-error !shadow-glow-pink"
                    >
                      Wrong Network — Switch to Monad Testnet
                    </button>
                  );
                }

                return (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={openChainModal}
                      className="btn-secondary flex items-center gap-2"
                    >
                      {chain.hasIcon && (
                        <span className="h-5 w-5">
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? "Chain icon"}
                              src={chain.iconUrl}
                              className="h-5 w-5"
                            />
                          )}
                        </span>
                      )}
                      {chain.name}
                    </button>
                    <button
                      onClick={openAccountModal}
                      className="btn-secondary"
                    >
                      {account.displayName}
                      {account.displayBalance && (
                        <span className="ml-1.5 text-text-muted">
                          {account.displayBalance}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>

      {isWrongChain && (
        <div className="mt-3 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          You are connected to an unsupported network. HumanPass only works on{" "}
          <strong className="text-monad-cyan">
            {monadTestnet.name} (ID: {monadTestnet.id})
          </strong>
          . Please switch your network to continue.
        </div>
      )}
    </div>
  );
}
