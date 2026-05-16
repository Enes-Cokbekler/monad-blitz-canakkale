"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const DEMO_STEPS = [
  {
    id: "problem",
    label: "01 · The Problem",
    title: "AI agents are flooding the internet.",
    body: "Bots, sybil nodes, and AI agents attempt to vote, claim rewards, and manipulate governance — millions of requests per day. Existing apps have no lightweight, privacy-first way to gate access for real humans.",
    icon: "🤖",
    color: "red",
  },
  {
    id: "blocked",
    label: "02 · Bot Blocked",
    title: "Without HumanPass, bots get through.",
    body: "Any wallet can call your contract. Without a human signal, your reward pool, your vote, your airdrop — all are fair game for automation.",
    icon: "🚫",
    color: "orange",
  },
  {
    id: "verified",
    label: "03 · Human Verified",
    title: "HumanPass gates the action.",
    body: "The user completes a short human-signal challenge — reaction, sequence, or a question only a human cares about. A signed wallet message proves ownership. The backend issues an on-chain proof.",
    icon: "✅",
    color: "emerald",
  },
  {
    id: "proof",
    label: "04 · Proof On-Chain",
    title: "The proof lives on Monad.",
    body: "A short-lived HumanPass proof is recorded on Monad Testnet. It is portable across every app on the network. Any contract can verify it with a single read: isHuman(address).",
    icon: "⛓️",
    color: "purple",
  },
  {
    id: "dev",
    label: "05 · Developer Layer",
    title: "Any app integrates in one line.",
    body: "Smart contracts add the onlyHuman modifier. Frontend apps call useHumanPass(). The user only verifies once — every integrated app benefits from the same on-chain proof.",
    icon: "🔧",
    color: "cyan",
  },
] as const;

type DemoStep = (typeof DEMO_STEPS)[number];

const BOT_LOG = [
  { agent: "Bot Agent #104", action: "tried to vote", blocked: true, reason: "No HumanPass" },
  { agent: "AI Agent GPT-4o", action: "tried to claim reward", blocked: true, reason: "No HumanPass" },
  { agent: "Sybil Node #7", action: "tried to join airdrop", blocked: true, reason: "Proof not found" },
  { agent: "Verified Human 0x1a2b", action: "completed challenge", blocked: false, reason: "Valid HumanPass" },
  { agent: "Bot Swarm (20 nodes)", action: "tried reward claims", blocked: true, reason: "No HumanPass" },
  { agent: "AI Agent #33", action: "tried to submit proposal", blocked: true, reason: "No HumanPass" },
  { agent: "Verified Human 0x9f3c", action: "cast ballot", blocked: false, reason: "Valid HumanPass" },
];

const STEP_DURATION_MS = 12_000;
const TOTAL_DURATION_MS = STEP_DURATION_MS * DEMO_STEPS.length;

function ColorDot({ color }: { color: DemoStep["color"] }) {
  const cls =
    color === "red" ? "bg-red-500" :
    color === "orange" ? "bg-orange-400" :
    color === "emerald" ? "bg-emerald-400" :
    color === "purple" ? "bg-monad-purple" :
    "bg-monad-cyan";
  return <span className={`h-2 w-2 rounded-full ${cls}`} />;
}

function StepBorder({ color }: { color: DemoStep["color"] }) {
  const cls =
    color === "red" ? "border-red-500/40 bg-red-500/5" :
    color === "orange" ? "border-orange-400/40 bg-orange-400/5" :
    color === "emerald" ? "border-emerald-400/40 bg-emerald-400/5" :
    color === "purple" ? "border-monad-purple/40 bg-monad-purple/5" :
    "border-monad-cyan/40 bg-monad-cyan/5";
  return cls;
}

function TimerBar({ progress }: { progress: number }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-surface-secondary">
      <div
        className="h-full rounded-full bg-gradient-to-r from-monad-purple to-monad-cyan transition-all duration-500"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

export default function DemoPage() {
  const [guideActive, setGuideActive] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [visibleLog, setVisibleLog] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const stopGuide = useCallback(() => {
    setGuideActive(false);
    setActiveStep(0);
    setElapsed(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (logIntervalRef.current) clearInterval(logIntervalRef.current);
  }, []);

  const startGuide = useCallback(() => {
    setGuideActive(true);
    setActiveStep(0);
    setElapsed(0);
    setVisibleLog(0);
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const ms = Date.now() - startTime;
      setElapsed(ms);

      const step = Math.min(Math.floor(ms / STEP_DURATION_MS), DEMO_STEPS.length - 1);
      setActiveStep(step);

      if (stepRefs.current[step]) {
        stepRefs.current[step]!.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (ms >= TOTAL_DURATION_MS) {
        stopGuide();
      }
    }, 250);

    logIntervalRef.current = setInterval(() => {
      setVisibleLog((n) => Math.min(n + 1, BOT_LOG.length));
    }, 1_800);
  }, [stopGuide]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
    };
  }, []);

  const progress = Math.min(elapsed / TOTAL_DURATION_MS, 1);
  const remainingSeconds = Math.max(
    Math.ceil((TOTAL_DURATION_MS - elapsed) / 1000),
    0
  );

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-monad-purple/30 bg-monad-purple/10 px-3 py-1 text-xs font-semibold text-monad-purple-light">
            JUDGE DEMO
          </div>
          <h1 className="glow-text text-4xl font-black tracking-tight sm:text-5xl">
            60-Second Demo
          </h1>
          <p className="mt-3 text-lg text-text-secondary">
            HumanPass: short-lived proof-of-human sessions for consumer apps on Monad.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {!guideActive ? (
              <button onClick={startGuide} className="btn-primary text-base px-6 py-3">
                ▶ Start 60-second demo
              </button>
            ) : (
              <button onClick={stopGuide} className="btn-secondary">
                ■ Stop
              </button>
            )}
            <Link href="/simulator" className="btn-secondary">
              Bot Simulator →
            </Link>
            <Link href="/verify" className="btn-secondary">
              Verify Now →
            </Link>
          </div>

          {guideActive && (
            <div className="mt-6 space-y-2">
              <TimerBar progress={progress} />
              <p className="text-xs text-text-muted">
                {remainingSeconds}s remaining · Step {activeStep + 1}/{DEMO_STEPS.length}
              </p>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {DEMO_STEPS.map((step, i) => {
            const isActive = guideActive && activeStep === i;
            return (
              <div
                key={step.id}
                ref={(el) => { stepRefs.current[i] = el; }}
                className={`rounded-xl border-2 p-6 transition-all duration-500 ${
                  isActive
                    ? StepBorder(step) + " scale-[1.01] shadow-lg"
                    : "border-surface-border bg-surface-card opacity-80"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-surface-secondary text-2xl">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <ColorDot color={step.color} />
                      <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                        {step.label}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-monad-purple/20 px-2 py-0.5 text-xs font-semibold text-monad-purple-light animate-pulse">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-text-primary">{step.title}</h2>
                    <p className="mt-1 text-sm text-text-secondary">{step.body}</p>

                    {/* Step-specific content */}
                    {step.id === "blocked" && (
                      <div className="mt-4 overflow-hidden rounded-lg border border-surface-border bg-surface-secondary">
                        <div className="border-b border-surface-border px-4 py-2 text-xs font-semibold text-text-muted">
                          Access Log — Without HumanPass
                        </div>
                        <ul className="divide-y divide-surface-border">
                          {[
                            { agent: "Bot Agent #1", action: "tried to vote", result: "ACCEPTED ✓ (no protection)" },
                            { agent: "Sybil Node #7", action: "claimed reward", result: "ACCEPTED ✓ (no protection)" },
                            { agent: "AI Agent GPT-4o", action: "submitted proposal", result: "ACCEPTED ✓ (no protection)" },
                          ].map((row, j) => (
                            <li key={j} className="flex items-center justify-between px-4 py-2 text-xs">
                              <span className="text-text-secondary">
                                <span className="font-semibold text-text-primary">{row.agent}</span> {row.action}
                              </span>
                              <span className="font-semibold text-orange-400">{row.result}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {step.id === "verified" && (
                      <div className="mt-4 overflow-hidden rounded-lg border border-surface-border bg-surface-secondary">
                        <div className="border-b border-surface-border px-4 py-2 text-xs font-semibold text-text-muted">
                          Access Log — With HumanPass
                        </div>
                        <ul className="divide-y divide-surface-border">
                          {BOT_LOG.slice(0, Math.max(visibleLog, guideActive ? 0 : BOT_LOG.length)).map((row, j) => (
                            <li key={j} className={`flex items-center justify-between px-4 py-2 text-xs ${guideActive ? "animate-fade-in" : ""}`}>
                              <span className="text-text-secondary">
                                <span className="font-semibold text-text-primary">{row.agent}</span> {row.action}
                              </span>
                              <span className={`font-semibold ${row.blocked ? "text-red-400" : "text-emerald-400"}`}>
                                {row.blocked ? `Blocked: ${row.reason}` : `Accepted: ${row.reason}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {step.id === "proof" && (
                      <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">✓</div>
                          <div>
                            <p className="text-sm font-bold text-text-primary">Verified Human</p>
                            <p className="text-xs text-emerald-400">Active proof on-chain</p>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between"><span className="text-text-muted">Network</span><span className="rounded-full bg-monad-purple/20 px-2 py-0.5 text-xs font-semibold text-monad-purple-light">Monad Testnet</span></div>
                          <div className="flex justify-between"><span className="text-text-muted">Wallet</span><span className="font-mono text-text-primary">0x1a2b...3c4d</span></div>
                          <div className="flex justify-between"><span className="text-text-muted">Expires</span><span className="font-semibold text-emerald-400">9m 59s remaining</span></div>
                          <div className="flex justify-between"><span className="text-text-muted">Contract</span><span className="font-mono text-text-secondary">0xABCD...1234</span></div>
                        </div>
                        <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-secondary">
                          <div className="h-full w-full rounded-full bg-gradient-to-r from-monad-purple to-monad-cyan" />
                        </div>
                      </div>
                    )}

                    {step.id === "dev" && (
                      <pre className="mt-4 overflow-x-auto rounded-lg border border-surface-border bg-surface-secondary px-4 py-3 text-xs leading-relaxed text-text-primary">
{`// Solidity
modifier onlyHuman() {
  require(humanPass.isHuman(msg.sender), "No HumanPass");
  _;
}

// TypeScript
const isHuman = await humanpass.isHuman(address);
if (!isHuman) redirect("/verify");
allowProtectedAction();

// React
const { isHuman, expiresAt } = useHumanPass(address);`}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Why Monad */}
        <div className="mt-10 rounded-xl border border-monad-purple/30 bg-monad-purple/5 p-8">
          <h2 className="mb-5 text-xl font-bold text-text-primary">Why Monad?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: "🔗", title: "Portable proofs", body: "A HumanPass proof issued once is valid across every app on Monad. No per-app re-verification." },
              { icon: "⚡", title: "Consumer-grade speed", body: "Monad's high throughput means proof issuance completes in seconds, not minutes — invisible to the end user." },
              { icon: "🏗️", title: "EVM-compatible", body: "Any EVM contract integrates with one interface import and one function call. No new tooling." },
              { icon: "🔓", title: "Not locked to one backend", body: "The proof lives on-chain. Any app reads it directly from Monad — no HumanPass backend dependency after issuance." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-semibold text-text-primary">{item.title}</p>
                  <p className="text-sm text-text-secondary">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { href: "/verify", icon: "🛡️", label: "Get HumanPass", sub: "Complete a challenge, get proof" },
            { href: "/simulator", icon: "🤖", label: "Bot Simulator", sub: "Watch bots get blocked live" },
            { href: "/developers", icon: "🔧", label: "Developer Docs", sub: "Integrate in any app" },
          ].map((cta) => (
            <Link
              key={cta.href}
              href={cta.href}
              className="card-base bg-card-shine group flex flex-col items-center gap-2 py-8 text-center transition-transform hover:-translate-y-1"
            >
              <span className="text-3xl">{cta.icon}</span>
              <p className="font-bold text-text-primary">{cta.label}</p>
              <p className="text-xs text-text-secondary">{cta.sub}</p>
              <span className="text-xs font-semibold text-monad-purple transition-colors group-hover:text-monad-purple-light">
                Go →
              </span>
            </Link>
          ))}
        </div>

        {/* Positioning disclaimer */}
        <div className="mt-8 rounded-lg border border-surface-border bg-surface-secondary px-6 py-4 text-xs text-text-muted">
          <p><span className="font-semibold text-text-secondary">What HumanPass is:</span> A short-lived proof-of-human session layer for consumer apps on Monad. A user cannot perform sensitive actions until they complete a human challenge and receive an active on-chain proof.</p>
          <p className="mt-1"><span className="font-semibold text-text-secondary">What HumanPass is not:</span> A global identity system. Perfect bot detection. Biometrics or persistent personal data.</p>
        </div>
      </div>
    </main>
  );
}
