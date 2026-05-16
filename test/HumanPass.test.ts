import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import type {} from "@nomicfoundation/hardhat-ethers/internal/type-extensions";
import type { HardhatEthersHelpers } from "@nomicfoundation/hardhat-ethers/types";
import type * as Ethers from "ethers";
import hre from "hardhat";

const ethers = (hre as typeof hre & { ethers: typeof Ethers & HardhatEthersHelpers }).ethers;

describe("HumanPass", function () {
  const maxDuration = 7n * 24n * 60n * 60n;
  const proofDuration = 60n * 60n;
  type HumanPassContract = Awaited<ReturnType<Awaited<ReturnType<typeof ethers.getContractFactory>>["deploy"]>> & {
    issueHumanProof: (user: string, duration: bigint | number) => Promise<Ethers.ContractTransactionResponse>;
    setVerifier: (verifier: string) => Promise<Ethers.ContractTransactionResponse>;
    isHuman: (user: string) => Promise<boolean>;
    getHumanUntil: (user: string) => Promise<bigint>;
    revokeHumanProof: (user: string) => Promise<Ethers.ContractTransactionResponse>;
    verifier: () => Promise<string>;
  };

  async function deployHumanPassFixture() {
    const [owner, verifier, newVerifier, user, other] = await ethers.getSigners();
    const HumanPass = await ethers.getContractFactory("HumanPass");
    const humanPass = (await HumanPass.deploy(verifier.address, maxDuration)) as HumanPassContract;

    return { humanPass, owner, verifier, newVerifier, user, other };
  }

  function connectAs(humanPass: HumanPassContract, signer: Ethers.ContractRunner) {
    return humanPass.connect(signer) as HumanPassContract;
  }

  async function issueProof(humanPass: HumanPassContract, verifier: Awaited<ReturnType<typeof ethers.getSigners>>[number], user: Awaited<ReturnType<typeof ethers.getSigners>>[number], duration = proofDuration) {
    const tx = await connectAs(humanPass, verifier).issueHumanProof(user.address, duration);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);
    const validUntil = BigInt(block!.timestamp) + duration;

    return { tx, validUntil };
  }

  async function increaseTo(timestamp: bigint) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(timestamp)]);
    await ethers.provider.send("evm_mine", []);
  }

  it("lets the verifier issue a temporary proof", async function () {
    const { humanPass, verifier, user } = await deployHumanPassFixture();
    const { tx, validUntil } = await issueProof(humanPass, verifier, user);

    await expect(tx).to.emit(humanPass, "HumanProofIssued").withArgs(user.address, validUntil);
    expect(await humanPass.isHuman(user.address)).to.equal(true);
    expect(await humanPass.getHumanUntil(user.address)).to.equal(validUntil);
  });

  it("rejects proof issuance from a non-verifier", async function () {
    const { humanPass, user, other } = await deployHumanPassFixture();

    await expect(connectAs(humanPass, other).issueHumanProof(user.address, proofDuration)).to.be.revertedWith(
      "HumanPass: caller is not verifier"
    );
  });

  it("lets the owner update the verifier", async function () {
    const { humanPass, verifier, newVerifier } = await deployHumanPassFixture();

    await expect(humanPass.setVerifier(newVerifier.address))
      .to.emit(humanPass, "VerifierUpdated")
      .withArgs(verifier.address, newVerifier.address);
    expect(await humanPass.verifier()).to.equal(newVerifier.address);
  });

  it("rejects verifier updates from a non-owner", async function () {
    const { humanPass, newVerifier, other } = await deployHumanPassFixture();

    await expect(connectAs(humanPass, other).setVerifier(newVerifier.address)).to.be.revertedWith(
      "HumanPass: caller is not owner"
    );
  });

  it("rejects zero address proof issuance", async function () {
    const { humanPass, verifier } = await deployHumanPassFixture();

    await expect(connectAs(humanPass, verifier).issueHumanProof(ethers.ZeroAddress, proofDuration)).to.be.revertedWith(
      "HumanPass: user is zero address"
    );
  });

  it("rejects durations above the maximum", async function () {
    const { humanPass, verifier, user } = await deployHumanPassFixture();

    await expect(connectAs(humanPass, verifier).issueHumanProof(user.address, maxDuration + 1n)).to.be.revertedWith(
      "HumanPass: duration exceeds max"
    );
  });

  it("rejects zero duration proofs", async function () {
    const { humanPass, verifier, user } = await deployHumanPassFixture();

    await expect(connectAs(humanPass, verifier).issueHumanProof(user.address, 0)).to.be.revertedWith(
      "HumanPass: duration is zero"
    );
  });

  it("returns false after proof expiry", async function () {
    const { humanPass, verifier, user } = await deployHumanPassFixture();
    const { validUntil } = await issueProof(humanPass, verifier, user);

    await increaseTo(validUntil);

    expect(await humanPass.isHuman(user.address)).to.equal(false);
  });

  it("returns true before proof expiry", async function () {
    const { humanPass, verifier, user } = await deployHumanPassFixture();
    const { validUntil } = await issueProof(humanPass, verifier, user);

    await increaseTo(validUntil - 1n);

    expect(await humanPass.isHuman(user.address)).to.equal(true);
  });

  it("lets the verifier revoke a proof", async function () {
    const { humanPass, verifier, user } = await deployHumanPassFixture();
    await issueProof(humanPass, verifier, user);

    await expect(connectAs(humanPass, verifier).revokeHumanProof(user.address))
      .to.emit(humanPass, "HumanProofRevoked")
      .withArgs(user.address);
    expect(await humanPass.getHumanUntil(user.address)).to.equal(0);
    expect(await humanPass.isHuman(user.address)).to.equal(false);
  });

  it("rejects revocation from a non-verifier", async function () {
    const { humanPass, user, other } = await deployHumanPassFixture();

    await expect(connectAs(humanPass, other).revokeHumanProof(user.address)).to.be.revertedWith(
      "HumanPass: caller is not verifier"
    );
  });
});
