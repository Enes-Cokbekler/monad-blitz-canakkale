import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const privateKey = process.env.VERIFIER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "prague"
    }
  },
  networks: {
    monadTestnet: {
      url: process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: privateKey ? [privateKey] : []
    }
  }
};

export default config;
