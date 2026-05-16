import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "on-first-retry"
  },
  outputDir: ".sisyphus/evidence/playwright-artifacts",
  webServer: {
    command: "NEXT_PUBLIC_E2E_MOCKS=1 NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678 NEXT_PUBLIC_MONAD_RPC_URL=http://127.0.0.1:3100/api/e2e/rpc npm run dev -- -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
