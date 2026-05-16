# HumanPass

A proof-of-human session layer on Monad for consumer apps.

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

## Demo Script Summary

1. Open the HumanPass landing page.
2. Explain the problem: AI agents and bots are flooding consumer apps.
3. Connect a wallet.
4. Try to vote without verification. The app blocks the action.
5. Complete the human challenge.
6. A HumanPass proof is issued on Monad.
7. Show the proof status page.
8. Return to the voting app and vote successfully.
9. Show live result updates.
10. Explain how any consumer app can integrate HumanPass.
