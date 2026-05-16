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
    description: "Solve a short interactive challenge that confirms you're a real person.",
  },
  {
    number: "03",
    title: "Proof Issued",
    description: "An on-chain proof is recorded on Monad, timestamped with an expiry window.",
  },
  {
    number: "04",
    title: "Protected App Checks Proof",
    description: "Any integrated app verifies your proof before granting access to sensitive actions.",
  },
];

const USE_CASES = [
  { icon: "🎮", label: "Games" },
  { icon: "🗳️", label: "Voting" },
  { icon: "🎁", label: "Rewards" },
  { icon: "💬", label: "Social Platforms" },
  { icon: "🎪", label: "Events" },
  { icon: "🪂", label: "Airdrops" },
];

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden">
      <section className="relative flex w-full flex-col items-center px-6 pb-20 pt-24 text-center">
        <div className="bg-hero-glow absolute inset-0 -z-10" />
        <div className="animate-fade-in flex flex-col items-center gap-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-monad-purple">
            HumanPass on Monad
          </p>
          <h1 className="glow-text max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            HumanPass is a proof-of-human session layer for consumer apps on
            Monad.
          </h1>
          <p className="max-w-xl text-lg text-text-secondary">
            Verify that real users — not bots — are taking sensitive actions.
            Lightweight, temporary, and privacy-first.
          </p>
          <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
            <WalletConnect />
            <Link href="/verify" className="btn-primary">
              Get your HumanPass
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full max-w-4xl px-6 py-20">
        <div className="animate-slide-up flex flex-col items-center gap-6 text-center">
          <h2 className="text-3xl font-bold text-text-primary">
            Consumer apps are drowning in bots
          </h2>
          <p className="max-w-2xl text-text-secondary">
            AI agents, fake accounts, and automated scripts flood games, voting
            systems, reward programs, and social platforms. They distort
            leaderboards, manipulate governance, and drain resources meant for
            real people. Existing solutions force users into invasive checks or
            permanent identity records.
          </p>
        </div>
      </section>

      <section className="w-full max-w-5xl px-6 py-20">
        <h2 className="mb-14 text-center text-3xl font-bold text-text-primary">
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
              <h3 className="text-lg font-semibold text-text-primary">
                {step.title}
              </h3>
              <p className="text-sm text-text-secondary">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full max-w-4xl px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-text-primary">
          Built for consumer apps
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {USE_CASES.map((uc) => (
            <div
              key={uc.label}
              className="card-base bg-card-shine animate-fade-in flex flex-col items-center gap-2 py-8 text-center transition-transform hover:-translate-y-1"
            >
              <span className="text-3xl" aria-hidden="true">
                {uc.icon}
              </span>
              <span className="text-sm font-medium text-text-primary">
                {uc.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full max-w-4xl px-6 py-20">
        <div className="card-base bg-card-shine animate-slide-up flex flex-col items-center gap-4 border-monad-purple/20 py-12 text-center">
          <span className="rounded-full border border-monad-cyan/30 bg-monad-cyan/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-monad-cyan">
            Privacy-first
          </span>
          <h2 className="text-2xl font-bold text-text-primary">
            Lightweight temporary human session proof
          </h2>
          <p className="max-w-lg text-text-secondary">
            No biometrics. No permanent identity. HumanPass issues short-lived
            on-chain proofs that expire after a set window — no persistent
            tracking, no personal data stored on-chain.
          </p>
        </div>
      </section>

      <section className="w-full max-w-4xl px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-text-primary">
          Try it now
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <Link
            href="/verify"
            className="card-base bg-card-shine animate-fade-in group flex flex-col items-center gap-3 py-10 text-center transition-transform hover:-translate-y-1"
          >
            <span className="text-3xl" aria-hidden="true">
              🛡️
            </span>
            <h3 className="text-lg font-semibold text-text-primary">
              Get your HumanPass
            </h3>
            <p className="text-sm text-text-secondary">
              Complete a challenge and receive your on-chain proof.
            </p>
            <span className="mt-2 text-sm font-semibold text-monad-purple transition-colors group-hover:text-monad-purple-light">
              Start verification →
            </span>
          </Link>

          <Link
            href="/vote"
            className="card-base bg-card-shine animate-fade-in group flex flex-col items-center gap-3 py-10 text-center transition-transform hover:-translate-y-1"
          >
            <span className="text-3xl" aria-hidden="true">
              🗳️
            </span>
            <h3 className="text-lg font-semibold text-text-primary">
              Try protected voting
            </h3>
            <p className="text-sm text-text-secondary">
              Cast a vote in a demo governance poll gated by HumanPass.
            </p>
            <span className="mt-2 text-sm font-semibold text-monad-purple transition-colors group-hover:text-monad-purple-light">
              Go to voting →
            </span>
          </Link>

          <Link
            href="/status"
            className="card-base bg-card-shine animate-fade-in group flex flex-col items-center gap-3 py-10 text-center transition-transform hover:-translate-y-1"
          >
            <span className="text-3xl" aria-hidden="true">
              🔍
            </span>
            <h3 className="text-lg font-semibold text-text-primary">
              Check proof status
            </h3>
            <p className="text-sm text-text-secondary">
              Look up any wallet&apos;s HumanPass verification state.
            </p>
            <span className="mt-2 text-sm font-semibold text-monad-purple transition-colors group-hover:text-monad-purple-light">
              Check status →
            </span>
          </Link>
        </div>
      </section>

      <section className="w-full max-w-4xl px-6 pb-24 pt-8">
        <div className="animate-fade-in rounded-xl border border-surface-border bg-surface-secondary px-8 py-10 text-center">
          <h2 className="text-xl font-bold text-text-primary">
            Integrate HumanPass into your app
          </h2>
          <p className="mt-3 max-w-lg mx-auto text-text-secondary">
            Any consumer app on Monad can check HumanPass proofs before allowing
            sensitive actions — voting, claiming rewards, joining events, and
            more. A single on-chain read tells your smart contract whether an
            address holds a valid proof.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-monad-purple/30 bg-monad-purple/10 px-4 py-2 text-sm font-medium text-monad-purple-light">
            <span aria-hidden="true">📖</span> Integration docs coming soon
          </div>
        </div>
      </section>

      <footer className="w-full border-t border-surface-border px-6 py-8 text-center text-sm text-text-muted">
        HumanPass — Proof-of-human session layer for consumer apps on Monad
      </footer>
    </main>
  );
}