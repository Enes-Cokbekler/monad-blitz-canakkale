import { describe, expect, it } from "vitest";

import {
  detectWrongNetwork,
  MONAD_CHAIN_ID,
  switchErrorMessage,
} from "@/hooks/use-monad-network";

describe("MONAD_CHAIN_ID", () => {
  it("is 10143 (Monad Testnet)", () => {
    expect(MONAD_CHAIN_ID).toBe(10143);
  });
});

describe("detectWrongNetwork", () => {
  it("returns false when wallet is not connected", () => {
    expect(detectWrongNetwork(false, undefined)).toBe(false);
    expect(detectWrongNetwork(false, 1)).toBe(false);
  });

  it("returns false when connected to the correct chain", () => {
    expect(detectWrongNetwork(true, MONAD_CHAIN_ID)).toBe(false);
  });

  it("returns true when connected to a different chain", () => {
    expect(detectWrongNetwork(true, 1)).toBe(true);       // mainnet
    expect(detectWrongNetwork(true, 137)).toBe(true);     // polygon
    expect(detectWrongNetwork(true, 11155111)).toBe(true); // sepolia
  });

  it("returns false when chainId is undefined but connected", () => {
    expect(detectWrongNetwork(true, undefined)).toBe(false);
  });
});

describe("switchErrorMessage", () => {
  it("returns null for null error", () => {
    expect(switchErrorMessage(null)).toBeNull();
  });

  it("returns rejection message for user-rejected errors", () => {
    const msg = switchErrorMessage(new Error("User rejected the request. 4001"));
    expect(msg).toContain("rejected");
  });

  it("returns rejection message for 'user denied' variant", () => {
    const msg = switchErrorMessage(new Error("user denied transaction signature"));
    expect(msg).toContain("rejected");
  });

  it("returns not-supported message for unsupported switch", () => {
    const msg = switchErrorMessage(new Error("switch chain not supported by wallet"));
    expect(msg).toContain("does not support");
  });

  it("returns generic fallback for other errors", () => {
    const msg = switchErrorMessage(new Error("network error timeout"));
    expect(msg).toContain("Monad Testnet manually");
  });
});
