import { monadTestnet } from "./chains/monad";

const serverEnvSchema = {
  VERIFIER_PRIVATE_KEY: process.env.VERIFIER_PRIVATE_KEY,
  MONAD_RPC_URL: process.env.MONAD_RPC_URL,
  HUMANPASS_DEFAULT_DURATION_SECONDS: process.env.HUMANPASS_DEFAULT_DURATION_SECONDS,
  HUMANPASS_MAX_DURATION_SECONDS: process.env.HUMANPASS_MAX_DURATION_SECONDS,
} as const;

const clientEnvSchema = {
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_MONAD_CHAIN_ID: process.env.NEXT_PUBLIC_MONAD_CHAIN_ID,
  NEXT_PUBLIC_MONAD_RPC_URL: process.env.NEXT_PUBLIC_MONAD_RPC_URL,
  NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS,
} as const;

function missingVars(vars: Record<string, string | undefined>, required: string[]): string[] {
  return required.filter((key) => !vars[key] || vars[key].trim() === "");
}

function throwIfMissing(
  vars: Record<string, string | undefined>,
  required: string[],
  context: string
): void {
  const missing = missingVars(vars, required);
  if (missing.length > 0) {
    throw new Error(
      `[${context}] Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must only be called on the server.");
  }

  throwIfMissing(serverEnvSchema, ["VERIFIER_PRIVATE_KEY"], "Server");

  const defaultDuration = parseInt(
    serverEnvSchema.HUMANPASS_DEFAULT_DURATION_SECONDS || "600",
    10
  );
  const maxDuration = parseInt(
    serverEnvSchema.HUMANPASS_MAX_DURATION_SECONDS || "900",
    10
  );

  return {
    verifierPrivateKey: serverEnvSchema.VERIFIER_PRIVATE_KEY as string,
    monadRpcUrl: serverEnvSchema.MONAD_RPC_URL || monadTestnet.rpcUrls.default.http[0],
    defaultDurationSeconds: defaultDuration,
    maxDurationSeconds: maxDuration,
  };
}

export function getClientEnv() {
  throwIfMissing(
    clientEnvSchema,
    [
      "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
      "NEXT_PUBLIC_MONAD_CHAIN_ID",
      "NEXT_PUBLIC_MONAD_RPC_URL",
      "NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS",
    ],
    "Client"
  );

  return {
    walletConnectProjectId: clientEnvSchema.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID as string,
    monadChainId: parseInt(clientEnvSchema.NEXT_PUBLIC_MONAD_CHAIN_ID as string, 10),
    monadRpcUrl: clientEnvSchema.NEXT_PUBLIC_MONAD_RPC_URL as string,
    humanPassContractAddress: clientEnvSchema.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS as string,
  };
}
