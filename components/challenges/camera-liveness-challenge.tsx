"use client";

import React, { useEffect, useRef, useState } from "react";

type CameraLivenessChallengeProps = {
  onPass: () => void;
  onFail: (reason: string) => void;
};

const allChallenges = [
  { id: "blink", text: "👁️ Look at the camera and BLINK 2 times", type: "blink" as const },
  { id: "left", text: "⬅️ Turn your head LEFT and hold", type: "gesture" as const, keywords: ["left"] },
  { id: "right", text: "➡️ Turn your head RIGHT and hold", type: "gesture" as const, keywords: ["right"] },
  { id: "up", text: "⬆️ Look UP with your head and hold", type: "gesture" as const, keywords: ["up"] },
];

const GESTURE_COOLDOWN = 1200;
const REQUIRED_HOLD_MS = 2000;

export function CameraLivenessChallenge({ onPass, onFail }: CameraLivenessChallengeProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isTransitioningRef = useRef(false);
  const lastBlinkTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const challengesRef = useRef<typeof allChallenges>([]);
  const isVerifiedRef = useRef(false);
  const humanRef = useRef<unknown>(null);
  const challengeStartTimeRef = useRef(0);
  const poseHoldStartRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState("Loading AI models…");
  const [liveGestures, setLiveGestures] = useState("Searching…");
  const [currentStep, setCurrentStep] = useState(0);
  const [blinkCount, setBlinkCount] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const nextChallengeRef = useRef(() => {});

  nextChallengeRef.current = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setTimeout(() => {
      const nextIdx = currentStepRef.current + 1;
      if (nextIdx >= 3) {
        isVerifiedRef.current = true;
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        onPass();
      } else {
        currentStepRef.current = nextIdx;
        setCurrentStep(nextIdx);
        setBlinkCount(0);
        setHoldProgress(0);
        lastBlinkTimeRef.current = 0;
        poseHoldStartRef.current = 0;
        challengeStartTimeRef.current = Date.now();
        isTransitioningRef.current = false;
      }
    }, 700);
  };

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;

    const getAngle = (face: unknown) => {
      const f = face as Record<string, unknown> | undefined;
      if (f?.rotation && (f.rotation as Record<string, unknown>).angle) {
        return (f.rotation as Record<string, unknown>).angle as Record<string, number>;
      }
      if (f?.angle) return f.angle as Record<string, number>;
      return null;
    };

    const checkHeadDirection = (result: unknown, keywords: string[]) => {
      const res = result as { face?: Array<Record<string, unknown>> };
      const face = res?.face?.[0];
      if (!face) return false;
      const angle = getAngle(face);
      if (!angle) return false;

      const pitch = angle.pitch ?? 0;
      const yaw = angle.yaw ?? 0;
      const THRESHOLD = 0.2;

      if (keywords.includes("up") && pitch < -THRESHOLD) return true;
      if (keywords.includes("down") && pitch > THRESHOLD) return true;
      if (keywords.includes("left") && yaw < -THRESHOLD) return true;
      if (keywords.includes("right") && yaw > THRESHOLD) return true;

      return false;
    };

    const detectionLoop = async () => {
      if (!videoRef.current || isVerifiedRef.current) return;
      if (isTransitioningRef.current) {
        rafId = requestAnimationFrame(detectionLoop);
        return;
      }

      try {
        const human = humanRef.current as { detect: (video: HTMLVideoElement) => Promise<unknown> } | null;
        if (!human) {
          rafId = requestAnimationFrame(detectionLoop);
          return;
        }

        const result = await human.detect(videoRef.current);

        const activeChallenge = challengesRef.current[currentStepRef.current];
        if (!activeChallenge) {
          rafId = requestAnimationFrame(detectionLoop);
          return;
        }

        const res = result as {
          gesture?: Array<{ gesture: string }>;
          face?: Array<Record<string, unknown>>;
        };
        const gestures = res?.gesture?.map((g) => g.gesture) || [];
        const face = res?.face?.[0];
        const angle = getAngle(face);
        const pitchDeg = angle ? (angle.pitch * 57.3).toFixed(1) : "N/A";
        const yawDeg = angle ? (angle.yaw * 57.3).toFixed(1) : "N/A";

        const msSinceStart = Date.now() - challengeStartTimeRef.current;
        const inCooldown = msSinceStart < GESTURE_COOLDOWN;
        const cooldownLeft = inCooldown ? ((GESTURE_COOLDOWN - msSinceStart) / 1000).toFixed(1) : null;

        let holdInfo = "";
        if (activeChallenge?.type === "gesture" && poseHoldStartRef.current > 0) {
          const held = ((Date.now() - poseHoldStartRef.current) / 1000).toFixed(1);
          holdInfo = ` | hold:${held}s`;
        }

        setLiveGestures(
          `${gestures.join(", ") || "none"} | pitch:${pitchDeg}° yaw:${yawDeg}°` +
            (inCooldown ? ` | ⏳ ${cooldownLeft}s` : "") +
            holdInfo
        );

        const now = Date.now();

        if (activeChallenge.type === "blink") {
          const hasBlink = gestures.some((g) => g.includes("blink") || g === "eyes closed");
          if (hasBlink && now - lastBlinkTimeRef.current > 600) {
            lastBlinkTimeRef.current = now;
            setBlinkCount((prev) => {
              const next = prev + 1;
              if (next >= 2) {
                setTimeout(() => nextChallengeRef.current(), 0);
              }
              return next;
            });
          }
        } else if (activeChallenge.type === "gesture") {
          if (inCooldown) {
            rafId = requestAnimationFrame(detectionLoop);
            return;
          }

          const keywords = activeChallenge.keywords || [];
          const rotationMatch = checkHeadDirection(result, keywords);

          if (rotationMatch) {
            if (poseHoldStartRef.current === 0) {
              poseHoldStartRef.current = Date.now();
            } else {
              const heldFor = Date.now() - poseHoldStartRef.current;
              setHoldProgress(Math.min(heldFor / REQUIRED_HOLD_MS, 1));
              if (heldFor >= REQUIRED_HOLD_MS) {
                setTimeout(() => nextChallengeRef.current(), 0);
              }
            }
          } else {
            poseHoldStartRef.current = 0;
            setHoldProgress(0);
          }
        }
      } catch (e) {
        setLiveGestures("Error: " + (e instanceof Error ? e.message : String(e)));
      }

      rafId = requestAnimationFrame(detectionLoop);
    };

    const init = async () => {
      try {
        const { Human } = await import("@vladmandic/human");
        if (cancelled) return;

        const humanConfig = {
          modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human/models/",
          face: {
            enabled: true,
            mesh: { enabled: true },
            emotion: { enabled: false },
            rotation: { enabled: true },
          },
          body: { enabled: false },
          hand: { enabled: false },
          gesture: { enabled: true },
        };

        humanRef.current = new Human(humanConfig);
        await (humanRef.current as { load: () => Promise<void> }).load();
        if (cancelled) return;

        const shuffled = [...allChallenges].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        challengesRef.current = selected;

        setStatus("System ready. Please complete the tasks below.");
        challengeStartTimeRef.current = Date.now();
        await startWebcam();
      } catch {
        if (!cancelled) {
          setStatus("Failed to load models. Check your internet connection.");
        }
      }
    };

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            detectionLoop();
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Camera error";
        setCameraError(msg);
        setStatus("Camera could not be opened.");
      }
    };

    init();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const currentChallenge = challengesRef.current[currentStep];

  if (cameraError) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="text-4xl">📷</span>
        <h2 className="text-lg font-semibold text-text-primary">Camera Required</h2>
        <p className="max-w-md text-sm text-text-secondary">{cameraError}</p>
        <button onClick={() => onFail("CAMERA_DENIED")} className="btn-secondary">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-lg font-bold text-text-primary">Camera Liveness Check</h2>
      <p className="text-sm text-text-secondary">{status}</p>

      {currentChallenge && (
        <>
          <div className="w-full max-w-md">
            <div className="mb-3 flex gap-2">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    idx < currentStep
                      ? "bg-emerald-500"
                      : idx === currentStep
                        ? "bg-monad-purple"
                        : "bg-surface-secondary"
                  }`}
                />
              ))}
            </div>

            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-2xl border-2 border-monad-purple"
              style={{ transform: "scaleX(-1)" }}
            />

            <div className="mt-4 rounded-xl border border-surface-border bg-surface-card p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-monad-purple-light">
                Task {currentStep + 1} / 3
              </span>
              <p className="mt-2 text-lg font-bold text-text-primary">{currentChallenge.text}</p>

              {currentChallenge.type === "blink" && (
                <p className="mt-2 text-2xl font-bold text-emerald-400">
                  {blinkCount} / 2
                </p>
              )}

              {currentChallenge.type === "gesture" && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${holdProgress * 100}%`, transitionDuration: "100ms" }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    {holdProgress > 0
                      ? `Holding: ${(holdProgress * 100).toFixed(0)}%`
                      : "Turn to the correct direction and hold for 2 seconds"}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 rounded-lg bg-black px-3 py-2 text-left font-mono text-xs text-emerald-400">
              <strong>[AI Engine]</strong> {liveGestures}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
