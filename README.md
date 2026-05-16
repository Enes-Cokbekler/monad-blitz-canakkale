# HumanPass

> Short-lived proof-of-human session layer for consumer apps on Monad.

AI agents are flooding the internet. HumanPass lets apps verify real humans before sensitive actions. A user cannot perform a sensitive action until they complete a human challenge and receive an active on-chain HumanPass proof.

**What HumanPass is:** A lightweight, temporary proof-of-human session issued on Monad. Any consumer app can gate actions behind it.

**What HumanPass is not:** A global identity system. Perfect bot detection. Biometrics or persistent personal data.

---

## 60-Second Demo Script

**For judges — use the `/demo` page as the main presentation view.**

1. Open `/demo` → click **Start 60-second demo**. Steps auto-advance.
2. **Step 1 (The Problem):** AI agents flood games, voting, rewards. Traditional solutions are invasive.
3. **Step 2 (Bot Blocked):** Without HumanPass, any wallet can call any function. Bots get through.
4. Open `/simulator` → **Start Simulation**. Judges watch bots get blocked in under 10 seconds.
5. **Step 3 (Human Verified):** User connects wallet, completes a random human-signal challenge.
6. Open `/verify` → complete the challenge (reaction, sequence, typing, or question).
7. **Step 4 (Proof On-Chain):** HumanPass proof recorded on Monad. Show the Verified Human card.
8. Open `/status` → paste the wallet address. Proof is readable by any app.
9. Open `/vote` → vote successfully as a verified human. Unverified attempts are rejected.
10. Open `/developers` → show the three-line integration. One modifier. One hook.
11. Close: "One proof layer. Any consumer app on Monad. Bots out, humans in."

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/demo` | **Judge demo** — guided 60-second flow |
| `/verify` | Complete challenge, receive on-chain proof |
| `/vote` | Protected voting demo (HumanPass-gated) |
| `/status` | Look up any wallet's proof status |
| `/humans` | Live feed of verified human wallets |
| `/simulator` | Bot Attack Simulator — watch bots get blocked |
| `/developers` | Integration docs and code examples |

---

## Why Monad?

- **Portable proofs** — A HumanPass proof issued once is valid across every integrated app on Monad. No per-app re-verification.
- **Consumer-grade speed** — Monad's high throughput makes proof issuance feel instant. No waiting.
- **EVM-compatible** — Any EVM contract integrates with one modifier import. No new tooling.
- **Not locked to one backend** — The proof lives on-chain. Any app reads it directly from Monad. No HumanPass backend dependency after issuance.

---

## Human-Signal Challenges

One of four challenge types is randomly selected per verification session. These are demo-quality signals — they raise the bar for bots but are not production-hardened security. The core value is the short-lived on-chain proof issued on Monad after the challenge is passed.

| Challenge | What the user does | Backend validates |
|---|---|---|
| **Number Sequence** | Click 5 random numbers in order | Server-stored sequence vs submitted order |
| **Reaction** | Wait for signal, click within time window | `clickedAt` timestamp vs server-calculated window |
| **Typing Phrase** | Type an exact phrase while camera locally previews | Typed string vs server-stored phrase (exact match) |
| **Human Signal Question** | Pick the funniest/most-human MCQ answer | Selected index vs server-stored correct index (never exposed in API) |

**Privacy:** The typing challenge requests camera permission for a local-only liveness effect. No video is uploaded, stored, or sent to the backend. The stream stops immediately after the phrase is typed.

---

## Challenge Security

Each verification session has multiple layers of server-side protection:

| Protection | Mechanism |
|---|---|
| **Nonce** | 16-byte random hex generated per session. Must be echoed back in the verify request. Prevents session fixation. |
| **Expiration** | Sessions expire after 120 seconds. Server checks `expiresAt` before validation. |
| **One-time use** | `consumed` flag set immediately after a successful proof issuance. A second verify request with the same `challengeId` returns `CHALLENGE_ALREADY_USED`. |
| **Attempt limit** | Max 3 attempts per session (`maxAttempts`). Wrong answers increment the counter; wrong nonce does not. |
| **Address binding** | `challengeId` is tied to a wallet address. Cross-address use returns `INVALID_ADDRESS`. |
| **Signature binding** | EIP-712 typed data signature includes wallet, chain, challengeId, nonce, issuedAt, expiresAt, and purpose. Signer recovery is checked against the submitted address. |
| **Chain binding** | `chainId` in the request must match the session's `chainId`. |

Error codes returned by `POST /api/challenge/verify`:

| Code | Meaning |
|---|---|
| `NONCE_MISMATCH` | Nonce missing or does not match session |
| `CHALLENGE_EXPIRED` | Session TTL elapsed |
| `CHALLENGE_ALREADY_USED` | Replay attempt — challenge already consumed |
| `TOO_MANY_ATTEMPTS` | Attempt limit exceeded |
| `INVALID_ADDRESS` | Address does not match session |
| `WRONG_CHAIN` | Chain ID mismatch |
| `INVALID_SIGNATURE` | Signature recovery failed or wrong signer |

**MVP caveat:** Challenge state is in-memory. In a serverless or multi-instance deployment, replace the in-memory store with Redis.

---

## EIP-712 Signature Flow

HumanPass uses EIP-712 typed data signatures instead of plain `eth_sign`. This gives users clear visibility into what they are signing and lets the backend bind each signature to a specific session.

### Typed data structure

```
HumanPassVerification:
  wallet:      address   — the connected wallet
  challengeId: string    — the unique session ID
  nonce:       string    — 16-byte random hex, prevents fixation
  issuedAt:    uint256   — challenge creation timestamp (ms)
  expiresAt:   uint256   — challenge expiry timestamp (ms)
  purpose:     string    — "Request HumanPass proof"
```

### Domain

```
name:              "HumanPass"
version:           "1"
chainId:           10143 (Monad Testnet)
verifyingContract: <NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS>
```

### Security properties

| Property | Effect |
|---|---|
| **Wallet binding** | Signature is tied to the signer's address. A different key produces a different recovered address → rejected. |
| **Challenge binding** | `challengeId` in the typed data must match the server-stored challenge. Wrong ID → signature mismatch. |
| **Nonce binding** | `nonce` in the typed data must match the server-stored nonce. Prevents cross-session replay. |
| **Chain binding** | `chainId` in the EIP-712 domain is Monad Testnet. Signatures produced on other chains are invalid. |
| **Contract binding** | `verifyingContract` is the HumanPass contract. Cross-contract replay is blocked. |
| **Plain-text rejection** | `eth_sign` or arbitrary message signatures are rejected — only correctly structured typed data is accepted. |

---

## Setup

### Prerequisites
- Node.js 18+
- A Monad Testnet wallet (for the verifier)
- WalletConnect Project ID

### Install

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
VERIFIER_PRIVATE_KEY=0x...           # Verifier wallet — funds it from Monad faucet
NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS=0x...

# Optional
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_DEMO_MODE=false          # Set to true to simulate proof if Monad RPC is down
```

### Run locally

```bash
npm run dev          # Dev with Turbopack (fast)
npm run demo         # Production build + start (recommended for demos)
```

The app runs at http://localhost:3000.

---

## Contract Deployment

Compile:

```bash
npm run compile:contracts
```

Deploy to Monad Testnet:

```bash
npm run deploy:monad
```

Copy the output contract address into `NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS` in `.env.local`.

## Monad Testnet Values

- Chain ID: `10143`
- RPC: `https://testnet-rpc.monad.xyz` (rate-limited — use dedicated RPC for production)
- Explorer: https://testnet.monadexplorer.com/

## Verifier Wallet Funding

The verifier wallet pays gas for each proof issuance. Fund it from the Monad faucet, then set `VERIFIER_PRIVATE_KEY` in `.env.local`. Never commit the private key.

---

## Testing

```bash
npm run test          # All tests
npm run test:api      # API tests only (44 tests)
npm run test:contracts # Hardhat contract tests
npm run test:e2e      # Playwright end-to-end
```

---

## Demo Mode

Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`.

When enabled, if the Monad RPC is unavailable or the verifier wallet is out of funds, the UI will simulate a successful proof issuance. The proof card clearly labels it as **"Demo Mode — simulated transaction"** and does not show a real tx hash or explorer link.

This is for presentations only. Do not enable in production.

---

## Operational Safety

| Mechanism | What it does |
|---|---|
| **In-memory rate limiting** | Per-wallet and per-IP sliding-window counters gate `/api/challenge/start`, `/api/challenge/verify`, and `/api/vote`. Limits: 5 challenge starts / wallet / min, 10 verify attempts / wallet / min, 5 votes / wallet / min, 30 global requests / IP / min. |
| **Challenge cleanup** | Expired challenges are purged on each `createChallenge` call. Consumed challenges are removed after a 30-second grace period to allow in-flight response reads. No Redis required. |
| **Health endpoint** | `GET /api/health` returns RPC status, chain ID, HumanPass contract read result, verifier wallet address, MON balance, and whether the verifier has enough gas. Never exposes private keys. |
| **Health dashboard** | `/health` shows a live operational view — useful before demos and after deployment. |

**Production note:** The in-memory rate limiter and challenge store are single-process. For multi-instance or serverless deployments, replace with Redis.

---

## Known MVP Limits

- **Single-process in-memory challenge state** — Not safe for serverless deployments where each request may hit a different instance. For production, replace with Redis.
- **Human challenges are demo-quality** — They raise the bar for bots but are not production security hardened.
- **No proof renewal** — Users must re-verify when the proof expires.
- **No cross-app proof standards** — Each app integrates independently. A standard registry would improve UX.
- **Public RPC is rate-limited** — Use a dedicated Monad RPC provider for production.

---

## Future Roadmap

- Stronger, randomized challenges with server-side timing validation
- Proof renewal without re-running the full challenge flow
- Cross-app proof registry and standards
- SDK packages (`@humanpass/sdk`, `@humanpass/react`)
- Mainnet deployment
- Proof expiry configurable per-app
- Webhook for apps to receive proof-issued events

---

## Developer Integration

One modifier in your Solidity contract:

```solidity
modifier onlyHuman() {
    require(IHumanPass(HUMANPASS_CONTRACT).isHuman(msg.sender), "No HumanPass");
    _;
}
```

One hook in your React frontend:

```typescript
const { isHuman, expiresAt } = useHumanPass(address);
```

One function call anywhere:

```typescript
const isHuman = await humanpass.isHuman(address);
if (!isHuman) redirect("/verify");
allowProtectedAction();
```

See `/developers` for full Solidity, viem, and React/wagmi examples.

---

## On-chain Proof Activity

HumanPass emits `HumanProofIssued` and `HumanProofRevoked` events for every proof issuance and revocation. These events are the authoritative on-chain audit trail.

**What this means:**
- Any app or user can independently read proof history from the Monad contract logs — no trust in the HumanPass frontend required
- The `/activity` page reads recent contract logs and displays them with block numbers and transaction hashes
- Event-based auditability makes the proof layer composable: dashboards, wallets, and other protocols can index HumanPass events independently

**Configure for efficient log reads:**

After deploying, set the deploy block in `.env.local` to avoid scanning from genesis:

```env
NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK=<block number printed by deploy script>
```

Without this, the app falls back to scanning the last 50,000 blocks. The deploy script prints `deploymentBlock` so you can copy it directly.

**Events emitted by the contract:**

```solidity
event HumanProofIssued(address indexed user, uint256 validUntil);
event HumanProofRevoked(address indexed user);
event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
```

**Read events via the TypeScript helper:**

```typescript
import { getRecentHumanPassEvents, getHumanProofEventsForAddress } from "@/lib/humanpass-events";

// All recent events
const { events } = await getRecentHumanPassEvents();

// Events for a specific wallet
const { events } = await getHumanProofEventsForAddress(address);
// [{ type: "ISSUED", user, validUntil, txHash, blockNumber }, ...]
```

---

## TypeScript Integration Helper

`lib/humanpass-sdk.ts` provides a typed, viem-based helper that any frontend or server-side code can use to check HumanPass status.

**Functions:**

| Function | Returns | Use when |
|---|---|---|
| `requireHuman(address)` | `{ ok, reason?, status? }` | Gating a protected action — never throws |
| `getHumanPassStatus(address)` | `HumanPassStatus` | Reading full status including expiry |
| `isHuman(address)` | `boolean` | Simple boolean check |
| `getHumanUntil(address)` | `number` (Unix seconds) | Displaying expiry time |

**Gate a protected action (server or Node):**

```typescript
import { requireHuman } from "@/lib/humanpass-sdk";

const result = await requireHuman(userAddress);

if (!result.ok) {
  // result.reason: "HUMANPASS_REQUIRED" | "PROOF_EXPIRED" | "INVALID_ADDRESS" | "CONTRACT_NOT_CONFIGURED"
  redirect("/verify");
}

allowProtectedAction(); // result.status has full proof details
```

**Read full status:**

```typescript
import { getHumanPassStatus } from "@/lib/humanpass-sdk";

const status = await getHumanPassStatus(address);
// { address, isHuman, humanUntil, expiresInSeconds, contractAddress, chainId }
```

**How it works:**
- Reads the deployed HumanPass contract on Monad via viem `readContract`
- No app needs to implement challenge or signature logic — the SDK reads proof state only
- Returns clean errors (`CONTRACT_NOT_CONFIGURED`, `INVALID_ADDRESS`) instead of crashing if env is missing
- `requireHuman` never throws — use in API routes, server actions, and middleware safely
- For React client components, use wagmi `useReadContract` with `humanPassAbi` directly

---

## Integrating HumanPass

HumanPass proofs are portable across apps. Any Monad contract can verify a wallet by calling
`isHuman(address)` on the deployed HumanPass contract — no knowledge of challenges or signatures needed.

**How it works for consumer apps:**

- User verifies once on HumanPass and receives an on-chain proof tied to their wallet.
- Consumer apps import `IHumanPass` and pass the HumanPass contract address in their constructor.
- They call `humanPass.isHuman(msg.sender)` to gate any sensitive action.
- Proof expiry and revocation are handled entirely by HumanPass — consumer apps read state only.
- This makes HumanPass a reusable verification layer: deploy once, read from anywhere on Monad.

**Interface:**

```solidity
interface IHumanPass {
    function isHuman(address user) external view returns (bool);
    function getHumanUntil(address user) external view returns (uint256);
}
```

**Minimal consumer contract:**

```solidity
contract MyApp {
    IHumanPass public humanPass;

    constructor(address humanPassAddress) {
        humanPass = IHumanPass(humanPassAddress);
    }

    function protectedAction() external {
        require(humanPass.isHuman(msg.sender), "HumanPass required");
        // action
    }
}
```

See `contracts/interfaces/IHumanPass.sol` for the full interface and
`contracts/examples/HumanProtectedAction.sol` for a complete integration example.

**Run contract tests:**

```bash
npm run test:contracts          # All Hardhat tests (HumanPass + HumanProtectedAction)
npm run compile:contracts       # Recompile contracts
```
