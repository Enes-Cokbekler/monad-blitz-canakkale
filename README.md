# HumanPass

A proof-of-human session layer on Monad for consumer apps. Any app can gate actions behind a HumanPass check. Bots and AI agents are blocked at the protocol level — no extra code needed per-app.

## Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/verify` | Complete human challenge, get on-chain proof |
| `/vote` | Protected voting demo (HumanPass-gated) |
| `/status` | Look up any wallet's proof status |
| `/humans` | Live feed of verified human wallets |
| `/simulator` | Bot Attack Simulator — watch bots get blocked in real time |
| `/developers` | Integration docs and code examples |

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env.local
   ```

3. Add your WalletConnect Project ID to `.env.local`:
   - Get one at https://cloud.walletconnect.com

4. Add your verifier private key to `.env.local`:
   - This is the wallet that will issue human proofs on-chain.
   - Do NOT reuse a mainnet wallet. Create a fresh testnet wallet.

5. Add the deployed HumanPass contract address to `.env.local` after deployment.

## Development

Start the local dev server:

```bash
npm run dev
```

The app runs at http://localhost:3000.

## Testing

Run the full test suite:

```bash
npm run test
```

Run API tests only:

```bash
npm run test:api
```

Run smart contract tests only:

```bash
npm run test:contracts
```

Run end-to-end Playwright tests:

```bash
npm run test:e2e
```

## Contract Deployment

Compile the HumanPass Solidity contract:

```bash
npm run compile:contracts
```

Deploy to Monad Testnet:

```bash
npm run deploy:monad
```

After deployment, copy the contract address into your `.env.local` as `NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS`.

## Monad Testnet Values

- Chain ID: `10143`
- RPC URL: `https://testnet-rpc.monad.xyz`
- Explorer: https://testnet.monadexplorer.com/

The public RPC is rate-limited. For production workloads, use a dedicated RPC provider.

## Verifier Wallet Funding

The verifier wallet needs MON tokens to pay for gas when issuing proofs.

1. Get MON from the Monad testnet faucet.
2. Paste the verifier wallet address into the faucet and request tokens.
3. Confirm the balance in your wallet or on the explorer.
4. Set the verifier private key in `.env.local` as `VERIFIER_PRIVATE_KEY`.

Never commit the private key. `.gitignore` blocks all `.env*` files except `.env.example`.

## Single-Process In-Memory Limitation

This MVP stores temporary challenge state in memory. That means:

- It only works within a single running process.
- It is not safe for serverless deployments where each request may hit a different instance.
- For production, replace in-memory state with Redis or a database.

## Human-Signal Challenges

HumanPass supports four MVP-level human-signal challenge types. One is randomly selected per verification session. These are **demo-quality** challenges — they raise the bar for bots but are not production-grade bot detection. The core value is the **short-lived on-chain proof-of-human session** issued on Monad after any challenge is passed and the wallet signature is verified.

| Challenge | What the user does | Backend validates |
|---|---|---|
| **Number Sequence** | Click 5 random numbers in order | Server-stored sequence vs submitted order |
| **Reaction** | Wait for signal, click within the time window | `clickedAt` timestamp vs server-calculated window |
| **Typing Phrase** | Type an exact phrase while camera is locally previewed | Typed string vs server-stored phrase (exact match) |
| **Human Signal Question** | Pick the funniest/most-human multiple-choice answer | Selected index vs server-stored correct index (not exposed in API) |

**Privacy:** The typing challenge requests camera permission for a local-only liveness effect. No video is uploaded, stored, or sent to the backend. The camera stream is stopped immediately after the phrase is typed.

## Developer Integration

HumanPass exposes a single read function: `isHuman(address) → bool`.

**Solidity — gate a contract function:**
```solidity
interface IHumanPass {
    function isHuman(address wallet) external view returns (bool);
}

modifier onlyHuman() {
    require(IHumanPass(HUMANPASS_CONTRACT).isHuman(msg.sender), "No HumanPass");
    _;
}
```

**TypeScript / viem — check off-chain:**
```ts
const isVerified = await client.readContract({
  address: HUMANPASS_CONTRACT,
  abi: [{ name: "isHuman", type: "function", stateMutability: "view",
          inputs: [{ name: "wallet", type: "address" }],
          outputs: [{ name: "", type: "bool" }] }],
  functionName: "isHuman",
  args: [walletAddress],
});
```

See `/developers` for full examples including React/wagmi gate component.

## Bot Attack Simulator

Open `/simulator` to watch the protection in action:

- AI agents and bots continuously attempt protected actions (vote, claim reward, join game).
- Every unverified request is blocked with the reason shown (e.g. "No HumanPass").
- Verified human wallets pass through.
- Live counters show total attempts, bots blocked, humans accepted, and protection rate.

Use this during a demo to make the value of HumanPass obvious in under 10 seconds.

## Demo Script

1. Open `/` and explain the problem: AI agents and bots flood consumer apps.
2. Open `/simulator` — hit "Start Simulation". Judges watch bots get blocked in real time.
3. Point out the protection rate counter (typically 75–85%).
4. Connect a wallet. Open `/verify` and complete the human challenge.
5. Show the Verified Human proof card — wallet, tx hash, expiry, contract address.
6. Open `/vote` — vote successfully as a verified human.
7. Open `/status` — show the on-chain proof is queryable for any wallet.
8. Open `/humans` — show the live feed of verified wallets.
9. Open `/developers` — show that any app integrates with one function call.
10. Close: "One proof layer. Any consumer app on Monad. Bots out, humans in."
