import Link from "next/link";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS ?? "0x<HumanPass Contract>";

const SOLIDITY_SNIPPET = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHumanPass {
    function isHuman(address wallet) external view returns (bool);
}

contract MyProtectedApp {
    IHumanPass public humanPass =
        IHumanPass(${CONTRACT_ADDRESS});

    modifier onlyHuman() {
        require(humanPass.isHuman(msg.sender), "No HumanPass");
        _;
    }

    function vote(uint8 option) external onlyHuman {
        // only verified humans reach here
    }
}`;

const JS_CHECK_SNIPPET = `import { createPublicClient, http } from "viem";
import { monadTestnet } from "viem/chains";

const HUMANPASS = "${CONTRACT_ADDRESS}";
const ABI = [
  {
    name: "isHuman",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
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

const REACT_GATE_SNIPPET = `"use client";

import { useReadContract } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const HUMANPASS = "${CONTRACT_ADDRESS}";
const ABI = [
  { name: "isHuman", type: "function", stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "bool" }] },
] as const;

export function HumanGate({ address }: { address: string }) {
  const router = useRouter();
  const { data: isHuman } = useReadContract({
    address: HUMANPASS,
    abi: ABI,
    functionName: "isHuman",
    args: [address as \`0x\${string}\`],
  });

  useEffect(() => {
    if (isHuman === false) {
      // redirect unverified users to get their HumanPass
      router.push("https://humanpass.xyz/verify");
    }
  }, [isHuman, router]);

  if (!isHuman) return <p>Checking verification…</p>;
  return null; // user is verified, render your protected UI
}`;

function CodeBlock({ code }: { code: string; lang?: string }) {
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
        <div className="mb-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-monad-cyan/30 bg-monad-cyan/10 px-3 py-1 text-xs font-semibold text-monad-cyan">
            DEVELOPER DOCS
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Integrate HumanPass</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            HumanPass is a reusable proof-of-human session layer. Any consumer app on Monad can gate
            actions behind a HumanPass check — votes, rewards, airdrops, game slots. Users verify
            once; every app benefits.
          </p>
        </div>

        {/* Architecture */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-text-primary">How It Works</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "User Verifies",
                body: "User completes a human challenge on HumanPass. An on-chain proof is issued to their wallet on Monad.",
                icon: "🛡️",
              },
              {
                step: "2",
                title: "Your App Checks",
                body: "Your contract calls isHuman(wallet) or your frontend reads the same. One line of code.",
                icon: "🔍",
              },
              {
                step: "3",
                title: "Action Gated",
                body: "Verified humans proceed. Bots and unverified wallets are blocked — no extra code needed.",
                icon: "✅",
              },
            ].map((item) => (
              <div key={item.step} className="card-base bg-card-shine">
                <span className="mb-3 block text-3xl">{item.icon}</span>
                <h3 className="mb-1 font-bold text-text-primary">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contract details */}
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
              <span className="text-text-muted">Proof duration</span>
              <span className="text-text-primary">30 days per verification</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-muted">Key function</span>
              <span className="font-mono text-monad-purple-light">isHuman(address) → bool</span>
            </div>
          </div>
        </section>

        {/* Code snippets */}
        <section className="mb-10 space-y-8">
          <h2 className="text-xl font-bold text-text-primary">Code Examples</h2>

          <div>
            <h3 className="mb-2 font-semibold text-text-primary">
              1. Solidity — Gate a contract function
            </h3>
            <p className="mb-3 text-sm text-text-secondary">
              Add the <code className="text-monad-cyan">onlyHuman</code> modifier to any function you want to protect.
            </p>
            <CodeBlock code={SOLIDITY_SNIPPET} lang="solidity" />
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-text-primary">
              2. TypeScript / viem — Check a wallet off-chain
            </h3>
            <p className="mb-3 text-sm text-text-secondary">
              Use this in a backend API route or server action to validate before processing a request.
            </p>
            <CodeBlock code={JS_CHECK_SNIPPET} />
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-text-primary">
              3. React / wagmi — Gate a UI component
            </h3>
            <p className="mb-3 text-sm text-text-secondary">
              Drop <code className="text-monad-cyan">{"<HumanGate />"}</code> at the top of any protected page. Unverified users are redirected to verify.
            </p>
            <CodeBlock code={REACT_GATE_SNIPPET} />
          </div>
        </section>

        {/* Why reusable */}
        <section className="mb-10 rounded-xl border border-monad-purple/30 bg-monad-purple/10 p-6">
          <h2 className="mb-3 font-bold text-monad-purple-light">One Layer, Any App</h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            {[
              "Governance — only real users vote on proposals",
              "Gaming — bot-free leaderboards and matchmaking",
              "Airdrops — fair token distribution to humans",
              "Reward claims — no sybil farming",
              "Chat & forums — eliminate AI spam at the protocol layer",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 text-monad-cyan">→</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          <Link href="/verify" className="btn-primary">
            Get Your HumanPass →
          </Link>
          <Link href="/simulator" className="btn-secondary">
            See Bot Simulator
          </Link>
          <Link href="/vote" className="btn-secondary">
            Vote Demo
          </Link>
        </div>
      </div>
    </main>
  );
}
