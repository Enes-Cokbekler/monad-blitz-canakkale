import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { MONAD_TESTNET_RPC_URL, monadTestnet } from "../chains/monad";

export { MONAD_TESTNET_RPC_URL, monadTestnet };

let _config: ReturnType<typeof createConfig> | null = null;

export function getConfig() {
  if (_config) return _config;
  _config = createConfig({
    chains: [monadTestnet],
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
    transports: {
      [monadTestnet.id]: http(MONAD_TESTNET_RPC_URL, { timeout: 10_000 }),
    },
  });
  return _config;
}

export type Config = ReturnType<typeof getConfig>;
export type { State } from "wagmi";
