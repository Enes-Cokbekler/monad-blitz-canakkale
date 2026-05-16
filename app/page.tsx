import Link from "next/link";
import { WalletConnect } from "@/components/wallet-connect";

const STEPS = [
  {
    number: "01",
    title: "Connect Wallet",
    description: "Link your Monad wallet to start the verification flow.",
  },
  {
    number: "02",
    title: "Complete Challenge",
    description: "Solve a short human-signal challenge: reaction, number sequence, typing, or a question only a human cares about.",
  },
  {
    number: "03",
    title: "Proof Issued On-Chain",
    description: "An on-chain HumanPass proof is recorded on Monad with a short expiry window — no biometrics, no permanent data.",
  },
  {
    number: "04",
    title: "Any App Checks the Proof",
    description: "Every app on Monad reads isHuman(address). One verification, every protected action unlocked.",
  },
];

const USE_CASES = [
  { icon: "🎮", label: "Games" },
  { icon: "🗳️", label: "Voting" },
  { icon: "🎁", label: "Rewards" },
  { icon: "💬", label: "Social" },
  { icon: "🪂", label: "Airdrops" },
  { icon: "🏛️", label: "Governance" },
];

const WHY_MONAD = [
  {
    icon: "🔗",
    title: "Portable proofs",
    body: "A HumanPass proof issued once is valid across every integrated app on Monad. No per-app re-verification.",
  },
  {
    icon: "⚡",
    title: "Consumer-grade speed",
    body: "Monad's high throughput makes proof issuance feel instant — invisible latency to the end user.",
  },
  {
    icon: "🏗️",
    title: "EVM-compatible",
    body: "Any EVM smart contract integrates with one modifier. Frontend apps use one hook. No new tooling required.",
  },
  {
    icon: "🔓",
    title: "Not locked to one backend",
    body: "The proof lives on-chain. Any app reads it directly from Monad — no HumanPass backend dependency after issuance.",
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden">
      {/* Hero */}
      <section className="relative flex w-full flex-col items-center px-6 pb-20 pt-24 text-center">
        <div className="bg-hero-glow absolute inset-0 -z-10" />
        <div className="animate-fade-in flex flex-col items-center gap-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-monad-purple">
            HumanPass on Monad
          </p>
          <h1 className="glow-text max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            AI agents are flooding the internet.
          </h1>
          <p className="max-w-2xl text-lg text-text-secondary">
            HumanPass lets apps verify real humans before sensitive actions.
            Short-lived proof-of-human sessions for consumer apps on Monad.
          </p>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/demo" className="btn-primary text-base px-6 py-3">
              See 60-second demo →
            </Link>
            <Link href="/verify" className="btn-secondary text-base px-6 py-3">
              Get your HumanPass
            </Link>
            <WalletConnect />
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="w-full max-w-4xl px-6 py-16">
        <div className="animate-slide-up flex flex-col items-center gap-6 text-center">
          <h2 className="text-3xl font-bold text-text-primary">
            Consumer apps are drowning in bots
          </h2>
          <p className="max-w-2xl text-text-secondary">
            AI agents, fake accounts, and automated scripts flood games, voting systems, reward programs,
            and social platforms. They distort leaderboards, manipulate governance, and drain resources
            meant for real people. Existing solutions force users into invasive checks or permanent
            identity records. HumanPass offers a third way: lightweight, temporary, privacy-first.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full max-w-5xl px-6 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold text-text-primary">
          How it works
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="card-base bg-card-shine animate-fade-in group relative flex flex-col gap-3"
            >
              <span className="text-3xl font-black text-monad-purple/30 transition-colors group-hover:text-monad-purple">
                {step.number}
              </span>
              <h3 className="text-lg font-semibold text-text-primary">{step.title}</h3>
              <p className="text-sm text-text-secondary">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="w-full max-w-4xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold text-text-primary">
          Built for consumer apps
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {USE_CASES.map((uc) => (
            <div
              key={uc.label}
              className="card-base bg-card-shine animate-fade-in flex flex-col items-center gap-2 py-8 text-center transition-transform hover:-translate-y-1"
            >
              <span className="text-3xl" aria-hidden="true">{uc.icon}</span>
              <span className="text-sm font-medium text-text-primary">{uc.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy card */}
      <section className="w-full max-w-4xl px-6 py-16">
        <div className="card-base bg-card-shine animate-slide-up flex flex-col items-center gap-4 border-monad-purple/20 py-12 text-center">
          <span className="rounded-full border border-monad-cyan/30 bg-monad-cyan/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-monad-cyan">
            Privacy-first
          </span>
          <h2 className="text-2xl font-bold text-text-primary">
            No biometrics. No permanent records.
          </h2>
          <p className="max-w-lg text-text-secondary">
            HumanPass issues short-lived on-chain proofs that expire after a set window.
            No personal data stored on-chain. No camera uploads. No identity database.
            Just a temporary signal that a real human was present.
          </p>
        </div>
      </section>

      {/* Why Monad */}
      <section className="w-full max-w-5xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold text-text-primary">
          Why Monad?
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_MONAD.map((item) => (
            <div key={item.title} className="card-base bg-card-shine animate-fade-in flex flex-col gap-3">
              <span className="text-3xl">{item.icon}</span>
              <h3 className="font-bold text-text-primary">{item.title}</h3>
              <p className="text-sm text-text-secondary">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Try it */}
      <section className="w-full max-w-4xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold text-text-primary">
          Try it now
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <Link
            href="/demo"
            className="card-base bg-card-shine animate-fade-in group flex flex-col items-center gap-3 py-10 text-center transition-transform hover:-translate-y-1"
          >
            <span className="text-3xl">🎬</span>
            <h3 className="text-lg font-semibold text-text-primary">60-Second Demo</h3>
            <p className="text-sm text-text-secondary">Guided judge experience. Understand the full flow in one page.</p>
            <span className="mt-2 text-sm font-semibold text-monad-purple transition-colors group-hover:text-monad-purple-light">
              Start demo →
            </span>
          </Link>

          <Link
            href="/verify"
            className="card-base bg-card-shine animate-fade-in group flex flex-col items-center gap-3 py-10 text-center transition-transform hover:-translate-y-1"
          >
            <span className="text-3xl">🛡️</span>
            <h3 className="text-lg font-semibold text-text-primary">Get your HumanPass</h3>
            <p className="text-sm text-text-secondary">Complete a challenge and receive your on-chain proof.</p>
            <span className="mt-2 text-sm font-semibold text-monad-purple transition-colors group-hover:text-monad-purple-light">
              Start verification →
            </span>
          </Link>

          <Link
            href="/simulator"
            className="card-base bg-card-shine animate-fade-in group flex flex-col items-center gap-3 py-10 text-center transition-transform hover:-translate-y-1"
          >
            <span className="text-3xl">🤖</span>
            <h3 className="text-lg font-semibold text-text-primary">Bot Attack Simulator</h3>
            <p className="text-sm text-text-secondary">Watch AI agents and bots get blocked in real time.</p>
            <span className="mt-2 text-sm font-semibold text-monad-purple transition-colors group-hover:text-monad-purple-light">
              Open simulator →
            </span>
          </Link>
        </div>
      </section>

      {/* Developer CTA */}
      <section className="w-full max-w-4xl px-6 pb-24 pt-8">
        <div className="animate-fade-in rounded-xl border border-surface-border bg-surface-secondary px-8 py-10 text-center">
          <h2 className="text-xl font-bold text-text-primary">Integrate HumanPass into your app</h2>
          <p className="mt-3 max-w-lg mx-auto text-text-secondary">
            One modifier in your smart contract. One hook in your frontend.
            Any consumer app on Monad can gate sensitive actions behind a HumanPass proof.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/developers" className="btn-primary">
              Developer docs →
            </Link>
            <Link href="/vote" className="btn-secondary">
              See vote demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-surface-border px-6 py-8 text-center text-sm text-text-muted">
        HumanPass — Short-lived proof-of-human session layer for consumer apps on Monad
      </footer>
    </main>
  );
}
