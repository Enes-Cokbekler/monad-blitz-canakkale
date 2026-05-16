"use client";

import { useState } from "react";

type NumberSequenceChallengeProps = {
  numbers: number[];
  attempts: number;
  timeLeft: number;
  onPass: (clickedNumbers: number[]) => void;
  onFail: (reason: string) => void;
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSecs = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
}

export function NumberSequenceChallenge({
  numbers,
  attempts,
  timeLeft,
  onPass,
  onFail,
}: NumberSequenceChallengeProps) {
  const [clicked, setClicked] = useState<number[]>([]);
  const [sequenceError, setSequenceError] = useState(false);

  const handleClick = (num: number) => {
    const nextIndex = clicked.length;
    const expected = numbers[nextIndex];

    if (num !== expected) {
      const newAttempts = attempts + 1;
      setSequenceError(true);
      setClicked([]);
      if (newAttempts >= 3) {
        onFail("MAX_ATTEMPTS");
      }
      return;
    }

    setSequenceError(false);
    const newClicked = [...clicked, num];
    setClicked(newClicked);

    if (newClicked.length === numbers.length) {
      onPass(newClicked);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Click the numbers in order</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-muted">Attempt {attempts + 1}/3</span>
          <span className={`font-mono text-sm font-semibold ${timeLeft < 10000 ? "text-error" : "text-text-secondary"}`}>
            {formatCountdown(timeLeft)}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
          <span>{clicked.length}/{numbers.length} selected</span>
          <span>Order: {numbers.join(" → ")}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-monad-purple to-monad-cyan transition-all duration-300"
            style={{ width: `${(clicked.length / numbers.length) * 100}%` }}
          />
        </div>
      </div>

      {sequenceError && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-2 text-center text-sm text-error animate-fade-in">
          Wrong order. Try again.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {numbers.map((num, idx) => {
          const isClicked = clicked.includes(num);
          const isNext = !isClicked && clicked.length < numbers.length && numbers[clicked.length] === num;

          return (
            <button
              key={`${num}-${idx}`}
              onClick={() => handleClick(num)}
              disabled={isClicked}
              className={`flex h-16 items-center justify-center rounded-xl border-2 text-2xl font-bold transition-all duration-200 ${
                isClicked
                  ? "border-monad-cyan/50 bg-monad-cyan/20 text-monad-cyan scale-95"
                  : isNext
                    ? "border-monad-purple/50 bg-monad-purple/10 text-monad-purple-light hover:border-monad-purple hover:bg-monad-purple/20 hover:scale-105"
                    : "border-surface-border bg-surface-secondary text-text-primary hover:border-surface-border-light hover:bg-surface-card hover:scale-105"
              } disabled:cursor-not-allowed`}
            >
              {num}
            </button>
          );
        })}
      </div>

      {clicked.length > 0 && clicked.length < numbers.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => { setClicked([]); setSequenceError(false); }}
            className="text-sm text-text-muted transition-colors hover:text-text-secondary"
          >
            Reset sequence
          </button>
        </div>
      )}
    </div>
  );
}
