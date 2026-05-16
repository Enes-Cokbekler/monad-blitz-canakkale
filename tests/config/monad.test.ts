import { describe, expect, it } from "vitest";

import { MONAD_TESTNET_RPC_URL, monadTestnet } from "../../lib/chains/monad";

describe("Monad Testnet chain config", () => {
  it("matches Monad Testnet network values", () => {
    expect(monadTestnet.id).toBe(10143);
    expect(monadTestnet.name).toBe("Monad Testnet");
    expect(monadTestnet.nativeCurrency).toEqual({
      name: "MON",
      symbol: "MON",
      decimals: 18,
    });
    expect(monadTestnet.rpcUrls.default.http).toEqual([MONAD_TESTNET_RPC_URL]);
    expect(monadTestnet.blockExplorers?.default.url).toBe(
      "https://testnet.monadexplorer.com"
    );
    expect(monadTestnet.testnet).toBe(true);
  });

  it("uses the public Monad Testnet RPC fallback", () => {
    expect(MONAD_TESTNET_RPC_URL).toBe(
      process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz"
    );
  });
});
