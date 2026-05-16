"use client";

import { useEffect, useRef, useState } from "react";

type ReactionPhase = "waiting" | "ready" | "too_early" | "passed";

type ReactionChallengeProps = {
  delayMs: number;
  windowMs: number;
  onPass: (clickedAt: number) => void;
  onFail: (reason: string) => void;
};

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // AudioContext not available (SSR/test)
  }
}

export function ReactionChallenge({
  delayMs,
  windowMs,
  onPass,
  onFail,
}: ReactionChallengeProps) {
  const [phase, setPhase] = useState<ReactionPhase>("waiting");
  const [dotCount, setDotCount] = useState(1);
  const windowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passedRef = useRef(false);

  // Waiting animation dots
  useEffect(() => {
    if (phase !== "waiting") return;
    const id = setInterval(() => setDotCount((n) => (n % 3) + 1), 500);
    return () => clearInterval(id);
  }, [phase]);

  // Trigger "ready" after delay
  useEffect(() => {
    const id = setTimeout(() => {
      setPhase("ready");
      playBeep();

      // Auto-fail if window expires
      windowTimerRef.current = setTimeout(() => {
        if (!passedRef.current) {
          onFail("TOO_LATE");
        }
      }, windowMs + 500);
    }, delayMs);

    return () => {
      clearTimeout(id);
      if (windowTimerRef.current) clearTimeout(windowTimerRef.current);
    };
  }, [delayMs, windowMs, onFail]);

  const handleClick = () => {
    if (phase === "waiting") {
      setPhase("too_early");
      if (windowTimerRef.current) clearTimeout(windowTimerRef.current);
      onFail("TOO_EARLY");
      return;
    }

    if (phase === "ready") {
      passedRef.current = true;
      if (windowTimerRef.current) clearTimeout(windowTimerRef.current);
      setPhase("passed");
      onPass(Date.now());
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="text-center">
        <h2 className="mb-2 text-lg font-bold text-text-primary">Reaction Challenge</h2>
        <p className="text-sm text-text-secondary">
          Wait for the signal, then click as fast as you can.
        </p>
      </div>

      <button
        onClick={handleClick}
        disabled={phase === "too_early" || phase === "passed"}
        className={`flex h-48 w-48 flex-col items-center justify-center rounded-full border-4 text-center transition-all duration-150 ${
          phase === "waiting"
            ? "border-surface-border bg-surface-secondary text-text-muted hover:border-surface-border-light cursor-pointer"
            : phase === "ready"
              ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 scale-110 cursor-pointer animate-pulse"
              : phase === "too_early"
                ? "border-red-500/50 bg-red-500/10 text-red-400 cursor-not-allowed"
                : "border-monad-cyan/50 bg-monad-cyan/10 text-monad-cyan cursor-not-allowed"
        }`}
      >
        {phase === "waiting" && (
          <>
            <span className="text-4xl">⏳</span>
            <span className="mt-2 text-lg font-bold">Wait{"." .repeat(dotCount)}</span>
          </>
        )}
        {phase === "ready" && (
          <>
            <span className="text-4xl">⚡</span>
            <span className="mt-2 text-2xl font-black text-emerald-300">CLICK NOW!</span>
          </>
        )}
        {phase === "too_early" && (
          <>
            <span className="text-4xl">❌</span>
            <span className="mt-2 text-lg font-bold text-red-400">Too early!</span>
          </>
        )}
        {phase === "passed" && (
          <>
            <span className="text-4xl">✓</span>
            <span className="mt-2 text-lg font-bold text-monad-cyan">Nice reflexes!</span>
          </>
        )}
      </button>

      {phase === "waiting" && (
        <p className="text-xs text-text-muted">Do not click yet — wait for the green signal.</p>
      )}
      {phase === "ready" && (
        <p className="text-xs text-emerald-400 font-semibold">Click the button now!</p>
      )}
    </div>
  );
}
