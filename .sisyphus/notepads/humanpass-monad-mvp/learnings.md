
## Env template and runbook - 2026-05-15

- `.env.example` contains only placeholders (empty values for secrets, defaults for public config). No private keys or funded addresses are committed.
- `.gitignore` explicitly allows `.env.example` while blocking `.env`, `.env.local`, and `.env.*.local`.
- `lib/env.ts` separates server-only (`getServerEnv`) and client-safe (`getClientEnv`) env access. Server helper throws if called in browser context. Both helpers throw with clear messages when required vars are missing.
- `README.md` covers setup, dev, testing, contract deployment, Monad Testnet values (chain ID 10143, public RPC), verifier wallet funding, in-memory limitation warning, and demo script summary.
- `tests/env/env.test.ts` verifies `.env.example` has no hex secrets, `VERIFIER_PRIVATE_KEY` is not `NEXT_PUBLIC_*`, and public keys contain no secret patterns.
- Pre-existing typechain-types eslint warnings cause `npm run lint` to fail at `--max-warnings=0`, but new files are clean.

## HumanPass Monad config/deploy - 2026-05-15

- Standalone Monad Testnet config now lives in `lib/chains/monad.ts` and mirrors the wagmi chain values: chain ID 10143, MON currency, env-driven public RPC fallback, Monad explorer, and `testnet: true`.
- Deployment script dry-runs with `DRY_RUN=true` or `--dry-run`, validates `VERIFIER_PRIVATE_KEY` format before broadcasting, and prints JSON with null deploy fields during dry-run.
- `scripts/export-abi.ts` reads the Hardhat artifact from disk instead of importing JSON so it works under `ts-node` without Node JSON import attributes.

## Challenge start API - 2026-05-15

- Challenge sessions live in `lib/server/challenge-store.ts` as single-process memory keyed by challenge ID plus lowercase wallet address for one-active-session enforcement.
- `POST /api/challenge/start` validates EVM address format and Monad Testnet chain ID `10143`, then returns a deterministic HumanPass signing message with server-generated numbers only.
- Vitest needed an explicit `@` alias in `vitest.config.ts` so API tests can import Next route modules and server code the same way production TypeScript does.

## Protected voting demo - 2026-05-15

- In-memory vote store in `lib/server/vote-store.ts` uses two Maps: one for per-wallet vote records (keyed by lowercase address) and one for option tallies. Options are `sdk`, `votes`, `events`.
- `lib/server/vote-check.ts` creates a viem `publicClient` scoped to the module and reads `isHuman` from the HumanPass contract. It gracefully returns `false` on RPC errors.
- `POST /api/vote` builds a deterministic vote message, recovers the signer address with `recoverMessageAddress`, validates chain ID `10143`, checks the 5-minute timestamp window, then calls `checkIsHuman`. It rejects with `INVALID_SIGNATURE`, `WRONG_CHAIN`, `EXPIRED_SIGNATURE`, `NOT_HUMAN`, or `ALREADY_VOTED`.
- `GET /api/vote/results` returns the current tallies.
- `app/vote/page.tsx` uses `useReadContract` for live proof status (`isHuman` + `getHumanUntil`), `useSignMessage` for the vote signature, and polls `/api/vote/results` every 3 seconds. It shows verify-first / expired-proof / already-voted / voting UI states.
- In vitest, `vi.mock("@/lib/server/vote-check")` works for mocking server-side blockchain reads in API route tests.
- `privateKeyToAccount` from `viem/accounts` returns an account object with an `account.signMessage({ message })` method — the top-level `signMessage` action from `viem` is not available as a standalone function in this setup.
- When creating test bodies with dynamic private keys, derive the address from the account object rather than defaulting to a hardcoded address, or the signature recovery will mismatch.

- Challenge verify API follows existing route style: parse JSON in POST, return `{ error }` via `NextResponse.json`, and keep challenge consumption/proof caching after successful contract receipt only.
- Vitest API route tests can call handlers directly with `Request` cast to `NextRequest`; verifier client is mocked while viem account signing verifies the real challenge message format.

## Verification page implementation - 2026-05-15

- `app/verify/page.tsx` implements the full verification flow as a client component with 8 phases: idle, starting, challenge, signing, verifying, success, error, and already-verified.
- Challenge flow: POST to `/api/challenge/start` → display 5 numbered buttons → user clicks in order → wrong click resets sequence and increments attempts (max 3) → correct sequence triggers wallet signature via `useSignMessage` → POST to `/api/challenge/verify` with `{ challengeId, address, chainId, signature, clickedNumbers }`.
- Timer countdown from challenge `expiresAt` (server-set, 120s TTL). When expired, shows "Challenge expired" with restart option.
- Used `signFnRef` pattern to avoid `useCallback` dependency cycle: `handleNumberClick` sets `readyToSign` state flag, which triggers `useEffect` calling `signFnRef.current()`.
- Reuses existing components: `WalletConnect`, `StatusBadge`, `HumanPassCard`, `ErrorCallout`.
- Uses `useReadContract` for `isHuman` and `getHumanUntil` to show proof status and expiry countdown.
- Already-verified state shows `HumanPassCard` with links to `/vote` and `/status`.
- Error handling covers: wrong chain, challenge expired, max attempts, wrong sequence, signature rejected, verifier not configured, and generic failures.
- Design follows existing dark futuristic theme: `card-base`, `btn-primary`, `btn-secondary`, `glow-text`, monad-purple/cyan colors, `animate-fade-in`.

## Proof status and live humans - 2026-05-15

- `GET /api/proof/status` validates EVM addresses, reads `getHumanUntil` and `isHuman` through a viem public client using `createHumanPassReadConfig`, normalizes to `verified`, `not_verified`, or `expired`, and includes `latestTxHash` from `proof-cache` when present.
- `GET /api/humans/live` is cache-only: it filters `getAllProofs()` against current wall-clock milliseconds, returns verified entries with truncated `address`, `fullAddress` for internal UI keys, `secondsRemaining`, and `txHash`.
- `app/status/page.tsx` and `app/humans/page.tsx` are client pages that poll every 10 seconds only while the document is visible and reuse `WalletConnect` plus `StatusBadge`.
- Vitest route tests can mock viem `createPublicClient` with `vi.hoisted` state before importing the route module; checksum addresses from `getAddress` should be expected in status responses.
- `npm run build` passes; it still prints existing optional dependency warnings for RainbowKit/Wagmi imports (`@react-native-async-storage/async-storage`, `pino-pretty`).

## Full demo flow integration - 2026-05-15

- Global navigation lives in `components/nav.tsx` and is rendered from `app/layout.tsx`; it includes `/`, `/verify`, `/status`, `/humans`, `/vote`, mobile hamburger behavior, active link styling, and `WalletConnect`.
- E2E wallet mocking is isolated behind `NEXT_PUBLIC_E2E_MOCKS=1` and localStorage key `humanpass:e2e-wallet` via `lib/e2e-wallet.ts`; normal Wagmi/RainbowKit behavior remains the default.
- Playwright runs on isolated port 3100 with mocked Monad RPC at `/api/e2e/rpc` and stores artifacts under `.sisyphus/evidence/playwright-artifacts`; named demo screenshots are saved as `.sisyphus/evidence/{landing,verify-page,status-page,humans-page,vote-page}.png`.
- Vitest should only include `tests/**`; Hardhat contract tests under `test/**` are covered by `npm run test:contracts` to avoid `HH5: HardhatContext is not created` under Vitest.
- `eslint.config.mjs` ignores generated `typechain-types/**`; lint now enforces zero warnings on source/tests without touching generated contract output.
- Verification results: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:contracts`, `npm run test:api`, `npm run test:e2e`, and `npm run build` all pass. Build/e2e still print existing optional RainbowKit/Wagmi warnings for `@react-native-async-storage/async-storage` and `pino-pretty`, but exit 0.

## F3 E2E QA Verification - 2026-05-15
- `npm run test:e2e` passed: 4/4 Chromium tests in 20.0s. Playwright started the Next dev server on port 3100 with e2e mock env vars.
- `tests/e2e/demo.spec.ts` covers landing, unauthenticated vote block, full verify/status/humans/vote demo flow, and duplicate-vote handling. External RPC/API behavior is mocked through Playwright routes.
- Required evidence screenshots exist and show real rendered pages: landing, verify-page, status-page, humans-page, vote-page.
- Observed repeated webServer warnings for optional wallet dependencies (`@react-native-async-storage/async-storage`, `pino-pretty`), but tests still exited 0.

## Final verification wave F1 hotfix - 2026-05-15
- `waitForTransactionReceipt` is available from `viem/actions` in viem 2.49.2, not from the top-level `viem` export in this repo, so the challenge verify route must import it from the actions subpath to build cleanly.
- Vitest module mocks for route tests that touch viem need `vi.hoisted` for shared stub functions; otherwise the hoisted mock factory can trip TDZ errors during import.
- `GET /api/proof/status` needs explicit tuple typing after `Promise.all` when the contract read is guarded by a try/catch, otherwise TypeScript can infer `unknown` for the destructured values.
- `npm run test:api` passed 32/32 and `npm run build` passed with only the existing optional dependency warnings for RainbowKit/Wagmi.
