import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";

import { POST } from "@/app/api/vote/route";
import { GET } from "@/app/api/vote/results/route";
import { clearVotesForTests } from "@/lib/server/vote-store";

vi.mock("@/lib/server/vote-check", () => ({
  checkIsHuman: vi.fn(),
}));

import { checkIsHuman } from "@/lib/server/vote-check";

const TEST_PRIVATE_KEY =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const WRONG_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const VALID_CHAIN_ID = 10143;

function buildVoteMessage(params: {
  address: string;
  optionId: string;
  nonce: string;
  chainId: number;
  timestamp: number;
}) {
  return [
    "HumanPass vote",
    `Wallet: ${params.address}`,
    `Option: ${params.optionId}`,
    `Nonce: ${params.nonce}`,
    `Chain: ${params.chainId}`,
    `Timestamp: ${params.timestamp}`,
  ].join("\n");
}

async function createSignedVoteBody(params: {
  address?: string;
  optionId?: string;
  nonce?: string;
  chainId?: number;
  timestamp?: number;
  privateKey?: string;
}) {
  const privateKey = params.privateKey ?? TEST_PRIVATE_KEY;
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const address = params.address ?? account.address;
  const optionId = params.optionId ?? "sdk";
  const nonce = params.nonce ?? "testnonce1234567890abcdef";
  const chainId = params.chainId ?? VALID_CHAIN_ID;
  const timestamp = params.timestamp ?? Date.now();

  const message = buildVoteMessage({ address, optionId, nonce, chainId, timestamp });
  const signature = await account.signMessage({ message });

  return { address, optionId, signature, nonce, chainId, timestamp };
}

function createVoteRequest(body: unknown) {
  return new Request("http://localhost/api/vote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postVote(body: unknown) {
  const response = await POST(createVoteRequest(body));
  const json = (await response.json()) as Record<string, unknown>;
  return { response, json };
}

describe("POST /api/vote", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearVotesForTests();
  });

  afterEach(() => {
    clearVotesForTests();
  });

  it("rejects vote from unverified wallet with NOT_HUMAN", async () => {
    vi.mocked(checkIsHuman).mockResolvedValue(false);

    const body = await createSignedVoteBody({});
    const { response, json } = await postVote(body);

    expect(response.status).toBe(403);
    expect(json).toEqual({ error: "NOT_HUMAN" });
  });

  it("allows verified wallet to vote once", async () => {
    vi.mocked(checkIsHuman).mockResolvedValue(true);

    const body = await createSignedVoteBody({ optionId: "votes" });
    const { response, json } = await postVote(body);

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect((json.results as Record<string, number>).votes).toBe(1);
  });

  it("rejects duplicate vote with ALREADY_VOTED", async () => {
    vi.mocked(checkIsHuman).mockResolvedValue(true);

    const body = await createSignedVoteBody({ optionId: "sdk" });
    const first = await postVote(body);
    expect(first.response.status).toBe(200);

    const second = await postVote(body);
    expect(second.response.status).toBe(409);
    expect(second.json).toEqual({ error: "ALREADY_VOTED" });
  });

  it("rejects invalid signature with INVALID_SIGNATURE", async () => {
    vi.mocked(checkIsHuman).mockResolvedValue(true);

    const body = await createSignedVoteBody({});
    const tampered = { ...body, signature: "0xinvalidsignature1234567890abcdef" };
    const { response, json } = await postVote(tampered);

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_SIGNATURE" });
  });

  it("rejects vote with wrong chain", async () => {
    vi.mocked(checkIsHuman).mockResolvedValue(true);

    const body = await createSignedVoteBody({ chainId: 1 });
    const { response, json } = await postVote(body);

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "WRONG_CHAIN" });
  });

  it("rejects vote with mismatched recovered address", async () => {
    vi.mocked(checkIsHuman).mockResolvedValue(true);

    const body = await createSignedVoteBody({});
    const tampered = { ...body, address: WRONG_ADDRESS };
    const { response, json } = await postVote(tampered);

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "INVALID_SIGNATURE" });
  });

  it("rejects vote with expired timestamp", async () => {
    vi.mocked(checkIsHuman).mockResolvedValue(true);

    const body = await createSignedVoteBody({ timestamp: Date.now() - 600_000 });
    const { response, json } = await postVote(body);

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: "EXPIRED_SIGNATURE" });
  });
});

describe("GET /api/vote/results", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearVotesForTests();
  });

  afterEach(() => {
    clearVotesForTests();
  });

  it("returns correct tallies after votes", async () => {
    vi.mocked(checkIsHuman).mockResolvedValue(true);

    const body1 = await createSignedVoteBody({ optionId: "sdk" });
    await postVote(body1);

    const body2 = await createSignedVoteBody({
      optionId: "events",
      privateKey:
        "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    });
    const secondVote = await postVote(body2);
    expect(secondVote.response.status).toBe(200);

    const response = await GET();
    const json = (await response.json()) as { results: Record<string, number> };

    expect(response.status).toBe(200);
    expect(json.results).toEqual({ sdk: 1, votes: 0, events: 1 });
  });

  it("returns zero tallies initially", async () => {
    const response = await GET();
    const json = (await response.json()) as { results: Record<string, number> };

    expect(response.status).toBe(200);
    expect(json.results).toEqual({ sdk: 0, votes: 0, events: 0 });
  });
});
