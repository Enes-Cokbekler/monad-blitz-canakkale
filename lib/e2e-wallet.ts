"use client";

import { useEffect, useState } from "react";
import { useAccount, useSignMessage, useSignTypedData } from "wagmi";

import { monadTestnet } from "@/lib/wagmi/config";

const E2E_WALLET_KEY = "humanpass:e2e-wallet";

type MockWallet = {
  address: `0x${string}`;
};

function canUseMockWallet() {
  return process.env.NEXT_PUBLIC_E2E_MOCKS === "1" && typeof window !== "undefined";
}

function readMockWallet(): MockWallet | null {
  if (!canUseMockWallet()) return null;

  try {
    const raw = window.localStorage.getItem(E2E_WALLET_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<MockWallet>;
    if (typeof parsed.address === "string" && parsed.address.startsWith("0x")) {
      return { address: parsed.address as `0x${string}` };
    }
  } catch {}

  return null;
}

export function useDemoAccount() {
  const account = useAccount();
  const [mockWallet, setMockWallet] = useState<MockWallet | null>(null);

  useEffect(() => {
    setMockWallet(readMockWallet());
  }, []);

  if (mockWallet) {
    return {
      address: mockWallet.address,
      isConnected: true,
      chainId: monadTestnet.id,
    };
  }

  return account;
}

export function useDemoSignMessage() {
  const signer = useSignMessage();
  const [hasMockWallet, setHasMockWallet] = useState(false);

  useEffect(() => {
    setHasMockWallet(Boolean(readMockWallet()));
  }, []);

  if (hasMockWallet) {
    return {
      signMessageAsync: async () => `0x${"1".repeat(130)}` as `0x${string}`,
    };
  }

  return signer;
}

export function useDemoSignTypedData() {
  const signer = useSignTypedData();
  const [hasMockWallet, setHasMockWallet] = useState(false);

  useEffect(() => {
    setHasMockWallet(Boolean(readMockWallet()));
  }, []);

  if (hasMockWallet) {
    return {
      signTypedDataAsync: async () => `0x${"1".repeat(130)}` as `0x${string}`,
    };
  }

  return signer;
}
