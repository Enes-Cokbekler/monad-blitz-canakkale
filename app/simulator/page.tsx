"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type AttemptStatus = "blocked" | "accepted" | "pending";

type Attempt = {
  id: number;
  agent: string;
  action: string;
  status: AttemptStatus;
  reason: string;
  timestamp: number;
};

const BOT_AGENTS = [
  "Bot Agent #1",
  "Bot Agent #2",
  "Bot Agent #3",
  "AI Agent GPT-4o",
  "Crawler Bot #7",
  "Sybil Node #42",
  "Bot Agent #5",
  "AI Agent Claude",
  "Spam Bot #9",
  "Bot Agent #11",
];

const HUMAN_AGENTS = [
  "Verified Human 0x1a2b",
  "Verified Human 0x9f3c",
  "Verified Human 0x4e7d",
];

const PROTECTED_ACTIONS = [
  "tried to vote",
  "tried to claim reward",
  "tried to join game",
  "tried to mint token",
  "tried to cast ballot",
  "tried to submit proposal",
];

const BLOCKED_REASONS = [
  "No HumanPass",
  "No HumanPass",
  "Proof expired",
  "No HumanPass",
  "Proof not found",
];

function generateAttempt(id: number): Attempt {
  const isHuman = Math.random() < 0.2;

  if (isHuman) {
    const agent = HUMAN_AGENTS[Math.floor(Math.random() * HUMAN_AGENTS.length)];
    const action = PROTECTED_ACTIONS[Math.floor(Math.random() * PROTECTED_ACTIONS.length)];
    return {
      id,
      agent,
      action,
      status: "accepted",
      reason: "Valid HumanPass",
      timestamp: Date.now(),
    };
  }

  const agent = BOT_AGENTS[Math.floor(Math.random() * BOT_AGENTS.length)];
  const action = PROTECTED_ACTIONS[Math.floor(Math.random() * PROTECTED_ACTIONS.length)];
  const reason = BLOCKED_REASONS[Math.floor(Math.random() * BLOCKED_REASONS.length)];

  return {
    id,
    agent,
    action,
    status: "blocked",
    reason,
    timestamp: Date.now(),
  };
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function SimulatorPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [counters, setCounters] = useState({
    total: 0,
    blocked: 0,
    accepted: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idRef = useRef(1);

  const protectionRate =
    counters.total > 0 ? Math.round((counters.blocked / counters.total) * 100) : 0;

  const addAttempt = () => {
    const attempt = generateAttempt(idRef.current++);
    setAttempts((prev) => [attempt, ...prev].slice(0, 20));
    setCounters((prev) => ({
      total: prev.total + 1,
      blocked: prev.blocked + (attempt.status === "blocked" ? 1 : 0),
      accepted: prev.accepted + (attempt.status === "accepted" ? 1 : 0),
    }));
  };

  const start = () => {
    setIsRunning(true);
    addAttempt();
    intervalRef.current = setInterval(addAttempt, 900);
  };

  const stop = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const reset = () => {
    stop();
    setAttempts([]);
    setCounters({ total: 0, blocked: 0, accepted: 0 });
    idRef.current = 1;
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
      <div className="w-full max-w-4xl">
        <div className="mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
            <span className={`h-2 w-2 rounded-full ${isRunning ? "animate-pulse bg-red-400" : "bg-red-600"}`} />
            {isRunning ? "LIVE ATTACK" : "SIMULATOR"}
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Bot Attack Simulator</h1>
          <p className="mt-1 text-text-secondary">
            Watch AI agents and bots attempt to bypass protection in real time. HumanPass blocks every unverified request.
          </p>
        </div>

        {/* Counters */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            <p className="text-2xl font-black text-monad-purple-light">
              {protectionRate}%
            </p>
            <p className="mt-1 text-xs text-text-muted">Protection Rate</p>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-3">
          {!isRunning ? (
            <button onClick={start} className="btn-primary">
              <span className="mr-2">▶</span> Start Simulation
            </button>
          ) : (
            <button onClick={stop} className="btn-secondary">
              <span className="mr-2">■</span> Pause
            </button>
          )}
          <button onClick={reset} className="btn-secondary">
            Reset
          </button>
          <Link href="/verify" className="btn-secondary">
            Get HumanPass →
          </Link>
        </div>

        {/* Live feed */}
        <div className="card-base bg-card-shine p-0 overflow-hidden">
          <div className="border-b border-surface-border px-6 py-4">
            <h2 className="text-sm font-semibold text-text-primary">Live Access Log</h2>
          </div>

          {attempts.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="text-4xl">🤖</span>
              <p className="text-text-secondary">Hit &ldquo;Start Simulation&rdquo; to watch bots get blocked.</p>
            </div>
          )}

          <ul className="divide-y divide-surface-border">
            {attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex items-start gap-4 px-6 py-4 animate-fade-in"
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    attempt.status === "blocked"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {attempt.status === "blocked" ? "✕" : "✓"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary">
                    <span className="font-semibold">{attempt.agent}</span>{" "}
                    <span className="text-text-secondary">{attempt.action}</span>
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      attempt.status === "blocked" ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {attempt.status === "blocked" ? `Blocked: ${attempt.reason}` : `Accepted: ${attempt.reason}`}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-text-muted font-mono">
                  {formatTime(attempt.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Value prop */}
        <div className="mt-8 rounded-xl border border-monad-purple/30 bg-monad-purple/10 p-6">
          <h3 className="mb-2 font-bold text-monad-purple-light">Why HumanPass?</h3>
          <p className="text-sm text-text-secondary">
            Every bot, AI agent, and sybil node is blocked at the gate — no HumanPass, no action.
            Only wallets with an on-chain human proof issued by HumanPass can perform protected actions.
            One verification layer protects every consumer app on Monad.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/developers" className="btn-primary text-sm">
              Integrate HumanPass →
            </Link>
            <Link href="/vote" className="btn-secondary text-sm">
              See Vote Demo
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
