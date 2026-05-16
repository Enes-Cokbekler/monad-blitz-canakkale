import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("environment safety", () => {
  const examplePath = resolve(process.cwd(), ".env.example");
  const envPath = resolve(process.cwd(), "lib/env.ts");

  it(".env.example exists and contains no real secrets", () => {
    const content = readFileSync(examplePath, "utf-8");
    expect(content).toContain("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=");
    expect(content).toContain("NEXT_PUBLIC_MONAD_CHAIN_ID=10143");
    expect(content).toContain("NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz");
    expect(content).toContain("MONAD_RPC_URL=https://testnet-rpc.monad.xyz");
    expect(content).toContain("NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS=");
    expect(content).toContain("VERIFIER_PRIVATE_KEY=");
    expect(content).toContain("HUMANPASS_DEFAULT_DURATION_SECONDS=600");
    expect(content).toContain("HUMANPASS_MAX_DURATION_SECONDS=900");

    const hexPattern = /0x[a-fA-F0-9]{64}/;
    expect(content).not.toMatch(hexPattern);
  });

  it("VERIFIER_PRIVATE_KEY is not exposed via NEXT_PUBLIC_", () => {
    const content = readFileSync(examplePath, "utf-8");
    const lines = content.split("\n");
    const publicKeys = lines
      .filter((line) => line.startsWith("NEXT_PUBLIC_"))
      .map((line) => line.split("=")[0]);

    expect(publicKeys).not.toContain("NEXT_PUBLIC_VERIFIER_PRIVATE_KEY");
  });

  it("public env keys are non-secret", () => {
    const content = readFileSync(examplePath, "utf-8");
    const lines = content.split("\n");
    const publicKeys = lines
      .filter((line) => line.startsWith("NEXT_PUBLIC_"))
      .map((line) => line.split("=")[0]);

    const secretPatterns = ["PRIVATE_KEY", "SECRET", "PASSWORD", "API_KEY"];
    for (const key of publicKeys) {
      for (const pattern of secretPatterns) {
        expect(key).not.toContain(pattern);
      }
    }
  });

  it("lib/env.ts validates required server vars", () => {
    const content = readFileSync(envPath, "utf-8");
    expect(content).toContain("getServerEnv()");
    expect(content).toContain("VERIFIER_PRIVATE_KEY");
    expect(content).toContain("must only be called on the server");
  });

  it("lib/env.ts validates required client vars", () => {
    const content = readFileSync(envPath, "utf-8");
    expect(content).toContain("getClientEnv()");
    expect(content).toContain("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
  });
});
