"use client";

import { useEffect, useRef, useState } from "react";

type TypingPhase = "typing" | "modal";

type TypingPhraseChallengeProps = {
  phrase: string;
  onPass: (typedPhrase: string) => void;
};

function playMarchFanfare() {
  try {
    const ctx = new AudioContext();
    // Short comic march: C-E-G-G (quarter notes at 200bpm)
    const notes = [523, 659, 784, 784, 659, 523, 392, 523];
    const dur = 0.14;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "square";
      const t = ctx.currentTime + i * dur;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.85);
      osc.start(t);
      osc.stop(t + dur);
    });
  } catch {
    // AudioContext not available
  }
}

export function TypingPhraseChallenge({
  phrase,
  onPass,
}: TypingPhraseChallengeProps) {
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<TypingPhase>("typing");
  const [cameraGranted, setCameraGranted] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        setCameraGranted(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        setCameraError(true);
      });

    return () => stopCamera();
  }, []);

  const handleChange = (value: string) => {
    setTyped(value);
    if (value.trim().toLowerCase() === phrase.trim().toLowerCase()) {
      stopCamera();
      playMarchFanfare();
      setPhase("modal");
    }
  };

  const isMatch = typed.trim().toLowerCase() === phrase.trim().toLowerCase();

  if (phase === "modal") {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center animate-fade-in">
        {/* Satirical dictator parody — emoji only, no real photo */}
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-red-900/30 border-4 border-red-700/50 text-6xl select-none">
          👺
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-400">
            ☭ Diplomatic Situation Alert ☭
          </p>
          <h2 className="text-2xl font-black text-text-primary">
            Human detected.
          </h2>
          <h3 className="text-lg font-bold text-text-secondary">
            Diplomatic incident avoided... maybe.
          </h3>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4">
          <p className="text-sm font-semibold text-emerald-400">
            Not a bot. Definitely a brave human.
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Your courage has been noted by the HumanPass protocol.
          </p>
        </div>
        <button
          onClick={() => onPass(typed)}
          className="btn-primary"
        >
          Proceed to Proof Issuance →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-primary">Typing Challenge</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Type the phrase below exactly as shown.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Typing section */}
        <div className="flex-1 space-y-4">
          <div className="rounded-lg border border-monad-purple/30 bg-monad-purple/10 px-4 py-3">
            <p className="text-xs text-text-muted mb-1">Type this phrase:</p>
            <p className="font-mono text-sm font-semibold text-monad-purple-light break-all">
              {phrase}
            </p>
          </div>

          <div>
            <textarea
              value={typed}
              onChange={(e) => handleChange(e.target.value)}
              rows={2}
              placeholder="Start typing here..."
              className={`w-full resize-none rounded-lg border bg-surface-secondary px-4 py-3 font-mono text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:ring-1 ${
                typed.length > 0 && !isMatch
                  ? "border-error/50 focus:border-error focus:ring-error/30"
                  : isMatch
                    ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/30"
                    : "border-surface-border focus:border-monad-purple focus:ring-monad-purple/30"
              }`}
            />
            {typed.length > 0 && !isMatch && (
              <p className="mt-1 text-xs text-text-muted">
                {typed.length}/{phrase.length} characters
              </p>
            )}
          </div>
        </div>

        {/* Camera section */}
        <div className="flex w-full flex-col items-center gap-2 sm:w-40">
          <div className="relative overflow-hidden rounded-xl border border-surface-border bg-surface-secondary aspect-video w-full sm:aspect-square">
            {cameraGranted ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">
                {cameraError ? "🚫" : "📷"}
              </div>
            )}
          </div>
          <p className="text-center text-xs text-text-muted leading-tight">
            {cameraError
              ? "Camera denied — still works without it."
              : "Camera preview is local only and is not uploaded."}
          </p>
        </div>
      </div>
    </div>
  );
}
