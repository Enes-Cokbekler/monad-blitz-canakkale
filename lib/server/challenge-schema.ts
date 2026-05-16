export const CHALLENGE_TTL_MS = 120_000;
export const MONAD_TESTNET_CHAIN_ID = 10143;
export const TYPING_PHRASE = "kim jong un'dan nefret ediyorum";

export type ChallengeType =
  | "number_sequence"
  | "reaction"
  | "typing_phrase"
  | "funny_question";

export type FunnyQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

export const FUNNY_QUESTIONS: FunnyQuestion[] = [
  {
    question: "Which behavior is the most human?",
    options: [
      'Saying "I will sleep early" and sleeping at 3 AM',
      "Never making typos",
      "Charging with USB-C",
      "Calculating hashes emotionally",
    ],
    correctIndex: 0,
  },
  {
    question: "What is the most realistic hackathon meal?",
    options: [
      "Balanced salad",
      "Cold pizza and energy drink",
      "Five-course dinner",
      "Air",
    ],
    correctIndex: 1,
  },
  {
    question: "What would a bot never understand?",
    options: [
      "Merge conflicts at 4 AM",
      "Gas fees",
      "JSON",
      "Binary",
    ],
    correctIndex: 0,
  },
];

export const MAX_ATTEMPTS = 3;

export type ChallengeSession = {
  challengeId: string;
  nonce: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  /** One-time use flag — true after successful verification */
  consumed: boolean;
  address: string;
  chainId: number;
  type: ChallengeType;
  // number_sequence
  numbers: number[];
  // reaction
  reactionDelayMs?: number;
  reactionWindowMs?: number;
  reactionWindowOpenAt?: number;
  // typing_phrase
  expectedPhrase?: string;
  // funny_question
  questionIndex?: number;
};

