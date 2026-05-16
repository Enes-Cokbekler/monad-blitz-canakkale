"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type AttemptKind = "single_bot" | "swarm" | "human";

type Attempt = {
  id: number;
  kind: AttemptKind;
  agent: string;
  action: string;
  blocked: boolean;
  reason: string;
  count?: number;
  timestamp: number;
};

const SINGLE_BOTS = [
  "Bot Agent #104", "AI Agent GPT-4o", "Sybil Node #42", "Crawler Bot #7",
  "Bot Agent #88", "AI Agent #33", "Spam Bot #9", "Auto-Voter #12",
  "Reward Farmer #5", "Bot Agent #201",
];

const HUMAN_WALLETS = [
  "Verified Human 0x1a2b", "Verified Human 0x9f3c", "Verified Human 0x4e7d",
];

const BOT_ACTIONS = [
  "tried to vote",
  "tried to claim coffee coupon",
  "tried to join game",
  "tried to cast ballot",
  "tried to submit proposal",
  "tried to mint token",
  "tried to access airdrop",
];

const HUMAN_ACTIONS = [
  "voted successfully",
  "claimed coffee reward",
  "joined the game",
  "submitted proposal",
  "accessed airdrop",
];

const SWARM_ACTIONS = [
  "coffee coupon claims",
  "vote attempts",
  "airdrop grabs",
  "proposal submissions",
  "game joins",
];

const BLOCKED_REASONS = [
  "No HumanPass",
  "No HumanPass",
  "No HumanPass",
  "Proof expired",
  "Proof not found",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function generateAttempt(id: number): Attempt {
  const roll = Math.random();

  if (roll < 0.18) {
    return {
      id,
      kind: "human",
      agent: randomItem(HUMAN_WALLETS),
      action: randomItem(HUMAN_ACTIONS),
      blocked: false,
      reason: "Valid HumanPass",
      timestamp: Date.now(),
    };
  }

  if (roll < 0.30) {
    const count = randomInt(5, 50);
    return {
      id,
      kind: "swarm",
      agent: `Bot Swarm (${count} nodes)`,
      action: `attempted ${count} ${randomItem(SWARM_ACTIONS)}`,
      blocked: true,
      reason: `${count} blocked — No HumanPass`,
      count,
      timestamp: Date.now(),
    };
  }

  return {
    id,
    kind: "single_bot",
    agent: randomItem(SINGLE_BOTS),
    action: randomItem(BOT_ACTIONS),
    blocked: true,
    reason: randomItem(BLOCKED_REASONS),
    timestamp: Date.now(),
  };
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function SimulatorPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [counters, setCounters] = useState({
    total: 0,
    blocked: 0,
    accepted: 0,
    protectedActions: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idRef = useRef(1);

  const protectionRate =
    counters.total > 0 ? Math.round((counters.blocked / counters.total) * 100) : 0;

  const addAttempt = () => {
    const attempt = generateAttempt(idRef.current++);
    setAttempts((prev) => [attempt, ...prev].slice(0, 25));
    setCounters((prev) => ({
      total: prev.total + 1,
      blocked: prev.blocked + (attempt.blocked ? 1 : 0),
      accepted: prev.accepted + (!attempt.blocked ? 1 : 0),
      protectedActions: prev.protectedActions + (!attempt.blocked ? 1 : 0),
    }));
  };

  const start = () => {
    setIsRunning(true);
    addAttempt();
    intervalRef.current = setInterval(addAttempt, 750);
  };

  const stop = () => {
    setIsRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const reset = () => {
    stop();
    setAttempts([]);
    setCounters({ total: 0, blocked: 0, accepted: 0, protectedActions: 0 });
    idRef.current = 1;
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
            <span className={`h-2 w-2 rounded-full ${isRunning ? "animate-pulse bg-red-400" : "bg-red-600"}`} />
            {isRunning ? "LIVE ATTACK SIMULATION" : "BOT ATTACK SIMULATOR"}
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Bot Attack Simulator</h1>
          <p className="mt-1 text-text-secondary">
            AI agents, bots, and sybil swarms hit HumanPass in real time. Every unverified request is blocked at the protocol layer.
          </p>
        </div>

        {/* Counters */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="card-base bg-card-shine text-center">
            <p className="text-2xl font-black text-text-primary">{counters.total}</p>
            <p className="mt-1 text-xs text-text-muted">Total Attempts</p>
          </div>
          <div className="card-base bg-card-shine text-center">
            <p className="text-2xl font-black text-red-400">{counters.blocked}</p>
            <p className="mt-1 text-xs text-text-muted">Bots Blocked</p>
          </div>
          <div className="card-base bg-card-shine text-center">
            <p className="text-2xl font-black text-emerald-400">{counters.accepted}</p>
            <p className="mt-1 text-xs text-text-muted">Humans Accepted</p>
          </div>
          <div className="card-base bg-card-shine text-center">
            <p className="text-2xl font-black text-monad-cyan">{counters.protectedActions}</p>
            <p className="mt-1 text-xs text-text-muted">Protected Actions</p>
          </div>
          <div className="card-base bg-card-shine col-span-2 sm:col-span-1 text-center">
            <p className={`text-2xl font-black ${protectionRate >= 80 ? "text-emerald-400" : protectionRate >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {protectionRate}%
            </p>
            <p className="mt-1 text-xs text-text-muted">Protection Rate</p>
          </div>
        </div>

        {/* Protection bar */}
        {counters.total > 0 && (
          <div className="mb-6">
            <div className="mb-1 flex justify-between text-xs text-text-muted">
              <span>{counters.blocked} blocked</span>
              <span>{counters.accepted} accepted</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-emerald-500/20">
              <div
                className="h-full rounded-full bg-red-500/80 transition-all duration-500"
                style={{ width: `${(counters.blocked / counters.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-3">
          {!isRunning ? (
            <button onClick={start} className="btn-primary">
              ▶ Start Simulation
            </button>
          ) : (
            <button onClick={stop} className="btn-secondary">
              ■ Pause
            </button>
          )}
          <button onClick={reset} className="btn-secondary">Reset</button>
          <Link href="/verify" className="btn-secondary">Get HumanPass →</Link>
        </div>

        {/* Live feed */}
        <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card">
          <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
            <h2 className="text-sm font-semibold text-text-primary">Live Access Log</h2>
            {isRunning && (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                LIVE
              </span>
            )}
          </div>

          {attempts.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="text-5xl">🤖</span>
              <p className="text-text-secondary">Hit &ldquo;Start Simulation&rdquo; to watch bots get blocked.</p>
              <p className="text-xs text-text-muted">Simulates bots, swarms, and verified humans in real time.</p>
            </div>
          )}

          <ul className="divide-y divide-surface-border">
            {attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex items-start gap-3 px-6 py-3 animate-fade-in"
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    attempt.blocked ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {attempt.blocked ? "✕" : "✓"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary leading-snug">
                    <span className={`font-semibold ${
                      attempt.kind === "swarm" ? "text-orange-400" :
                      attempt.kind === "human" ? "text-emerald-400" :
                      "text-text-primary"
                    }`}>
                      {attempt.agent}
                    </span>{" "}
                    <span className="text-text-secondary">{attempt.action}</span>
                  </p>
                  <p className={`text-xs font-semibold ${attempt.blocked ? "text-red-400" : "text-emerald-400"}`}>
                    {attempt.blocked ? `Blocked: ${attempt.reason}` : `Accepted: ${attempt.reason}`}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-text-muted">
                  {formatTime(attempt.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Value prop */}
        <div className="mt-8 rounded-xl border border-monad-purple/30 bg-monad-purple/10 p-6">
          <h3 className="mb-2 font-bold text-monad-purple-light">One layer. Every app on Monad.</h3>
          <p className="text-sm text-text-secondary">
            Bots, AI agents, and sybil swarms are blocked at the gate — no HumanPass proof, no action.
            Verified humans pass through seamlessly. Any consumer app on Monad integrates the same protection with one function call.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/developers" className="btn-primary text-sm">Integrate HumanPass →</Link>
            <Link href="/vote" className="btn-secondary text-sm">See Vote Demo</Link>
            <Link href="/rewards" className="btn-secondary text-sm">See Rewards Demo</Link>
            <Link href="/demo" className="btn-secondary text-sm">60-Second Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
