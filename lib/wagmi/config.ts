import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { MONAD_TESTNET_RPC_URL, monadTestnet } from "../chains/monad";

export { MONAD_TESTNET_RPC_URL, monadTestnet };

export function getConfig() {
  return createConfig({
    chains: [monadTestnet],
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
    transports: {
      [monadTestnet.id]: http(MONAD_TESTNET_RPC_URL),
    },
  });
}

export type Config = ReturnType<typeof getConfig>;
export type { State } from "wagmi";
