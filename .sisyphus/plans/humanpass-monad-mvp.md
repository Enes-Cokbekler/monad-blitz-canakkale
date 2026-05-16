# HumanPass on Monad Hackathon MVP

## TL;DR
> **Summary**: Build a greenfield HumanPass MVP: a Next.js app where users connect a wallet, complete a short challenge, receive a temporary on-chain human session proof on Monad Testnet, and use it to access a protected voting demo. The implementation stays demo-scoped but includes security-critical wallet binding, verifier-only proof issuance, expiry, and server-side vote gating.
> **Deliverables**:
> - Greenfield Next.js App Router frontend with landing, verify, status, live humans, and voting pages
> - Solidity `HumanPass` contract with verifier-only issuance, expiry, revocation, and max duration
> - Next.js API verifier using wallet signatures, nonce replay protection, in-memory challenge/vote state, and server-side viem transaction broadcasting
> - Tests-after coverage: contract tests, API route tests, Playwright demo flow, and final verification evidence
> - `.env.example`, deployment/runbook notes, and hackathon-safe product copy
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5 → Task 8 → Task 10 → Final Verification

## Context
### Original Request
- User asked to read `info.md` and collaboratively create a plan for the project.
- `info.md` defines HumanPass as a proof-of-human session layer on Monad for consumer apps that need lightweight verification before sensitive actions.

### Interview Summary
- Repo state: greenfield. Only `info.md` and `.sisyphus/` artifacts exist; no app scaffold, package manifest, contracts, tests, CI, or deployment config.
- Accepted decisions:
  - Voting storage: backend/mock in-memory for hackathon speed; HumanPass proof remains on-chain.
  - Gas model: backend verifier wallet sends proof issuance transaction.
  - Challenge state: in-memory, single-process demo only.
  - Testing: tests-after with contract tests, API tests, and Playwright QA.
  - Stack: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, wagmi, viem, RainbowKit, Solidity, Hardhat.
- Defaults applied for decision completeness:
  - Monad Testnet chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`.
  - Contract tooling: Hardhat with `evmVersion: "prague"`.
  - Proof default duration: `600` seconds; max duration: `900` seconds.
  - Challenge: click 5 displayed numbers in exact order within 30 seconds; challenge session expires after 2 minutes; max 3 failed attempts; one active challenge per wallet.
  - Voting: one vote per wallet; votes reset on server restart; vote submission requires a wallet-signed vote message and server-side `isHuman(address)` check.
  - Live humans list: backend issuance cache with truncated wallet addresses and expiry/status check.

### Metis Review (gaps addressed)
- Added explicit single-process/local demo deployment assumption; in-memory state is not serverless-safe.
- Added verifier gas failure states: pending, confirmed, failed, insufficient funds.
- Added proof duration and max duration.
- Added challenge attempt/expiry/replay policy.
- Added vote signature requirement to avoid trusting posted addresses.
- Added live humans list source and privacy truncation.
- Added guardrails against frontend-only security, overclaiming, persistent DB scope creep, biometrics, ZK, OAuth, multi-chain, and production Sybil-resistance claims.

## Work Objectives
### Core Objective
Deliver a credible hackathon MVP showing that a wallet can receive a short-lived on-chain HumanPass only after passing a backend-verified challenge, then use that proof to access a protected voting flow.

### Deliverables
- Scaffolded Next.js + Hardhat project.
- `HumanPass` Solidity contract deployed/configurable for Monad Testnet.
- Server verifier API with challenge lifecycle, signature validation, on-chain proof issuance, proof status, live humans list, and protected vote endpoint.
- Frontend pages:
  - Landing `/`
  - Verify `/verify`
  - Proof status `/status`
  - Demo voting `/vote`
  - Live humans `/humans`
- Automated and agent-executed verification evidence.

### Definition of Done (verifiable conditions with commands)
- `npm install` completes from a clean checkout.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test:contracts` passes.
- `npm run test:api` passes.
- `npm run test:e2e` passes against a local dev server and records screenshots/videos under `.sisyphus/evidence/`.
- `npm run build` passes.
- Demo flow works end-to-end on Monad Testnet when valid environment variables are supplied.

### Must Have
- Wallet connection.
- Wrong-chain handling for any chain other than Monad Testnet `10143`.
- Human challenge bound to wallet address, chain ID, challenge ID, nonce, and expiry.
- Backend verifier private key only in server environment variables.
- Verifier-only on-chain proof issuance.
- Automatic expiry behavior.
- Proof status page with tx hash and expiration.
- Protected vote endpoint that checks `isHuman(address)` server-side before accepting a signed vote.
- One vote per wallet.
- Clear product copy: lightweight temporary human session proof, not perfect bot detection.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Must not expose `VERIFIER_PRIVATE_KEY` or any private key to the client bundle.
- Must not let users call `issueHumanProof` directly from the UI.
- Must not issue proof for an arbitrary submitted address without verifying wallet signature.
- Must not rely on frontend-only vote gating.
- Must not add persistent DB, auth system, admin dashboard, ZK, biometrics, OAuth, World ID, Gitcoin Passport, device fingerprinting, account abstraction, multi-chain support, or SDK in this MVP.
- Must not claim production-grade Sybil resistance, permanent identity, or perfect human/AI detection.
- Must not store biometrics or personal identity data.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after using Hardhat contract tests, Vitest API tests, and Playwright browser QA.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 foundation scaffold; Task 2 contract; Task 6 UI/wallet shell can begin after scaffold paths exist.
Wave 2: Task 3 contract config/ABI; Task 4 challenge API; Task 7 landing/copy; Task 11 env/runbook.
Wave 3: Task 5 verifier issuance; Task 8 verification UI; Task 9 status/live humans; Task 10 voting API/UI.
Wave 4: Task 12 polish/integration QA and final demo hardening.

### Dependency Matrix (full, all tasks)
- Task 1: blocks all tasks.
- Task 2: blocked by Task 1; blocks Task 3, Task 5, Task 10.
- Task 3: blocked by Task 2; blocks Task 5, Task 8, Task 9, Task 10.
- Task 4: blocked by Task 1; blocks Task 5 and Task 8.
- Task 5: blocked by Tasks 2, 3, 4; blocks Task 8 and Task 9.
- Task 6: blocked by Task 1; blocks Tasks 7, 8, 9, 10.
- Task 7: blocked by Tasks 1, 6.
- Task 8: blocked by Tasks 3, 4, 5, 6.
- Task 9: blocked by Tasks 3, 5, 6.
- Task 10: blocked by Tasks 2, 3, 6; should integrate with Task 9 status patterns.
- Task 11: blocked by Task 1; should be updated after Tasks 2-5 define env keys.
- Task 12: blocked by Tasks 7-11.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → unspecified-high, deep, visual-engineering.
- Wave 2 → 4 tasks → deep, quick, visual-engineering, writing.
- Wave 3 → 4 tasks → deep, visual-engineering, unspecified-high.
- Wave 4 → 1 task → unspecified-high.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Scaffold the greenfield Next.js + Hardhat workspace

  **What to do**: Create the complete project foundation using npm: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.*` or supported Next ESLint config, Tailwind/PostCSS config, `app/` routes shell, `components/`, `lib/`, `contracts/`, `test/`, `tests/`, `scripts/`, and Playwright config. Define scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:api`, `test:contracts`, `test:e2e`, `compile:contracts`, `deploy:monad`. Install Next.js, React, TypeScript, Tailwind, shadcn/ui-compatible utilities, wagmi, viem, RainbowKit, TanStack Query, Hardhat, Hardhat toolbox, Vitest, and Playwright.
  **Must NOT do**: Do not add a database, auth provider, SDK package, monorepo complexity, or deployment-specific serverless assumptions.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: greenfield foundation touches all later work.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-ui-ux`] - UI polish starts after foundation.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: all tasks | Blocked By: none

  **References**:
  - Product scope: `info.md:117-131` - MVP features to scaffold for.
  - Suggested stack: `info.md:351-363` - Next.js, TypeScript, Tailwind, shadcn/ui, wagmi, viem, Solidity, Hardhat/Foundry.
  - Research: repository exploration found no `package.json`, app, contracts, tests, or CI; treat as greenfield.
  - External: `https://rainbowkit.com/docs/installation` - wallet UI provider setup.
  - External: `https://wagmi.sh/react/guides/ssr` - SSR-safe wagmi setup.
  - External: `https://docs.monad.xyz/guides/deploy-smart-contract/hardhat.md` - Hardhat on Monad.

  **Acceptance Criteria**:
  - [ ] `npm install` exits 0 from repo root.
  - [ ] `npm run typecheck` exits 0.
  - [ ] `npm run lint` exits 0.
  - [ ] `npm run build` exits 0 with placeholder pages.
  - [ ] `npm run test`, `npm run test:api`, `npm run test:contracts`, and `npm run test:e2e` exist in `package.json` even if later tasks fill coverage.

  **QA Scenarios**:
  ```
  Scenario: Clean scaffold validates
    Tool: Bash
    Steps: run `npm install && npm run typecheck && npm run lint && npm run build`
    Expected: all commands exit 0; `.next/` build completes; no missing script errors
    Evidence: .sisyphus/evidence/task-1-scaffold.txt

  Scenario: Test scripts are present before implementation
    Tool: Bash
    Steps: run `npm run test -- --run || true`, `npm run test:api -- --run || true`, `npm run test:contracts || true`, `npm run test:e2e -- --list`
    Expected: commands resolve to installed tools; failures, if any, are due to no tests yet, not missing dependencies/scripts
    Evidence: .sisyphus/evidence/task-1-test-scripts.txt
  ```

  **Commit**: YES | Message: `chore: scaffold humanpass monad app` | Files: [`package.json`, `package-lock.json`, config files, `app/`, `components/`, `lib/`, `contracts/`, `test/`, `tests/`, `scripts/`]

- [x] 2. Implement `HumanPass` Solidity contract with tests

  **What to do**: Create `contracts/HumanPass.sol` with `owner`, `verifier`, immutable or stored `maxDuration`, `mapping(address => uint256) public humanUntil`, events `HumanProofIssued`, `HumanProofRevoked`, `VerifierUpdated`, functions `setVerifier`, `issueHumanProof`, `isHuman`, `getHumanUntil`, and `revokeHumanProof`. Enforce: only verifier can issue/revoke; owner can update verifier; `user != address(0)`; `duration > 0`; `duration <= maxDuration`; proof expiry is `block.timestamp + duration`. Create Hardhat tests covering verifier-only issuance, non-verifier rejection, expiry, max duration rejection, zero address rejection, revocation, and verifier update.
  **Must NOT do**: Do not store challenge details or votes on-chain; do not add token/NFT mechanics; do not make proof permanent.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: contract security and tests are critical path.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 3, 5, 10 | Blocked By: Task 1

  **References**:
  - Contract requirements: `info.md:204-223` - required functions and state.
  - Example Solidity: `info.md:224-275` - baseline owner/verifier pattern.
  - Oracle guardrail: enforce verifier-only issuance and max duration.
  - External: `https://docs.monad.xyz/guides/deploy-smart-contract/hardhat.md` - Hardhat compiler target requires `evmVersion: "prague"` for Monad.

  **Acceptance Criteria**:
  - [ ] `npm run compile:contracts` exits 0.
  - [ ] `npm run test:contracts` exits 0.
  - [ ] Contract exposes exactly the MVP functions required by `info.md`: `issueHumanProof`, `isHuman`, `getHumanUntil`, `revokeHumanProof`, plus owner verifier management.
  - [ ] Tests prove `isHuman(user)` returns true before expiry and false after expiry.

  **QA Scenarios**:
  ```
  Scenario: Verifier issues temporary proof
    Tool: Bash
    Steps: run `npm run test:contracts -- --grep "issues temporary proof"`
    Expected: test passes; emitted `HumanProofIssued(user, validUntil)` has `validUntil > block.timestamp`
    Evidence: .sisyphus/evidence/task-2-contract-issue.txt

  Scenario: Unauthorized and invalid issuance rejected
    Tool: Bash
    Steps: run `npm run test:contracts -- --grep "rejects"`
    Expected: non-verifier, zero address, zero duration, and over-max duration cases revert with deterministic errors
    Evidence: .sisyphus/evidence/task-2-contract-rejections.txt
  ```

  **Commit**: YES | Message: `feat(contract): add temporary human proofs` | Files: [`contracts/HumanPass.sol`, `test/**/*.ts`, `hardhat.config.*`]

- [x] 3. Add Monad chain, contract config, ABI, and deployment scripts

  **What to do**: Add `lib/chains/monad.ts` with Monad Testnet config (`id: 10143`, native `MON`, RPC from env fallback `https://testnet-rpc.monad.xyz`). Add `lib/contracts/humanpass.ts` exporting ABI, address resolver, default duration `600`, max duration `900`. Add `scripts/deploy-humanpass.ts` deploying `HumanPass(verifier, 900)` and printing JSON `{ chainId, contractAddress, verifier, maxDuration, txHash }`. Add `scripts/export-abi.ts` or equivalent so frontend imports generated ABI from `artifacts/` or a checked-in `lib/contracts/HumanPass.abi.ts` after compile.
  **Must NOT do**: Do not hardcode private keys; do not hardcode a real contract address except via `NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS` or a local placeholder warning.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: bridges contract, deployment, and frontend configuration.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - No design work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 5, 8, 9, 10 | Blocked By: Task 2

  **References**:
  - Why Monad: `info.md:61-74` - real-time EVM-compatible consumer app rationale.
  - Research: Monad Testnet chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`.
  - External: `https://docs.monad.xyz/developer-essentials/testnets` - network values.
  - External: `https://docs.monad.xyz/developer-essentials/summary.md` - RPC/rate limit/finality guidance.

  **Acceptance Criteria**:
  - [ ] `npm run compile:contracts` emits ABI/artifacts.
  - [ ] `npm run deploy:monad -- --dry-run` or an implemented safe validation mode verifies env keys without broadcasting.
  - [ ] `lib/chains/monad.ts` exports chain ID `10143` and uses env-configurable RPC.
  - [ ] Missing `VERIFIER_PRIVATE_KEY` or `NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS` produces clear runtime error messages, not crashes.

  **QA Scenarios**:
  ```
  Scenario: Chain config matches Monad Testnet
    Tool: Bash
    Steps: run `npm run test -- --run tests/config/monad.test.ts`
    Expected: chain id is 10143, native currency is MON, default RPC is https://testnet-rpc.monad.xyz
    Evidence: .sisyphus/evidence/task-3-chain-config.txt

  Scenario: Deploy script validates missing env safely
    Tool: Bash
    Steps: run `env -u VERIFIER_PRIVATE_KEY npm run deploy:monad -- --dry-run`
    Expected: command exits non-zero with message `VERIFIER_PRIVATE_KEY is required` and no transaction is broadcast
    Evidence: .sisyphus/evidence/task-3-deploy-env-error.txt
  ```

  **Commit**: YES | Message: `feat(web3): configure monad humanpass contract` | Files: [`lib/chains/monad.ts`, `lib/contracts/**`, `scripts/**`, `hardhat.config.*`, tests]

- [x] 4. Implement challenge session API and in-memory store with tests

  **What to do**: Create server-only modules `lib/server/challenge-store.ts`, `lib/server/challenge-schema.ts`, and routes `app/api/challenge/start/route.ts`. `POST /api/challenge/start` accepts `{ address, chainId }`, validates EVM address and `chainId === 10143`, invalidates prior active challenge for that wallet, creates `{ challengeId, nonce, numbers: five unique digits 1-9, expiresAt: now+120s, attempts: 0, consumed: false }`, and returns a deterministic signable message containing app name, wallet, chainId, challengeId, nonce, numbers, and expiresAt. Add Vitest tests for valid start, wrong chain, invalid address, one-active-challenge replacement, expiry calculation, and no private data leak.
  **Must NOT do**: Do not issue proof in this route; do not accept user-provided numbers; do not store private keys here.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: security-sensitive nonce/replay foundation.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - API only.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 5, 8 | Blocked By: Task 1

  **References**:
  - User flow: `info.md:134-164` - connect, start verification, complete challenge, issue proof.
  - Challenge idea: `info.md:389-400` - show 5 random numbers and click in correct order.
  - Metis guardrail: bind challenge to wallet, nonce, chain ID, expiry; one active challenge per wallet.

  **Acceptance Criteria**:
  - [ ] `npm run test:api -- --run tests/api/challenge-start.test.ts` exits 0.
  - [ ] Valid response shape includes `challengeId`, `nonce`, `expiresAt`, `numbers`, `message`.
  - [ ] Wrong chain returns HTTP 400 with stable error code `WRONG_CHAIN`.
  - [ ] Challenge expiry is 120 seconds from creation time.

  **QA Scenarios**:
  ```
  Scenario: Start challenge happy path
    Tool: Bash
    Steps: run API test or curl `POST /api/challenge/start` with address `0x1111111111111111111111111111111111111111` and chainId `10143`
    Expected: HTTP 200; five numbers returned; message includes wallet, chainId, challengeId, nonce, and expiresAt
    Evidence: .sisyphus/evidence/task-4-start-challenge.json

  Scenario: Wrong chain rejected
    Tool: Bash
    Steps: call `POST /api/challenge/start` with chainId `1`
    Expected: HTTP 400; JSON `{ "error": "WRONG_CHAIN" }`; no challenge stored
    Evidence: .sisyphus/evidence/task-4-wrong-chain.json
  ```

  **Commit**: YES | Message: `feat(api): add wallet-bound challenge sessions` | Files: [`app/api/challenge/start/route.ts`, `lib/server/challenge-*`, `tests/api/**`]

- [x] 5. Implement verifier issuance API with viem, replay protection, and tests

  **What to do**: Create `app/api/challenge/verify/route.ts`, `lib/server/verifier-client.ts`, and tests. `POST /api/challenge/verify` accepts `{ challengeId, address, chainId, signature, clickedNumbers }`. It must load the active challenge, reject if missing/expired/consumed/wrong chain/wrong address/attempts >= 3/wrong number order/invalid signature. Signature verification must recover the signer from the exact message produced by Task 4. On success, mark challenge consumed, use server-only viem wallet client from `VERIFIER_PRIVATE_KEY`, simulate `issueHumanProof(address, 600)`, broadcast, wait for receipt, cache `{ address, humanUntil, txHash }` for live list/status, and return `{ status: "verified", txHash, validUntil, contractAddress }`. Add deterministic error codes: `CHALLENGE_NOT_FOUND`, `CHALLENGE_EXPIRED`, `CHALLENGE_CONSUMED`, `WRONG_CHAIN`, `INVALID_SIGNATURE`, `WRONG_SEQUENCE`, `MAX_ATTEMPTS`, `VERIFIER_NOT_CONFIGURED`, `VERIFIER_INSUFFICIENT_FUNDS`, `TX_FAILED`.
  **Must NOT do**: Do not expose private key; do not issue proof before signature and clicked sequence validation; do not skip `simulateContract`/receipt wait.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: most security-critical backend path.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - API only.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Tasks 8, 9 | Blocked By: Tasks 2, 3, 4

  **References**:
  - Backend flow: `info.md:376-388` - backend generates challenge, validates answer, calls contract as verifier.
  - Oracle guardrail: wallet signature binding and verifier-only issuance.
  - External: `https://rainbowkit.com/docs/authentication` - SIWE-style signature/nonce pattern.
  - External: `https://viem.sh/docs/clients/wallet` - server wallet client pattern.
  - External: `https://viem.sh/docs/contract/simulateContract` - simulate before write.

  **Acceptance Criteria**:
  - [ ] `npm run test:api -- --run tests/api/challenge-verify.test.ts` exits 0.
  - [ ] Valid challenge + valid signature + correct clicked order calls `issueHumanProof(address, 600)` exactly once in mocked viem tests.
  - [ ] Reusing the same challenge returns `CHALLENGE_CONSUMED` and does not call contract again.
  - [ ] Invalid signature, expired challenge, wrong sequence, wrong chain, and missing verifier env are tested.

  **QA Scenarios**:
  ```
  Scenario: Verified challenge issues proof
    Tool: Bash
    Steps: run `npm run test:api -- --run tests/api/challenge-verify.test.ts -t "issues proof"`
    Expected: HTTP 200 equivalent; response includes `status=verified`, tx hash, validUntil; mocked contract call receives duration 600
    Evidence: .sisyphus/evidence/task-5-verify-issue.txt

  Scenario: Replay and invalid signature blocked
    Tool: Bash
    Steps: run `npm run test:api -- --run tests/api/challenge-verify.test.ts -t "rejects"`
    Expected: consumed nonce, invalid signature, wrong sequence, and expired challenge all return stable error codes and no contract write
    Evidence: .sisyphus/evidence/task-5-verify-rejections.txt
  ```

  **Commit**: YES | Message: `feat(api): issue human proofs from verifier` | Files: [`app/api/challenge/verify/route.ts`, `lib/server/verifier-client.ts`, tests]

- [x] 6. Build wallet provider shell and reusable UI components

  **What to do**: Create app-wide providers using RainbowKit, wagmi, viem, and TanStack Query with SSR-safe configuration. Files: `app/providers.tsx`, `app/layout.tsx`, `lib/wagmi/config.ts`, `components/wallet-connect.tsx`, `components/status-badge.tsx`, `components/humanpass-card.tsx`, `components/error-callout.tsx`, and shared Tailwind/shadcn-compatible primitives. Configure Monad Testnet as the only supported chain. Add visible wrong-chain state and CTA to switch/add Monad Testnet. Establish visual style: dark futuristic Monad-inspired gradient, high-contrast cards, clear proof status badges.
  **Must NOT do**: Do not add unrelated animations that slow demo; do not support multiple chains; do not hide wallet/network errors.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: user-facing wallet shell and design system.
  - Skills: [`frontend-ui-ux`] - UI/UX craft and component polish.
  - Omitted: [`git-master`] - No git operation requested inside task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 7, 8, 9, 10 | Blocked By: Task 1

  **References**:
  - Frontend pages/components: `info.md:276-350` - landing, verification, status, voting pages.
  - External: `https://rainbowkit.com/docs/installation` - provider setup.
  - External: `https://wagmi.sh/react/guides/ssr` - SSR setup.
  - External: `https://wagmi.sh/core/api/utilities/cookieToInitialState` - cookie hydration.

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` passes with provider shell.
  - [ ] `npm run build` passes without hydration mismatch warnings in logs.
  - [ ] UI exposes wallet connect and wrong-chain states on placeholder pages.
  - [ ] Monad Testnet chain ID `10143` is the only configured app chain.

  **QA Scenarios**:
  ```
  Scenario: Wallet shell renders
    Tool: Playwright
    Steps: start dev server, open `/`, inspect for `[data-testid="wallet-connect"]`
    Expected: wallet connect CTA visible; no runtime console errors
    Evidence: .sisyphus/evidence/task-6-wallet-shell.png

  Scenario: Wrong chain copy exists
    Tool: Bash
    Steps: run component/unit test for network state copy
    Expected: unsupported chain state renders `Switch to Monad Testnet`
    Evidence: .sisyphus/evidence/task-6-wrong-chain.txt
  ```

  **Commit**: YES | Message: `feat(ui): add wallet provider shell` | Files: [`app/providers.tsx`, `app/layout.tsx`, `lib/wagmi/**`, `components/**`, styles]

- [x] 7. Implement landing page with hackathon-safe product copy

  **What to do**: Implement `app/page.tsx` with sections: hero, problem, how it works, use cases, privacy positioning, demo CTA, and integration teaser. Use exact positioning: “lightweight human session proof” and “wallet passed a recent challenge”, not permanent identity. CTAs: `Get your HumanPass` → `/verify`, `Try protected voting` → `/vote`, `Check proof status` → `/status`. Add visual flow: Connect wallet → Complete challenge → Proof issued on Monad → Protected app checks proof.
  **Must NOT do**: Do not claim perfect bot detection, production Sybil resistance, biometrics, KYC, or permanent identity.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: landing page must be demo-polished.
  - Skills: [`frontend-ui-ux`] - Needed for persuasive UI hierarchy.
  - Omitted: [] - None.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 12 | Blocked By: Tasks 1, 6

  **References**:
  - Landing sections/copy: `info.md:276-297`.
  - Privacy positioning: `info.md:411-437`.
  - Pitch copy: `info.md:439-450`.
  - Success criteria: `info.md:520-529`.

  **Acceptance Criteria**:
  - [ ] `npm run build` passes.
  - [ ] Landing page contains the sentence “HumanPass is a proof-of-human session layer for consumer apps on Monad.”
  - [ ] Landing page does not contain forbidden phrases: `perfectly detect`, `permanent identity`, `biometric`, `KYC`, `Sybil-proof`.
  - [ ] CTAs link to `/verify`, `/vote`, and `/status`.

  **QA Scenarios**:
  ```
  Scenario: Landing explains product quickly
    Tool: Playwright
    Steps: open `/`, capture hero and CTA area
    Expected: headline, subheadline, and `Get your HumanPass` CTA visible above fold
    Evidence: .sisyphus/evidence/task-7-landing.png

  Scenario: Copy guardrails enforced
    Tool: Bash
    Steps: run `npm run test -- --run tests/copy/landing-copy.test.ts`
    Expected: required positioning copy exists and forbidden overclaim phrases are absent
    Evidence: .sisyphus/evidence/task-7-copy-guardrails.txt
  ```

  **Commit**: YES | Message: `feat(ui): add humanpass landing page` | Files: [`app/page.tsx`, `components/**`, tests]

- [x] 8. Implement verification page end-to-end with challenge UI

  **What to do**: Implement `app/verify/page.tsx` and supporting components. Flow: connect wallet → show current proof status → start challenge → display five numbers → user clicks buttons in exact order within 30 seconds → sign exact challenge message via wallet → submit to `/api/challenge/verify` → show pending tx → show success with tx hash, expiration, status link, vote link. Handle failures: wrong chain, wallet changed mid-challenge, challenge expired, wrong order, signature rejection, verifier not configured, insufficient funds, transaction failed.
  **Must NOT do**: Do not let UI call `issueHumanProof` directly; do not mark verified until API returns confirmed tx hash and validUntil.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: core demo UX.
  - Skills: [`frontend-ui-ux`] - Needs polished interaction states.
  - Omitted: [] - None.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Task 12 | Blocked By: Tasks 3, 4, 5, 6

  **References**:
  - Verification page components: `info.md:298-314`.
  - Challenge idea: `info.md:389-400`.
  - Backend verification flow: `info.md:376-388`.
  - Metis edge cases: wallet changes mid-challenge, challenge expiry, verifier tx failure.

  **Acceptance Criteria**:
  - [ ] `npm run test:e2e -- --grep "verification"` passes with mocked wallet/API where needed.
  - [ ] Wrong click order shows deterministic error and increments attempt count.
  - [ ] Successful verification displays tx hash, expiration timestamp, and links to `/status` and `/vote`.
  - [ ] UI never displays verified state before API confirmation.

  **QA Scenarios**:
  ```
  Scenario: Complete verification happy path
    Tool: Playwright
    Steps: open `/verify`, connect mocked wallet, click `Start Challenge`, click numbers in displayed order, approve signature, wait for API success
    Expected: success card says `Human proof active`, tx hash visible, expiration visible, `Go to voting demo` link visible
    Evidence: .sisyphus/evidence/task-8-verify-happy.png

  Scenario: Wrong sequence failure
    Tool: Playwright
    Steps: start challenge, click the second displayed number before the first
    Expected: error `Wrong order. Try again.` appears; no signature prompt; no verify API call
    Evidence: .sisyphus/evidence/task-8-verify-wrong-order.png
  ```

  **Commit**: YES | Message: `feat(ui): add human verification flow` | Files: [`app/verify/**`, components, Playwright tests]

- [x] 9. Implement proof status page and live verified humans list

  **What to do**: Create `app/api/proof/status/route.ts`, `app/api/humans/live/route.ts`, `app/status/page.tsx`, and `app/humans/page.tsx`. Status API accepts `address` query, validates address, reads contract `getHumanUntil`/`isHuman`, and returns `{ address, status: "verified" | "not_verified" | "expired", humanUntil, secondsRemaining, latestTxHash? }`. Live humans API returns cached issued proofs filtered/marked by current expiry and truncates addresses in UI. Status page supports connected wallet default and manual address lookup. Humans page auto-refreshes every 10 seconds while visible.
  **Must NOT do**: Do not expose full internal challenge state; do not imply live list is a global identity registry; do not show private data beyond wallet and proof metadata.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: combines API, contract reads, and UI.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - Use existing UI system; limited new design.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 12 | Blocked By: Tasks 3, 5, 6

  **References**:
  - Public proof status page: `info.md:315-331`.
  - Live verified humans feature: `info.md:127-129` and `info.md:552-557`.
  - Privacy positioning: `info.md:411-423` - only wallet, expiration timestamp, transaction data.

  **Acceptance Criteria**:
  - [ ] `npm run test:api -- --run tests/api/proof-status.test.ts tests/api/live-humans.test.ts` exits 0.
  - [ ] `/status` displays Verified Human, Not Verified, and Expired states in tests.
  - [ ] `/humans` displays truncated addresses like `0x1234...abcd` and expiration countdown.
  - [ ] Expired entries are marked expired or removed according to API response; never shown as active.

  **QA Scenarios**:
  ```
  Scenario: Status page shows active proof
    Tool: Playwright
    Steps: mock status API as verified, open `/status?address=0x1111111111111111111111111111111111111111`
    Expected: `Verified Human` badge, expiration time, and tx hash visible
    Evidence: .sisyphus/evidence/task-9-status-verified.png

  Scenario: Live humans respects expiry
    Tool: Bash
    Steps: run `npm run test:api -- --run tests/api/live-humans.test.ts -t "filters expired"`
    Expected: expired proof is not returned as active; truncated display value is generated
    Evidence: .sisyphus/evidence/task-9-live-expiry.txt
  ```

  **Commit**: YES | Message: `feat(app): add proof status and live humans` | Files: [`app/status/**`, `app/humans/**`, `app/api/proof/**`, `app/api/humans/**`, tests]

- [x] 10. Implement protected voting demo with server-side proof check

  **What to do**: Create `app/api/vote/route.ts`, `app/api/vote/results/route.ts`, `lib/server/vote-store.ts`, and `app/vote/page.tsx`. Options: `Ship HumanPass SDK`, `Protect consumer votes`, `Event check-in badges`. Vote flow: wallet connects; page checks proof status; unverified user sees verify-first modal/link; verified user signs vote message containing address, optionId, nonce, chainId, and timestamp; server verifies signature, rejects duplicate wallet, calls contract `isHuman(address)` server-side, then stores vote in memory and returns updated tallies. Results endpoint returns live in-memory totals. Expired proof must be rejected even if frontend thinks verified.
  **Must NOT do**: Do not trust client-submitted address without signature recovery; do not accept vote based only on frontend state; do not put voting on-chain in this MVP.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: full-stack protected demo and security checks.
  - Skills: [] - No extra skill required.
  - Omitted: [`frontend-ui-ux`] - Use existing UI system; no new design language.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Task 12 | Blocked By: Tasks 2, 3, 6

  **References**:
  - Demo voting app concept: `info.md:186-202`.
  - Voting page rules: `info.md:332-350`.
  - Oracle guardrail: `/api/vote` must re-check `isHuman(address)` server-side.

  **Acceptance Criteria**:
  - [ ] `npm run test:api -- --run tests/api/vote.test.ts` exits 0.
  - [ ] Unverified or expired wallet vote returns `NOT_HUMAN`.
  - [ ] Duplicate wallet vote returns `ALREADY_VOTED`.
  - [ ] Invalid vote signature returns `INVALID_SIGNATURE`.
  - [ ] Verified signed vote updates tally exactly once.
  - [ ] `npm run test:e2e -- --grep "voting"` passes.

  **QA Scenarios**:
  ```
  Scenario: Unverified wallet blocked from voting
    Tool: Playwright
    Steps: open `/vote` with mocked connected wallet and proof status `not_verified`, click vote option
    Expected: verify-first modal appears; no vote API success; CTA links to `/verify`
    Evidence: .sisyphus/evidence/task-10-vote-blocked.png

  Scenario: Verified wallet votes once
    Tool: Playwright
    Steps: mock verified proof, select `Protect consumer votes`, sign vote message, submit vote, submit same vote again
    Expected: first submission updates tally by 1; second shows `Already voted`; results remain unchanged
    Evidence: .sisyphus/evidence/task-10-vote-once.png
  ```

  **Commit**: YES | Message: `feat(app): add protected voting demo` | Files: [`app/vote/**`, `app/api/vote/**`, `lib/server/vote-store.ts`, tests]

- [x] 11. Add environment template, local runbook, and deployment guardrails

  **What to do**: Create `.env.example` with placeholders only: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_MONAD_CHAIN_ID=10143`, `NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz`, `MONAD_RPC_URL=https://testnet-rpc.monad.xyz`, `NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS=`, `VERIFIER_PRIVATE_KEY=`, `HUMANPASS_DEFAULT_DURATION_SECONDS=600`, `HUMANPASS_MAX_DURATION_SECONDS=900`. Add `.gitignore` rules for `.env*` except `.env.example`. Create root `README.md` with setup, test commands, Monad Testnet values, contract deployment, verifier funding, single-process in-memory limitation, and demo script. Add env validation helper `lib/env.ts` with server/client-safe separation.
  **Must NOT do**: Do not include real private keys, funded wallet addresses unless user provides public demo address intentionally, or production deployment claims.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: runbook and guardrails need clarity.
  - Skills: [] - No extra skill required.
  - Omitted: [] - None.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 12 | Blocked By: Task 1

  **References**:
  - Hackathon demo script: `info.md:452-464`.
  - What to build first: `info.md:530-543`.
  - Research: Monad Testnet `10143`; backend verifier wallet pays gas; public RPC may be rate-limited.
  - Metis risk: in-memory state is single-process only and not serverless-safe.

  **Acceptance Criteria**:
  - [ ] `.env.example` exists and contains no real secret-looking values.
  - [ ] `.gitignore` prevents `.env` and `.env.local` from being committed.
  - [ ] `npm run test -- --run tests/env/env.test.ts` verifies server secrets are not exposed via `NEXT_PUBLIC_*`.
  - [ ] Runbook documents verifier wallet funding failure and local-only in-memory limitation.

  **QA Scenarios**:
  ```
  Scenario: Env template is safe
    Tool: Bash
    Steps: run `npm run test -- --run tests/env/env.test.ts`
    Expected: no private key literal present; `VERIFIER_PRIVATE_KEY` is server-only; public env keys are non-secret
    Evidence: .sisyphus/evidence/task-11-env-safe.txt

  Scenario: Runbook includes demo commands
    Tool: Bash
    Steps: run documentation/copy test for README required sections
    Expected: README includes setup, deploy, test, demo script, single-process warning, and Monad Testnet values
    Evidence: .sisyphus/evidence/task-11-runbook.txt
  ```

  **Commit**: YES | Message: `docs: add humanpass setup runbook` | Files: [`.env.example`, `.gitignore`, `README.md`, `lib/env.ts`, tests]

- [x] 12. Integrate full demo flow, polish states, and record evidence

  **What to do**: Connect all pages and APIs into one polished demo. Add global nav, loading states, error states, empty states, tx pending state, tx failed state, verifier insufficient funds message, RPC unavailable message, and expiration countdown behavior. Ensure the demo script can be executed: open landing → try vote unverified → verify → see status/live list → return vote → vote succeeds → duplicate vote blocked. Add Playwright e2e specs for full mocked flow and, if env is configured, an optional real Monad Testnet smoke flow tagged separately so CI/local tests do not require private keys.
  **Must NOT do**: Do not broaden scope with SDK, database, admin dashboard, biometrics, or on-chain voting.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-cutting integration and QA hardening.
  - Skills: [`playwright`] - Browser evidence required.
  - Omitted: [`frontend-ui-ux`] - Polish uses existing design system; focus is integration reliability.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification | Blocked By: Tasks 7, 8, 9, 10, 11

  **References**:
  - Demo script: `info.md:452-464`.
  - Success criteria: `info.md:520-529`.
  - Must-have checklist: `info.md:544-557`.
  - Metis edge cases: wrong chain, wallet changes, challenge expiry, backend restart, tx failure, RPC unavailable, missing contract address.

  **Acceptance Criteria**:
  - [ ] `npm run lint` passes.
  - [ ] `npm run typecheck` passes.
  - [ ] `npm run test` passes.
  - [ ] `npm run test:contracts` passes.
  - [ ] `npm run test:api` passes.
  - [ ] `npm run test:e2e` passes and stores screenshots under `.sisyphus/evidence/`.
  - [ ] `npm run build` passes.
  - [ ] Full demo flow has a single Playwright spec with deterministic mocked wallet/API behavior.

  **QA Scenarios**:
  ```
  Scenario: Full hackathon demo flow
    Tool: Playwright
    Steps: open `/`, click `Try protected voting`, confirm blocked, go to `/verify`, complete challenge, see tx hash, open `/status`, open `/humans`, return `/vote`, submit vote
    Expected: all steps pass; final tally increments; screenshots saved for landing, blocked vote, verified status, live humans, successful vote
    Evidence: .sisyphus/evidence/task-12-full-demo.zip

  Scenario: Expired proof blocks protected action
    Tool: Playwright
    Steps: mock proof with `humanUntil` in the past, open `/vote`, attempt signed vote
    Expected: API returns `NOT_HUMAN`; UI shows `Your HumanPass expired. Verify again.`
    Evidence: .sisyphus/evidence/task-12-expired-proof.png
  ```

  **Commit**: YES | Message: `test: verify humanpass mvp flow` | Files: [`app/**`, `components/**`, `tests/**`, `playwright.config.*`, evidence references if policy allows]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle [APPROVE]
- [x] F2. Code Quality Review — unspecified-high [APPROVE]
- [x] F3. Real Manual QA — unspecified-high (+ playwright) [APPROVE]
- [x] F4. Scope Fidelity Check — deep [APPROVE]

## Commit Strategy
- Commit after each completed wave if the repository is initialized as git by the executor or user.
- Suggested commits:
  - `chore: scaffold humanpass monad app`
  - `feat(contract): add temporary human proofs`
  - `feat(api): add challenge verifier flow`
  - `feat(ui): add humanpass demo pages`
  - `test: verify humanpass mvp flow`
- Do not commit `.env`, private keys, generated evidence videos larger than repository policy allows, or deployment secrets.

## Success Criteria
- User can connect wallet on Monad Testnet.
- Unverified wallet is blocked from voting.
- User completes number-order challenge and signs the challenge message.
- Backend verifier issues on-chain HumanPass proof and returns tx hash.
- Proof status shows verified with expiration countdown.
- Verified wallet can vote exactly once.
- Duplicate vote is rejected.
- Expired or unverified proof is rejected by `/api/vote`.
- Live humans list shows truncated verified wallets and expiry.
- All automated commands in Definition of Done pass.
