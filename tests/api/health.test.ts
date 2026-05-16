import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Viem mock ────────────────────────────────────────────────────────────────

const { mockGetChainId, mockReadContract, mockGetBalance } = vi.hoisted(() => ({
  mockGetChainId: vi.fn(),
  mockReadContract: vi.fn(),
  mockGetBalance: vi.fn(),
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getChainId: mockGetChainId,
      readContract: mockReadContract,
      getBalance: mockGetBalance,
    })),
  };
});

// Import after mock
const { getHealthStatus } = await import("@/lib/server/health");

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_CONTRACT = "0x9876543210abcdef9876543210abcdef98765432";
// A real Hardhat private key — no production funds
const VALID_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// Corresponding address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupHappyPath() {
  mockGetChainId.mockResolvedValue(10143);
  mockReadContract.mockResolvedValue(false);
  mockGetBalance.mockResolvedValue(BigInt("5000000000000000000")); // 5 MON
  process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS = VALID_CONTRACT;
  process.env.VERIFIER_PRIVATE_KEY = VALID_PRIVATE_KEY;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getHealthStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.VERIFIER_PRIVATE_KEY;
    delete process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
    delete process.env.NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK;
  });

  afterEach(() => {
    delete process.env.VERIFIER_PRIVATE_KEY;
    delete process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS;
    delete process.env.NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK;
  });

  it("returns safe fields and never exposes private key", async () => {
    setupHappyPath();

    const result = await getHealthStatus();
    const serialized = JSON.stringify(result);

    // Must not contain private key
    expect(serialized).not.toContain(VALID_PRIVATE_KEY);
    expect(serialized).not.toContain("0xac0974bec");

    // Must contain derived address (public info)
    expect(result.verifier.address).toBe(
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    );
  });

  it("reports ok:true when all systems nominal", async () => {
    setupHappyPath();

    const result = await getHealthStatus();

    expect(result.ok).toBe(true);
    expect(result.rpc).toBe("ok");
    expect(result.contract).toBe("ok");
    expect(result.chainId).toBe(10143);
    expect(result.verifier.hasGas).toBe(true);
    expect(result.verifier.balanceMON).toBeDefined();
    expect(result.config.contractConfigured).toBe(true);
  });

  it("handles missing VERIFIER_PRIVATE_KEY safely", async () => {
    mockGetChainId.mockResolvedValue(10143);
    mockReadContract.mockResolvedValue(false);
    mockGetBalance.mockResolvedValue(0n);
    process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS = VALID_CONTRACT;
    // VERIFIER_PRIVATE_KEY intentionally not set

    const result = await getHealthStatus();

    expect(result.ok).toBe(false);
    expect(result.verifier.address).toBeUndefined();
    expect(result.verifier.error).toContain("VERIFIER_PRIVATE_KEY");
    // Private key definitely not in output
    expect(JSON.stringify(result)).not.toContain("0xac0974");
  });

  it("handles RPC failure safely", async () => {
    mockGetChainId.mockRejectedValue(new Error("connection refused"));
    process.env.NEXT_PUBLIC_HUMANPASS_CONTRACT_ADDRESS = VALID_CONTRACT;
    process.env.VERIFIER_PRIVATE_KEY = VALID_PRIVATE_KEY;

    const result = await getHealthStatus();

    expect(result.ok).toBe(false);
    expect(result.rpc).toBe("error");
    expect(result.chainId).toBeUndefined();
    // Should not throw
  });

  it("reports deploy block config status", async () => {
    setupHappyPath();
    process.env.NEXT_PUBLIC_HUMANPASS_DEPLOY_BLOCK = "12345";

    const result = await getHealthStatus();
    expect(result.config.deployBlockConfigured).toBe(true);
  });

  it("reports contract not_configured when env missing", async () => {
    mockGetChainId.mockResolvedValue(10143);
    mockGetBalance.mockResolvedValue(BigInt("5000000000000000000"));
    process.env.VERIFIER_PRIVATE_KEY = VALID_PRIVATE_KEY;
    // No contract address

    const result = await getHealthStatus();

    expect(result.contract).toBe("not_configured");
    expect(result.config.contractConfigured).toBe(false);
  });
});
