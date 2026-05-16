import { expect, test, type Page } from "@playwright/test";

const DEMO_WALLET = "0x1111111111111111111111111111111111111111";
const DEMO_TX = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HUMAN_UNTIL = Math.floor(Date.now() / 1000) + 600;
const HUMAN_UNTIL_HEX = `0x${HUMAN_UNTIL.toString(16).padStart(64, "0")}`;
const BOOL_TRUE = `0x${"0".repeat(63)}1`;
const BOOL_FALSE = `0x${"0".repeat(64)}`;

async function saveEvidence(page: Page, name: string) {
  await page.screenshot({ path: `.sisyphus/evidence/${name}.png`, fullPage: true });
}

async function connectMockWallet(page: Page) {
  await page.addInitScript((wallet) => {
    window.localStorage.setItem("humanpass:e2e-wallet", JSON.stringify({ address: wallet }));
  }, DEMO_WALLET);
}

async function installDemoMocks(page: Page) {
  const state = {
    verified: false,
    voted: false,
    results: { sdk: 0, votes: 0, events: 0 },
  };

  await page.route("**/api/e2e/rpc", async (route) => {
    const body = route.request().postDataJSON() as { method?: string; params?: unknown[]; id?: number };

    if (body.method === "eth_chainId") {
      await route.fulfill({ json: { jsonrpc: "2.0", id: body.id, result: "0x279f" } });
      return;
    }

    if (body.method === "eth_call") {
      const [call] = (body.params ?? []) as [{ data?: string }];
      const data = call?.data ?? "";
      const result = data.startsWith("0xf72c436f")
        ? state.verified
          ? BOOL_TRUE
          : BOOL_FALSE
        : data.startsWith("0xe3d3f381")
          ? state.verified
            ? HUMAN_UNTIL_HEX
            : `0x${"0".repeat(64)}`
          : "0x";

      await route.fulfill({ json: { jsonrpc: "2.0", id: body.id, result } });
      return;
    }

    await route.fulfill({ json: { jsonrpc: "2.0", id: body.id, result: "0x0" } });
  });

  await page.route("**/api/challenge/start", async (route) => {
    await route.fulfill({
      json: {
        challengeId: "demo-challenge",
        nonce: "demo-nonce",
        expiresAt: Date.now() + 120_000,
        numbers: [4, 2, 9, 1, 7],
        message: "HumanPass demo challenge",
      },
    });
  });

  await page.route("**/api/challenge/verify", async (route) => {
    state.verified = true;
    await route.fulfill({
      json: {
        status: "verified",
        txHash: DEMO_TX,
        validUntil: HUMAN_UNTIL,
        contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
      },
    });
  });

  await page.route("**/api/proof/status?**", async (route) => {
    await route.fulfill({
      json: {
        address: DEMO_WALLET,
        status: state.verified ? "verified" : "not_verified",
        humanUntil: state.verified ? HUMAN_UNTIL : 0,
        secondsRemaining: state.verified ? 600 : 0,
        latestTxHash: state.verified ? DEMO_TX : undefined,
      },
    });
  });

  await page.route("**/api/humans/live", async (route) => {
    await route.fulfill({
      json: {
        humans: state.verified
          ? [
              {
                address: "0x1111...1111",
                fullAddress: DEMO_WALLET,
                status: "verified",
                humanUntil: HUMAN_UNTIL,
                secondsRemaining: 600,
                txHash: DEMO_TX,
              },
            ]
          : [],
      },
    });
  });

  await page.route("**/api/vote/results", async (route) => {
    await route.fulfill({ json: { results: state.results } });
  });

  await page.route("**/api/vote", async (route) => {
    if (state.voted) {
      await route.fulfill({ status: 409, json: { error: "ALREADY_VOTED" } });
      return;
    }

    state.voted = true;
    state.results.votes += 1;
    await route.fulfill({ json: { vote: { address: DEMO_WALLET, optionId: "votes" }, results: state.results } });
  });
}

test.beforeEach(async ({ page }) => {
  await installDemoMocks(page);
});

test("landing page loads with nav and CTAs", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("navigation", { name: "Global navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "HumanPass" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Verify", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vote", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get your HumanPass", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Try protected voting/ })).toBeVisible();
  await saveEvidence(page, "landing");
});

test("vote page without wallet shows blocked state", async ({ page }) => {
  await page.goto("/vote");

  await expect(page.getByRole("heading", { name: "Protected Voting" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Connect Your Wallet" })).toBeVisible();
  await expect(page.getByText("You need to connect a Monad Testnet wallet")).toBeVisible();
});

test("full verified human voting demo flow", async ({ page }) => {
  test.slow();
  await connectMockWallet(page);

  await page.goto("/verify");
  await expect(page.getByRole("heading", { name: "HumanPass Verification" })).toBeVisible();
  await expect(page.getByTestId("wallet-connect").first()).toContainText("0x1111...1111");
  await saveEvidence(page, "verify-page");

  await page.getByRole("button", { name: "Start Challenge" }).click();
  for (const number of [4, 2, 9, 1, 7]) {
    await page.getByRole("button", { name: String(number) }).click();
  }
  await expect(page.getByText("Verification Successful")).toBeVisible();

  await page.goto("/status");
  await expect(page.getByRole("heading", { name: "Proof Status" })).toBeVisible();
  await expect(page.getByText("Verified").first()).toBeVisible();
  await expect(page.getByText(DEMO_WALLET)).toBeVisible();
  await saveEvidence(page, "status-page");

  await page.goto("/humans");
  await expect(page.getByRole("heading", { name: "Live Verified Humans" })).toBeVisible();
  await expect(page.getByRole("main").getByText("0x1111...1111")).toBeVisible();
  await saveEvidence(page, "humans-page");

  await page.goto("/vote");
  await expect(page.getByRole("heading", { name: "Protected Voting" })).toBeVisible();
  await expect(page.getByText("Verified").first()).toBeVisible();
  await saveEvidence(page, "vote-page");

  await page.getByRole("button", { name: /Protect consumer votes/ }).click();
  await expect(page.getByText("Vote Recorded")).toBeVisible();
  await expect(page.getByText("You have already voted")).toBeVisible();

  await page.evaluate(() => window.localStorage.removeItem("humanpass:e2e-wallet"));
});

test("voting twice shows Already voted", async ({ page }) => {
  test.slow();
  await connectMockWallet(page);

  await page.goto("/verify");
  await page.getByRole("button", { name: "Start Challenge" }).click();
  for (const number of [4, 2, 9, 1, 7]) {
    await page.getByRole("button", { name: String(number) }).click();
  }
  await expect(page.getByText("Verification Successful")).toBeVisible();

  await page.goto("/vote");
  await page.getByRole("button", { name: /Protect consumer votes/ }).click();
  await expect(page.getByText("Vote Recorded")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Protect consumer votes/ }).click();
  await expect(page.getByText("Already Voted")).toBeVisible();
});
