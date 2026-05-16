"use client";

import { useState } from "react";

type FunnyQuestionChallengeProps = {
  question: string;
  options: string[];
  onPass: (selectedAnswer: number) => void;
};

const OPTION_LABELS = ["A", "B", "C", "D"];

export function FunnyQuestionChallenge({
  question,
  options,
  onPass,
}: FunnyQuestionChallengeProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    // Give a moment for the UI to show selection before proceeding
    setTimeout(() => onPass(index), 350);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-primary">Human Signal Question</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Only a real human would know this.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-monad-purple/30 bg-monad-purple/10 p-5">
        <p className="text-base font-semibold text-text-primary leading-snug">
          {question}
        </p>
      </div>

      <div className="grid gap-3">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={selected !== null}
            className={`flex items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
              selected === null
                ? "border-surface-border bg-surface-secondary text-text-primary hover:border-monad-purple/50 hover:bg-monad-purple/10 hover:text-monad-purple-light cursor-pointer"
                : selected === index
                  ? "border-monad-purple bg-monad-purple/20 text-monad-purple-light scale-[0.98]"
                  : "border-surface-border bg-surface-secondary text-text-muted opacity-50 cursor-not-allowed"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black transition-colors ${
                selected === index
                  ? "border-monad-purple bg-monad-purple text-white"
                  : "border-surface-border text-text-muted"
              }`}
            >
              {OPTION_LABELS[index]}
            </span>
            <span className="text-sm font-medium">{option}</span>
          </button>
        ))}
      </div>

      {selected === null && (
        <p className="mt-4 text-center text-xs text-text-muted">
          Choose the most human answer.
        </p>
      )}
    </div>
  );
}
