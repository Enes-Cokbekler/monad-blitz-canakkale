import Link from "next/link";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS ?? "0x<HumanPass Contract>";

const SDK_QUICKSTART = `import { requireHuman } from "@/lib/humanpass-sdk";

const result = await requireHuman(userAddress);

if (!result.ok) {
  redirect("/verify"); // reason: HUMANPASS_REQUIRED | PROOF_EXPIRED | INVALID_ADDRESS
}

allowProtectedAction(); // result.status has full proof details`;

const SDK_STATUS = `import { getHumanPassStatus } from "@/lib/humanpass-sdk";

// Full status object — read once, use everywhere
const status = await getHumanPassStatus(address);
// { 
//   address: "0x...",
//   isHuman: true,
//   humanUntil: 1747000000,     // Unix timestamp seconds
//   expiresInSeconds: 3547,
//   contractAddress: "0x...",
//   chainId: 10143
// }`;

const REWARD_SNIPPET = `import { requireHuman } from "@/lib/humanpass-sdk";

const result = await requireHuman(wallet);

if (!result.ok) {
  throw new Error("HumanPass required");
}

claimReward();`;

const REACT_HOOK = `import { useReadContract } from "wagmi";
import { humanPassAbi } from "@/lib/contracts/HumanPass.abi";

const CONTRACT = process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;

export function ProtectedPage({ address }) {
  const { data: isHuman } = useReadContract({
    address: CONTRACT,
    abi: humanPassAbi,
    functionName: "isHuman",
    args: [address],
  });

  if (!isHuman) return <RedirectToVerify />;
  return <YourProtectedContent />;
}`;

const SOLIDITY_SNIPPET = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Minimal interface — copy this or import IHumanPass.sol from the repo
interface IHumanPass {
    function isHuman(address user) external view returns (bool);
    function getHumanUntil(address user) external view returns (uint256);
}

contract MyApp {
    IHumanPass public humanPass;

    constructor(address humanPassAddress) {
        humanPass = IHumanPass(humanPassAddress);
    }

    modifier onlyHuman() {
        require(humanPass.isHuman(msg.sender), "HumanPass required");
        _;
    }

    function vote(uint8 option) external onlyHuman {
        // Only verified humans reach this line
    }

    function claimReward() external onlyHuman {
        // Bots cannot call this
    }
}`;

const VIEM_SNIPPET = `import { createPublicClient, http } from "viem";
import { monadTestnet } from "viem/chains";

const HUMANPASS = "${CONTRACT_ADDRESS}";
const ABI = [
  { name: "isHuman", type: "function", stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "bool" }] },
] as const;

const client = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export async function checkHuman(address: string): Promise<boolean> {
  return client.readContract({
    address: HUMANPASS,
    abi: ABI,
    functionName: "isHuman",
    args: [address as \`0x\${string}\`],
  });
}`;

const EIP712_SNIPPET = `// HumanPass uses EIP-712 typed data — users see exactly what they sign
import { useSignTypedData } from "wagmi";

const DOMAIN = {
  name: "HumanPass",
  version: "1",
  chainId: 10143, // Monad Testnet
  verifyingContract: "${CONTRACT_ADDRESS}",
};

const TYPES = {
  HumanPassVerification: [
    { name: "wallet",      type: "address" },
    { name: "challengeId", type: "string"  },
    { name: "nonce",       type: "string"  },
    { name: "issuedAt",    type: "uint256" },
    { name: "expiresAt",   type: "uint256" },
    { name: "purpose",     type: "string"  },
  ],
};

const { signTypedDataAsync } = useSignTypedData();

const signature = await signTypedDataAsync({
  domain: DOMAIN,
  types: TYPES,
  primaryType: "HumanPassVerification",
  message: {
    wallet: address,
    challengeId: challenge.challengeId,
    nonce: challenge.nonce,
    issuedAt: BigInt(challenge.issuedAt),
    expiresAt: BigInt(challenge.expiresAt),
    purpose: "Request HumanPass proof",
  },
});`;

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-surface-border bg-surface-secondary p-4 text-xs leading-relaxed text-text-primary">
      <code>{code}</code>
    </pre>
  );
}

export default function DevelopersPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-monad-cyan/30 bg-monad-cyan/10 px-3 py-1 text-xs font-semibold text-monad-cyan">
            DEVELOPER DOCS
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Integrate HumanPass in any Monad app</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            HumanPass is a reusable proof-of-human session layer. Any consumer app on Monad can gate
            sensitive actions behind a HumanPass check — one function call, any contract, any frontend.
            Users verify once. Every integrated app benefits. Consumer apps never interact with
            challenges or signatures — they only read the on-chain proof state.
          </p>
        </div>

        {/* Quickstart — most important */}
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold text-text-primary">Quickstart</h2>
          <p className="mb-4 text-sm text-text-secondary">
            Gate any action with <code className="text-monad-cyan">requireHuman</code>. Never throws — returns a typed result.
          </p>
          <CodeBlock code={SDK_QUICKSTART} />
          <p className="mt-4 mb-2 text-sm text-text-secondary">
            Reward claim example — the same check protects coffee coupons, event perks, and raffles:
          </p>
          <CodeBlock code={REWARD_SNIPPET} />
          <p className="mt-4 mb-2 text-sm text-text-secondary">
            Or read the full status object:
          </p>
          <CodeBlock code={SDK_STATUS} />
        </section>

        {/* Architecture */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-text-primary">How It Works</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { step: "1", icon: "🛡️", title: "User Verifies", body: "Completes a human challenge on HumanPass. An on-chain proof is issued to their wallet on Monad." },
              { step: "2", icon: "🔍", title: "Your App Checks", body: "Your contract or frontend calls isHuman(address). One read. No backend call to HumanPass." },
              { step: "3", icon: "✅", title: "Action Gated", body: "Verified humans proceed. Bots and unverified wallets are blocked automatically." },
            ].map((item) => (
              <div key={item.step} className="card-base bg-card-shine">
                <span className="mb-3 block text-3xl">{item.icon}</span>
                <h3 className="mb-1 font-bold text-text-primary">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contract info */}
        <section className="mb-10 rounded-xl border border-surface-border bg-surface-secondary p-6">
          <h2 className="mb-4 text-lg font-bold text-text-primary">Contract Info</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-muted">Network</span>
              <span className="font-semibold text-text-primary">Monad Testnet (Chain ID: 10143)</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="shrink-0 text-text-muted">Contract</span>
              <span className="break-all font-mono text-monad-cyan">{CONTRACT_ADDRESS}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-muted">Key function</span>
              <code className="rounded bg-surface-card px-2 py-0.5 text-xs text-monad-purple-light">
                isHuman(address) → bool
              </code>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-muted">Proof duration</span>
              <span className="text-text-primary">10 minutes per verification (MVP)</span>
            </div>
          </div>
        </section>

        {/* Code examples */}
        <section className="mb-10 space-y-8">
          <h2 className="text-xl font-bold text-text-primary">Code Examples</h2>

          <div>
            <h3 className="mb-2 font-semibold text-text-primary">React / wagmi — live read</h3>
            <p className="mb-3 text-sm text-text-secondary">
              Use <code className="text-monad-cyan">useReadContract</code> in client components for reactive proof state.
            </p>
            <CodeBlock code={REACT_HOOK} />
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-text-primary">Solidity — integrate via IHumanPass</h3>
            <p className="mb-3 text-sm text-text-secondary">
              Copy the interface or import{" "}
              <code className="text-monad-cyan">IHumanPass.sol</code> from the repo. Pass the deployed
              HumanPass address in your constructor. Bots calling your functions revert immediately.
            </p>
            <CodeBlock code={SOLIDITY_SNIPPET} />
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-text-primary">TypeScript / viem — raw read</h3>
            <p className="mb-3 text-sm text-text-secondary">
              Use in a backend API route, server action, or middleware to validate before processing.
            </p>
            <CodeBlock code={VIEM_SNIPPET} />
          </div>
        </section>

        {/* Event-based auditability */}
        <section className="mb-10 rounded-xl border border-monad-cyan/20 bg-monad-cyan/5 p-6">
          <h2 className="mb-3 text-xl font-bold text-text-primary">Event-based auditability</h2>
          <p className="mb-4 text-sm text-text-secondary">
            Every proof issuance and revocation emits an on-chain event. Apps can check{" "}
            <code className="text-monad-cyan">isHuman(address)</code> for current state, or read{" "}
            <code className="text-monad-cyan">HumanProofIssued</code> event logs for full history.
            The proof layer is transparent and composable — no trust in any frontend required.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Current state",
                body: "isHuman(address) → bool. One read, any contract, any frontend. No backend call to HumanPass.",
              },
              {
                label: "Historical audit",
                body: "Read HumanProofIssued/HumanProofRevoked events from the contract logs to build dashboards or prove past verification.",
              },
              {
                label: "Composability",
                body: "Events make the proof layer open: wallets, explorers, and other protocols can index and display proof history independently.",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-surface-border bg-surface-secondary p-4">
                <p className="mb-1 text-xs font-semibold text-monad-cyan">{item.label}</p>
                <p className="text-xs text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="mb-10 rounded-xl border border-monad-purple/30 bg-monad-purple/10 p-6">
          <h2 className="mb-3 font-bold text-monad-purple-light">One Layer, Any App</h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            {[
              "Governance — only real users vote on proposals, no sybil manipulation",
              "Gaming — bot-free leaderboards and matchmaking",
              "Airdrops — fair token distribution, no farming bots",
              "Rewards and raffles — no automated coffee coupon, event perk, or prize drain",
              "Event perks — snack passes, badge access, and attendee-only drops",
              "Chat & forums — eliminate AI spam at the protocol layer",
              "Events & tickets — one proof, one human, one entry",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 text-monad-cyan">→</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* EIP-712 signature section */}
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold text-text-primary">EIP-712 Typed Signatures</h2>
          <p className="mb-4 text-sm text-text-secondary">
            HumanPass uses EIP-712 typed data signatures so users know exactly what they are signing,
            and the backend can bind each proof request to a specific wallet, challenge, nonce, chain,
            and contract. Plain message signing is rejected.
          </p>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Wallet binding", body: "Signature is tied to the connected wallet address. A signature from a different key is rejected." },
              { label: "Challenge binding", body: "Signed challengeId and nonce prevent cross-challenge or replayed signatures." },
              { label: "Chain binding", body: "Domain chainId is Monad Testnet. Signatures from other chains are invalid." },
              { label: "Contract binding", body: "Domain verifyingContract is the HumanPass contract address. Cross-contract replay is blocked." },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-surface-border bg-surface-secondary p-4">
                <p className="mb-1 text-xs font-semibold text-monad-cyan">{item.label}</p>
                <p className="text-xs text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
          <CodeBlock code={EIP712_SNIPPET} />
        </section>

        {/* Network note */}
        <div className="mb-10 rounded-lg border border-monad-cyan/20 bg-monad-cyan/5 px-5 py-4 text-sm text-text-secondary">
          <p className="font-semibold text-monad-cyan mb-1">Monad Testnet — Chain ID 10143</p>
          <p>
            Apps integrating HumanPass should check Monad Testnet chain ID 10143 before requesting
            proof signatures or calling protected actions. If the user is on the wrong network,
            prompt them to switch before continuing. Use wagmi&apos;s{" "}
            <code className="text-monad-cyan">useSwitchChain</code> or call{" "}
            <code className="text-monad-cyan">wallet_addEthereumChain</code> with chain ID 10143.
          </p>
        </div>

        <div className="mb-10 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm text-text-secondary">
          <p className="font-semibold text-emerald-400 mb-1">Reusable consumer protection</p>
          <p>
            HumanPass can protect rewards, raffles, event perks, games, votes, and other sensitive
            consumer actions. Voting and the coffee coupon demo both read the same on-chain proof.
          </p>
        </div>

        {/* Positioning note */}
        <div className="mb-10 rounded-lg border border-surface-border bg-surface-secondary px-5 py-4 text-xs text-text-muted">
          <p className="font-semibold text-text-secondary mb-1">MVP note</p>
          <p>HumanPass is not a global identity system or perfect bot detection. The challenges are demo-quality human signals — they raise the bar significantly but are not production security hardened. The core value is the short-lived on-chain proof issued on Monad. Future work includes stronger challenges, proof renewal, and cross-app proof sharing standards.</p>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          <Link href="/verify" className="btn-primary">Get Your HumanPass →</Link>
          <Link href="/simulator" className="btn-secondary">See Bot Simulator</Link>
          <Link href="/vote" className="btn-secondary">Vote Demo</Link>
          <Link href="/rewards" className="btn-secondary">Rewards Demo</Link>
          <Link href="/demo" className="btn-secondary">60-Second Demo</Link>
        </div>
      </div>
    </main>
  );
}
