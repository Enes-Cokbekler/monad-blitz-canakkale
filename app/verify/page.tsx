"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { WalletConnect } from "@/components/wallet-connect";
import { ErrorCallout } from "@/components/error-callout";
import { StatusBadge } from "@/components/status-badge";
import { HumanPassCard } from "@/components/humanpass-card";
import { NumberSequenceChallenge } from "@/components/challenges/number-sequence-challenge";
import { ReactionChallenge } from "@/components/challenges/reaction-challenge";
import { TypingPhraseChallenge } from "@/components/challenges/typing-phrase-challenge";
import { FunnyQuestionChallenge } from "@/components/challenges/funny-question-challenge";
import {
  buildHumanPassVerificationMessage,
  getHumanPassDomain,
  getHumanPassTypes,
} from "@/lib/eip712";
import { humanPassAbi } from "@/lib/contracts/HumanPass.abi";
import { useDemoAccount, useDemoSignTypedData } from "@/lib/e2e-wallet";
import { monadTestnet } from "@/lib/wagmi/config";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type ChallengeType = "number_sequence" | "reaction" | "typing_phrase" | "funny_question";

type ChallengeData = {
  challengeId: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  type: ChallengeType;
  // number_sequence
  numbers?: number[];
  // reaction
  delayMs?: number;
  windowMs?: number;
  // typing_phrase
  phrase?: string;
  // funny_question
  question?: string;
  options?: string[];
};

type VerifyResult = {
  status: "verified";
  txHash: string;
  validUntil: number;
  contractAddress?: string;
  isDemo?: boolean;
};

type ChallengeAnswer =
  | { type: "number_sequence"; clickedNumbers: number[] }
  | { type: "reaction"; clickedAt: number }
  | { type: "typing_phrase"; typedPhrase: string }
  | { type: "funny_question"; selectedAnswer: number };

type Phase =
  | "idle"
  | "starting"
  | "challenge"
  | "signing"
  | "verifying"
  | "success"
  | "error";

const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  number_sequence: "Number Sequence",
  reaction: "Reaction",
  typing_phrase: "Typing Phrase",
  funny_question: "Human Signal",
};

function formatExpiry(validUntil: number): string {
  const remaining = validUntil - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return "Expired";
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `${mins}m ${secs}s remaining`;
}

export default function VerifyPage() {
  const { address, isConnected, chainId } = useDemoAccount();
  const { signTypedDataAsync } = useDemoSignTypedData();

  const [phase, setPhase] = useState<Phase>("idle");
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
  const isExpired = humanUntil !== undefined && humanUntil > 0 && humanUntil < nowSeconds;
  const proofStatus = useMemo(() => {
    if (!isConnected || !address) return "not_verified" as const;
    if (isHuman === undefined) return "pending" as const;
    if (!isHuman || isExpired) return "not_verified" as const;
    return "verified" as const;
  }, [isConnected, address, isHuman, isExpired]);
  const hasProofReadError = isHumanReadError || isHumanUntilReadError;

  // Countdown timer for number_sequence challenge
  useEffect(() => {
    if (phase !== "challenge" || !challenge || challenge.type !== "number_sequence") {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    const update = () => {
      const remaining = challenge.expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        setPhase("error");
        setError("Challenge expired. Please start a new challenge.");
        setErrorCode("CHALLENGE_EXPIRED");
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        return;
      }
      setTimeLeft(remaining);
    };

    update();
    timerRef.current = setInterval(update, 200);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [phase, challenge]);

  useEffect(() => {
    setPhase("idle");
    setChallenge(null);
    setAttempts(0);
    setError(null);
    setErrorCode(null);
    setVerifyResult(null);
  }, [address]);

  const handleStartChallenge = useCallback(async () => {
    if (!address) return;
    setPhase("starting");
    setError(null);
    setErrorCode(null);
    setAttempts(0);

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
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "START_FAILED");
      setErrorCode("START_FAILED");
    }
  }, [address]);

  const handleSignAndVerify = useCallback(async (answer: ChallengeAnswer) => {
    if (!challenge || !address) return;

    setPhase("signing");
    setError(null);
    setErrorCode(null);

    let signature: string;
    try {
      signature = await signTypedDataAsync({
        domain: getHumanPassDomain(monadTestnet.id, CONTRACT_ADDRESS as `0x${string}` | undefined),
        types: getHumanPassTypes(),
        primaryType: "HumanPassVerification",
        message: buildHumanPassVerificationMessage(
          address as `0x${string}`,
          challenge.challengeId,
          challenge.nonce,
          challenge.issuedAt,
          challenge.expiresAt,
        ),
      });
    } catch (err) {
      setPhase("challenge");
      if (err instanceof Error && err.name === "UserRejectedRequestError") {
        setError("Signature rejected. Please try again.");
        setErrorCode("SIGNATURE_REJECTED");
      } else {
        setError(err instanceof Error ? err.message : "SIGN_FAILED");
        setErrorCode("SIGN_FAILED");
      }
      return;
    }

    setPhase("verifying");

    const answerPayload =
      answer.type === "number_sequence" ? { clickedNumbers: answer.clickedNumbers } :
      answer.type === "reaction" ? { clickedAt: answer.clickedAt } :
      answer.type === "typing_phrase" ? { typedPhrase: answer.typedPhrase } :
      { selectedAnswer: answer.selectedAnswer };

    try {
      const res = await fetch("/api/challenge/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          address,
          chainId: monadTestnet.id,
          nonce: challenge.nonce,
          signature,
          ...answerPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const code = data.error ?? "VERIFY_FAILED";
        if (code === "WRONG_ANSWER" || code === "WRONG_SEQUENCE" || code === "WRONG_PHRASE") {
          setAttempts((a) => a + 1);
          setPhase("challenge");
          setError("Wrong answer. Try again.");
          setErrorCode(code);
          return;
        }
        if (code === "TOO_MANY_ATTEMPTS" || code === "CHALLENGE_ALREADY_USED" || code === "NONCE_MISMATCH" || code === "CHALLENGE_EXPIRED") {
          setPhase("error");
          setError(
            code === "TOO_MANY_ATTEMPTS" ? "Maximum attempts reached. Please start a new challenge." :
            code === "CHALLENGE_ALREADY_USED" ? "This challenge has already been used. Please start a new challenge." :
            code === "NONCE_MISMATCH" ? "Session error. Please start a new challenge." :
            "Challenge expired. Please start a new challenge."
          );
          setErrorCode(code);
          return;
        }
        // Demo mode fallback: simulate proof if verifier is not configured / out of funds
        if (
          DEMO_MODE &&
          (code === "VERIFIER_NOT_CONFIGURED" || code === "VERIFIER_INSUFFICIENT_FUNDS")
        ) {
          const simulatedUntil = Math.floor(Date.now() / 1000) + 600;
          setVerifyResult({
            status: "verified",
            txHash: "0x0000000000000000000000000000000000000000000000000000000DEMO",
            validUntil: simulatedUntil,
            contractAddress: CONTRACT_ADDRESS,
            isDemo: true,
          });
          setPhase("success");
          return;
        }
        setPhase("error");
        setError(data.error ?? "VERIFY_FAILED");
        setErrorCode(data.error ?? "VERIFY_FAILED");
        return;
      }

      setVerifyResult(data as VerifyResult);
      setPhase("success");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "VERIFY_FAILED");
      setErrorCode("VERIFY_FAILED");
    }
  }, [challenge, address, signTypedDataAsync]);

  const handleChallengePass = useCallback((answer: ChallengeAnswer) => {
    handleSignAndVerify(answer);
  }, [handleSignAndVerify]);

  const handleChallengeFail = useCallback((reason: string) => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    if (newAttempts >= 3 || reason === "TOO_EARLY" || reason === "TOO_LATE" || reason === "TOO_MANY_ATTEMPTS") {
      setPhase("error");
      setError(
        reason === "TOO_EARLY" ? "You clicked too early. Start a new challenge." :
        reason === "TOO_LATE" ? "You were too slow. Start a new challenge." :
        "Maximum attempts reached. Please start a new challenge."
      );
      setErrorCode(reason);
    } else {
      setPhase("idle");
    }
  }, [attempts]);

  const handleRestart = useCallback(() => {
    setPhase("idle");
    setChallenge(null);
    setAttempts(0);
    setError(null);
    setErrorCode(null);
    setVerifyResult(null);
  }, []);

  // Already verified idle state
  if (proofStatus === "verified" && phase === "idle") {
    return (
      <main className="relative flex min-h-screen flex-col items-center overflow-x-hidden px-6 py-12">
        <div className="w-full max-w-3xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">HumanPass Verification</h1>
              <p className="mt-1 text-text-secondary">You are already verified.</p>
            </div>
            <WalletConnect />
          </div>

          {isWrongChain && (
            <ErrorCallout
              message={`HumanPass only works on ${monadTestnet.name} (ID: ${monadTestnet.id}). Please switch network.`}
              className="mb-6"
            />
          )}

          <HumanPassCard
            status="verified"
            validUntil={humanUntil ? Number(humanUntil) : undefined}
            chainName={monadTestnet.name}
            walletAddress={address}
            contractAddress={CONTRACT_ADDRESS}
            showActions
            className="mb-6"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/vote" className="btn-primary text-center">Go to Protected Voting →</Link>
            <Link href="/status" className="btn-secondary text-center">Check Proof Status</Link>
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
            <h1 className="text-3xl font-bold text-text-primary">HumanPass Verification</h1>
            <p className="mt-1 text-text-secondary">
              {challenge ? `Human signal challenge — ${CHALLENGE_TYPE_LABELS[challenge.type]}` : "Prove you are human."}
            </p>
          </div>
          <WalletConnect />
        </div>

        {isWrongChain && (
          <ErrorCallout
            message={`HumanPass only works on ${monadTestnet.name} (ID: ${monadTestnet.id}). Please switch network.`}
            className="mb-6"
          />
        )}

        {isConnected && !isWrongChain && hasProofReadError && (
          <ErrorCallout
            title="RPC Unavailable"
            message="HumanPass could not read your proof from Monad. The public RPC may be rate-limited."
            variant="warning"
            className="mb-6"
          />
        )}

        {!isConnected && (
          <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
            <span className="text-4xl">🔒</span>
            <h2 className="text-xl font-semibold text-text-primary">Connect Your Wallet</h2>
            <p className="max-w-md text-text-secondary">Connect a Monad Testnet wallet to start verification.</p>
          </div>
        )}

        {isConnected && isWrongChain && (
          <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
            <span className="text-4xl">⚠️</span>
            <h2 className="text-xl font-semibold text-text-primary">Wrong Network</h2>
            <p className="max-w-md text-text-secondary">
              HumanPass only works on {monadTestnet.name} (ID: {monadTestnet.id}).
            </p>
          </div>
        )}

        {isConnected && !isWrongChain && (
          <>
            {/* Status bar */}
            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm text-text-muted">HumanPass status:</span>
              {proofStatus === "verified" ? (
                <StatusBadge variant="verified" label="Verified" />
              ) : proofStatus === "pending" ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" />
                  <StatusBadge variant="pending" label="Checking..." />
                </span>
              ) : (
                <StatusBadge variant="not_verified" label="Not Verified" />
              )}
              {humanUntil !== undefined && humanUntil > 0 && !isExpired && (
                <span className="text-xs text-text-muted">{formatExpiry(Number(humanUntil))}</span>
              )}
            </div>

            {/* Challenge type badge */}
            {challenge && phase === "challenge" && (
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full border border-monad-purple/30 bg-monad-purple/10 px-3 py-1 text-xs font-semibold text-monad-purple-light">
                  Human signal challenge
                </span>
                <span className="rounded-full border border-surface-border bg-surface-secondary px-3 py-1 text-xs font-semibold text-text-secondary">
                  {CHALLENGE_TYPE_LABELS[challenge.type]}
                </span>
                {attempts > 0 && (
                  <span className="rounded-full border border-error/30 bg-error/10 px-3 py-1 text-xs font-semibold text-error">
                    Attempt {attempts + 1}/3
                  </span>
                )}
              </div>
            )}

            {/* Inline error in challenge phase */}
            {(phase === "challenge" || phase === "signing" || phase === "verifying") && error && (
              <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-2 text-sm text-error animate-fade-in">
                {error}
              </div>
            )}

            {/* Error phase */}
            {phase === "error" && (
              <>
                <ErrorCallout
                  title={
                    errorCode === "CHALLENGE_EXPIRED" ? "Challenge Expired" :
                    errorCode === "TOO_MANY_ATTEMPTS" || errorCode === "TOO_EARLY" || errorCode === "TOO_LATE" ? "Challenge Failed" :
                    errorCode === "CHALLENGE_ALREADY_USED" ? "Challenge Already Used" :
                    errorCode === "NONCE_MISMATCH" ? "Session Error" :
                    errorCode === "SIGNATURE_REJECTED" ? "Signature Rejected" :
                    errorCode === "VERIFIER_NOT_CONFIGURED" ? "Verifier Not Configured" :
                    errorCode === "VERIFIER_INSUFFICIENT_FUNDS" ? "Verifier Needs Testnet MON" :
                    "Verification Failed"
                  }
                  message={
                    errorCode === "VERIFIER_INSUFFICIENT_FUNDS"
                      ? "The verifier wallet does not have enough MON. Fund it from the Monad faucet."
                      : error ?? "An unknown error occurred."
                  }
                  variant={
                    ["CHALLENGE_EXPIRED", "TOO_MANY_ATTEMPTS", "TOO_EARLY", "TOO_LATE", "CHALLENGE_ALREADY_USED"].includes(errorCode ?? "")
                      ? "warning" : "error"
                  }
                  className="mb-6"
                />
                <div className="flex gap-3">
                  <button onClick={handleRestart} className="btn-primary">Start New Challenge</button>
                  <Link href="/" className="btn-secondary text-center">Back to Home</Link>
                </div>
              </>
            )}

            {/* Idle */}
            {phase === "idle" && proofStatus !== "verified" && (
              <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
                <span className="text-4xl">🛡️</span>
                <h2 className="text-xl font-semibold text-text-primary">Ready to Verify?</h2>
                <p className="max-w-md text-text-secondary">
                  A random human-signal challenge will be selected. Complete it to receive your on-chain HumanPass proof.
                </p>
                <button onClick={handleStartChallenge} className="btn-primary mt-2">
                  Start Challenge
                </button>
              </div>
            )}

            {/* Starting */}
            {phase === "starting" && (
              <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" />
                <p className="text-text-secondary">Selecting challenge...</p>
              </div>
            )}

            {/* Challenge */}
            {phase === "challenge" && challenge && (
              <div className="card-base bg-card-shine animate-fade-in">
                {challenge.type === "number_sequence" && (
                  <NumberSequenceChallenge
                    numbers={challenge.numbers!}
                    attempts={attempts}
                    timeLeft={timeLeft}
                    onPass={(clickedNumbers) =>
                      handleChallengePass({ type: "number_sequence", clickedNumbers })
                    }
                    onFail={handleChallengeFail}
                  />
                )}

                {challenge.type === "reaction" && (
                  <ReactionChallenge
                    delayMs={challenge.delayMs!}
                    windowMs={challenge.windowMs!}
                    onPass={(clickedAt) =>
                      handleChallengePass({ type: "reaction", clickedAt })
                    }
                    onFail={handleChallengeFail}
                  />
                )}

                {challenge.type === "typing_phrase" && (
                  <TypingPhraseChallenge
                    phrase={challenge.phrase!}
                    onPass={(typedPhrase) =>
                      handleChallengePass({ type: "typing_phrase", typedPhrase })
                    }
                  />
                )}

                {challenge.type === "funny_question" && (
                  <FunnyQuestionChallenge
                    question={challenge.question!}
                    options={challenge.options!}
                    onPass={(selectedAnswer) =>
                      handleChallengePass({ type: "funny_question", selectedAnswer })
                    }
                  />
                )}
              </div>
            )}

            {/* Signing */}
            {phase === "signing" && (
              <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" />
                <h2 className="text-xl font-semibold text-text-primary">Sign the Message</h2>
                <p className="max-w-md text-text-secondary">
                  Challenge passed! Sign the typed message in your wallet to request your HumanPass proof.
                </p>
                <p className="max-w-md text-xs text-text-muted">
                  EIP-712 typed data — your wallet will show exactly what you are signing.
                </p>
              </div>
            )}

            {/* Verifying */}
            {phase === "verifying" && (
              <div className="card-base bg-card-shine flex flex-col items-center gap-4 py-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-monad-purple border-t-transparent" />
                <h2 className="text-xl font-semibold text-text-primary">Issuing proof on-chain...</h2>
                <p className="max-w-md text-text-secondary">
                  Your HumanPass proof is being recorded on Monad. This may take a few seconds.
                </p>
              </div>
            )}

            {/* Success */}
            {phase === "success" && verifyResult && (
              <div className="animate-fade-in">
                <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-base leading-none">✓</span>
                    <div>
                      <p className="font-semibold">Verification Successful</p>
                      <p className="mt-0.5 text-text-secondary">Your HumanPass proof has been issued on Monad.</p>
                    </div>
                  </div>
                </div>

                <HumanPassCard
                  status="verified"
                  txHash={verifyResult.isDemo ? undefined : verifyResult.txHash}
                  validUntil={verifyResult.validUntil}
                  chainName={monadTestnet.name}
                  walletAddress={address}
                  contractAddress={verifyResult.contractAddress ?? CONTRACT_ADDRESS}
                  showActions
                  isDemo={verifyResult.isDemo}
                  className="mb-6"
                />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
