"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { WalletConnect } from "@/components/wallet-connect";
import { ErrorCallout } from "@/components/error-callout";
import { StatusBadge } from "@/components/status-badge";
import { HumanPassCard } from "@/components/humanpass-card";
import { humanPassAbi } from "@/lib/contracts/HumanPass.abi";
import { useDemoAccount, useDemoSignMessage } from "@/lib/e2e-wallet";
import { monadTestnet } from "@/lib/wagmi/config";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;

type ChallengeData = {
  challengeId: string;
  nonce: string;
  expiresAt: number;
  numbers: number[];
  message: string;
};

type VerifyResult = {
  status: "verified";
  txHash: string;
  validUntil: number;
  contractAddress?: string;
};

type Phase =
  | "idle"
  | "starting"
  | "challenge"
  | "signing"
  | "verifying"
  | "success"
  | "error";

function formatExpiry(validUntil: number): string {
  const remaining = validUntil - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Expired";
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `${mins}m ${secs}s remaining`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSecs = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
}

export default function VerifyPage() {
  const { address, isConnected, chainId } = useDemoAccount();
  const { signMessageAsync } = useDemoSignMessage();

  const [phase, setPhase] = useState<Phase>("idle");
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [clickedNumbers, setClickedNumbers] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [sequenceError, setSequenceError] = useState(false);
  const [readyToSign, setReadyToSign] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signFnRef = useRef<() => Promise<void>>(async () => {});

  const isWrongChain = isConnected && chainId !== monadTestnet.id;

  const { data: isHuman, isError: isHumanReadError } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}` | undefined,
    abi: humanPassAbi,
    functionName: "isHuman",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && CONTRACT_ADDRESS) },
  });

  const { data: humanUntil, isError: isHumanUntilReadError } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}` | undefined,
    abi: humanPassAbi,
    functionName: "getHumanUntil",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && CONTRACT_ADDRESS) },
  });

  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpired =
    humanUntil !== undefined && humanUntil > 0 && humanUntil < nowSeconds;
  const proofStatus = useMemo(() => {
    if (!isConnected || !address) return "not_verified" as const;
    if (isHuman === undefined) return "pending" as const;
    if (!isHuman || isExpired) return "not_verified" as const;
    return "verified" as const;
  }, [isConnected, address, isHuman, isExpired]);
  const hasProofReadError = isHumanReadError || isHumanUntilReadError;

  useEffect(() => {
    if (phase !== "challenge" || !challenge) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const update = () => {
      const remaining = challenge.expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        setPhase("error");
        setError("Challenge expired. Please start a new challenge.");
        setErrorCode("CHALLENGE_EXPIRED");
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }
      setTimeLeft(remaining);
    };

    update();
    timerRef.current = setInterval(update, 200);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, challenge]);

  useEffect(() => {
    if (readyToSign) {
      setReadyToSign(false);
      signFnRef.current();
    }
  }, [readyToSign]);

  useEffect(() => {
    setPhase("idle");
    setChallenge(null);
    setClickedNumbers([]);
    setAttempts(0);
    setError(null);
    setErrorCode(null);
    setVerifyResult(null);
    setSequenceError(false);
    setReadyToSign(false);
  }, [address]);

  const handleStartChallenge = useCallback(async () => {
    if (!address) return;

    setPhase("starting");
    setError(null);
    setErrorCode(null);
    setSequenceError(false);
    setClickedNumbers([]);

    try {
      const res = await fetch("/api/challenge/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, chainId: monadTestnet.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPhase("error");
        setError(data.error ?? "START_FAILED");
        setErrorCode(data.error ?? "START_FAILED");
        return;
      }

      setChallenge(data as ChallengeData);
      setPhase("challenge");
      setAttempts(0);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "START_FAILED");
      setErrorCode("START_FAILED");
    }
  }, [address]);

  const handleNumberClick = useCallback(
    (num: number) => {
      if (phase !== "challenge" || !challenge) return;

      const nextIndex = clickedNumbers.length;
      const expected = challenge.numbers[nextIndex];

      if (num !== expected) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setSequenceError(true);
        setClickedNumbers([]);

        if (newAttempts >= 3) {
          setPhase("error");
          setError("Maximum attempts reached. Please start a new challenge.");
          setErrorCode("MAX_ATTEMPTS");
        }
        return;
      }

      setSequenceError(false);
      const newClicked = [...clickedNumbers, num];
      setClickedNumbers(newClicked);

      if (newClicked.length === challenge.numbers.length) {
        setReadyToSign(true);
      }
    },
    [phase, challenge, clickedNumbers, attempts],
  );

  const handleSignAndVerify = useCallback(async () => {
    if (!challenge || !address) return;

    setPhase("signing");
    setError(null);
    setErrorCode(null);

    try {
      const signature = await signMessageAsync({ message: challenge.message });

      setPhase("verifying");

      const res = await fetch("/api/challenge/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          address,
          chainId: monadTestnet.id,
          signature,
          clickedNumbers: challenge.numbers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPhase("error");
        setError(data.error ?? "VERIFY_FAILED");
        setErrorCode(data.error ?? "VERIFY_FAILED");
        return;
      }

      setVerifyResult(data as VerifyResult);
      setPhase("success");
    } catch (err) {
      setPhase("error");
      if (err instanceof Error && err.name === "UserRejectedRequestError") {
        setError("Signature rejected. Please try again.");
        setErrorCode("SIGNATURE_REJECTED");
      } else {
        setError(err instanceof Error ? err.message : "VERIFY_FAILED");
        setErrorCode("VERIFY_FAILED");
      }
    }
  }, [challenge, address, signMessageAsync]);

  signFnRef.current = handleSignAndVerify;

  const handleRetry = useCallback(() => {
    if (errorCode === "CHALLENGE_EXPIRED" || errorCode === "MAX_ATTEMPTS") {
      setPhase("idle");
      setChallenge(null);
      setClickedNumbers([]);
      setAttempts(0);
      setError(null);
      setErrorCode(null);
      setSequenceError(false);
    } else {
      setPhase("challenge");
      setClickedNumbers([]);
      setError(null);
      setErrorCode(null);
      setSequenceError(false);
    }
  }, [errorCode]);

  const handleRestart = useCallback(() => {
    setPhase("idle");
    setChallenge(null);
    setClickedNumbers([]);
    setAttempts(0);
    setError(null);
    setErrorCode(null);
    setVerifyResult(null);
    setSequenceError(false);
  }, []);

  if (proofStatus === "verified" && phase === "idle") {
    return (
      <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
        <div className="w-full max-w-3xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">
                HumanPass Verification
              </h1>
              <p className="mt-1 text-text-secondary">
                You are already verified.
              </p>
            </div>
            <WalletConnect />
          </div>

          {isWrongChain && (
            <ErrorCallout
              message={`You are connected to an unsupported network. HumanPass only works on ${monadTestnet.name} (ID: ${monadTestnet.id}). Please switch your network to continue.`}
              className="mb-6"
            />
          )}

          <HumanPassCard
            status="verified"
            txHash={undefined}
            validUntil={humanUntil ? Number(humanUntil) : undefined}
            chainName={monadTestnet.name}
            walletAddress={address}
            contractAddress={CONTRACT_ADDRESS}
            showActions
            className="mb-6"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/vote" className="btn-primary text-center">
              Go to Protected Voting →
            </Link>
            <Link href="/status" className="btn-secondary text-center">
              Check Proof Status
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              HumanPass Verification
            </h1>
            <p className="mt-1 text-text-secondary">
              Prove you are human by completing a short challenge.
            </p>
          </div>
          <WalletConnect />
        </div>

        {isWrongChain && (
          <ErrorCallout
            message={`You are connected to an unsupported network. HumanPass only works on ${monadTestnet.name} (ID: ${monadTestnet.id}). Please switch your network to continue.`}
            className="mb-6"
          />
        )}

        {isConnected && !isWrongChain && hasProofReadError && (
          <ErrorCallout
            title="RPC Unavailable"
            message="HumanPass could not read your proof from Monad right now. The public RPC may be rate-limited; wait a moment and try again."
            variant="warning"
            className="mb-6"
          />
        )}

        {!isConnected && (
          <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
            <span className="text-4xl" aria-hidden="true">
              🔒
            </span>
            <h2 className="text-xl font-semibold text-text-primary">
              Connect Your Wallet
            </h2>
            <p className="max-w-md text-text-secondary">
              You need to connect a Monad Testnet wallet to start the
              verification challenge.
            </p>
          </div>
        )}

        {isConnected && isWrongChain && (
          <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
            <span className="text-4xl" aria-hidden="true">
              ⚠️
            </span>
            <h2 className="text-xl font-semibold text-text-primary">
              Wrong Network
            </h2>
            <p className="max-w-md text-text-secondary">
              HumanPass only works on {monadTestnet.name} (ID: {monadTestnet.id}
              ). Please switch your network to continue.
            </p>
          </div>
        )}

        {isConnected && !isWrongChain && (
          <>
            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm text-text-muted">HumanPass status:</span>
              {proofStatus === "verified" ? (
                <StatusBadge variant="verified" label="Verified" />
              ) : proofStatus === "pending" ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" aria-hidden="true" />
                  <StatusBadge variant="pending" label="Checking..." />
                </span>
              ) : (
                <StatusBadge variant="not_verified" label="Not Verified" />
              )}
              {humanUntil !== undefined && humanUntil > 0 && !isExpired && (
                <span className="text-xs text-text-muted">
                  {formatExpiry(Number(humanUntil))}
                </span>
              )}
            </div>

            {phase === "error" && (
              <>
                <ErrorCallout
                  title={
                    errorCode === "CHALLENGE_EXPIRED"
                      ? "Challenge Expired"
                      : errorCode === "MAX_ATTEMPTS"
                        ? "Max Attempts Reached"
                        : errorCode === "SIGNATURE_REJECTED"
                          ? "Signature Rejected"
                          : errorCode === "VERIFIER_NOT_CONFIGURED"
                          ? "Verifier Not Configured"
                          : errorCode === "VERIFIER_INSUFFICIENT_FUNDS"
                            ? "Verifier Needs Testnet MON"
                            : errorCode === "WRONG_CHAIN"
                              ? "Wrong Chain"
                              : "Verification Failed"
                  }
                  message={
                    errorCode === "VERIFIER_INSUFFICIENT_FUNDS"
                      ? "The verifier wallet does not have enough MON to issue your proof. Fund the verifier wallet from the Monad faucet, then try again."
                      : error ?? "An unknown error occurred."
                  }
                  variant={
                    errorCode === "CHALLENGE_EXPIRED" ||
                    errorCode === "MAX_ATTEMPTS"
                      ? "warning"
                      : "error"
                  }
                  className="mb-6"
                />
                <div className="flex gap-3">
                  {(errorCode === "CHALLENGE_EXPIRED" ||
                    errorCode === "MAX_ATTEMPTS") && (
                    <button onClick={handleRetry} className="btn-primary">
                      Start New Challenge
                    </button>
                  )}
                  {errorCode !== "CHALLENGE_EXPIRED" &&
                    errorCode !== "MAX_ATTEMPTS" && (
                      <button onClick={handleRestart} className="btn-primary">
                        Try Again
                      </button>
                    )}
                  <Link href="/" className="btn-secondary text-center">
                    Back to Home
                  </Link>
                </div>
              </>
            )}

            {phase === "idle" && proofStatus !== "verified" && (
              <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
                <span className="text-4xl" aria-hidden="true">🛡️</span>
                <h2 className="text-xl font-semibold text-text-primary">
                  Ready to Verify?
                </h2>
                <p className="max-w-md text-text-secondary">
                  You will be shown a sequence of numbers. Click them in the
                  correct order to prove you are human. You have 3 attempts and
                  30 seconds.
                </p>
                <button
                  onClick={handleStartChallenge}
                  className="btn-primary mt-2"
                >
                  Start Challenge
                </button>
              </div>
            )}

            {phase === "starting" && (
              <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" />
                <p className="text-text-secondary">Starting challenge...</p>
              </div>
            )}

            {phase === "challenge" && challenge && (
              <div className="card-base bg-card-shine animate-fade-in">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-text-primary">
                    Click the numbers in order
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-muted">
                      Attempt {attempts + 1}/3
                    </span>
                    <span
                      className={`font-mono text-sm font-semibold ${
                        timeLeft < 10000
                          ? "text-error"
                          : "text-text-secondary"
                      }`}
                    >
                      {formatCountdown(timeLeft)}
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between text-xs text-text-muted">
                    <span>
                      {clickedNumbers.length}/{challenge.numbers.length} numbers
                      selected
                    </span>
                    <span>
                      Order: {challenge.numbers.join(" → ")}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-monad-purple to-monad-cyan transition-all duration-300"
                      style={{
                        width: `${(clickedNumbers.length / challenge.numbers.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {sequenceError && (
                  <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-2 text-center text-sm text-error animate-fade-in">
                    Wrong order. Try again.
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {challenge.numbers.map((num, idx) => {
                    const isClicked = clickedNumbers.includes(num);
                    const isNext =
                      !isClicked &&
                      clickedNumbers.length < challenge.numbers.length &&
                      challenge.numbers[clickedNumbers.length] === num;

                    return (
                      <button
                        key={`${num}-${idx}`}
                        onClick={() => handleNumberClick(num)}
                        disabled={isClicked || phase !== "challenge"}
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

                {clickedNumbers.length > 0 && clickedNumbers.length < challenge.numbers.length && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => {
                        setClickedNumbers([]);
                        setSequenceError(false);
                      }}
                      className="text-sm text-text-muted transition-colors hover:text-text-secondary"
                    >
                      Reset sequence
                    </button>
                  </div>
                )}
              </div>
            )}

            {phase === "signing" && (
              <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" />
                <h2 className="text-xl font-semibold text-text-primary">
                  Sign the Message
                </h2>
                <p className="max-w-md text-text-secondary">
                  Please sign the challenge message in your wallet to complete
                  verification.
                </p>
              </div>
            )}

            {phase === "verifying" && (
              <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" />
                <h2 className="text-xl font-semibold text-text-primary">
                  Verifying on-chain...
                </h2>
                <p className="max-w-md text-text-secondary">
                  Your proof is being recorded on Monad. This may take a few
                  seconds.
                </p>
              </div>
            )}

            {phase === "success" && verifyResult && (
              <div className="animate-fade-in">
                <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-base leading-none" aria-hidden="true">
                      ✓
                    </span>
                    <div>
                      <p className="font-semibold">Verification Successful</p>
                      <p className="mt-0.5 text-text-secondary">
                        Your HumanPass proof has been issued on Monad.
                      </p>
                    </div>
                  </div>
                </div>

                <HumanPassCard
                  status="verified"
                  txHash={verifyResult.txHash}
                  validUntil={verifyResult.validUntil}
                  chainName={monadTestnet.name}
                  walletAddress={address}
                  contractAddress={verifyResult.contractAddress ?? CONTRACT_ADDRESS}
                  showActions
                  className="mb-6"
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/vote" className="btn-primary text-center">
                    Go to Protected Voting →
                  </Link>
                  <Link href="/status" className="btn-secondary text-center">
                    Check Proof Status
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
