import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import type {} from "@nomicfoundation/hardhat-ethers/internal/type-extensions";
import type { HardhatEthersHelpers } from "@nomicfoundation/hardhat-ethers/types";
import type * as Ethers from "ethers";
import hre from "hardhat";
import type { HumanPass, HumanProtectedAction } from "../typechain-types";

const ethers = (hre as typeof hre & { ethers: typeof Ethers & HardhatEthersHelpers }).ethers;

describe("HumanProtectedAction", function () {
  const maxDuration = 7n * 24n * 60n * 60n;
  const proofDuration = 60n * 60n;

  async function deployFixture() {
    const [owner, verifier, human, stranger] = await ethers.getSigners();

    const HumanPassFactory = await ethers.getContractFactory("HumanPass");
    const humanPass = (await HumanPassFactory.deploy(verifier.address, maxDuration)) as unknown as HumanPass;
    await humanPass.waitForDeployment();

    const HumanProtectedActionFactory = await ethers.getContractFactory("HumanProtectedAction");
    const consumer = (await HumanProtectedActionFactory.deploy(await humanPass.getAddress())) as unknown as HumanProtectedAction;
    await consumer.waitForDeployment();

    return { humanPass, consumer, owner, verifier, human, stranger };
  }

  async function issueProof(humanPass: HumanPass, verifier: Ethers.Signer, user: Ethers.Signer) {
    return (humanPass.connect(verifier) as HumanPass).issueHumanProof(await user.getAddress(), proofDuration);
  }

  async function increaseTo(timestamp: bigint) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(timestamp)]);
    await ethers.provider.send("evm_mine", []);
  }

  it("verified human can perform protected action", async function () {
    const { humanPass, consumer, verifier, human } = await deployFixture();
    await issueProof(humanPass, verifier, human);

    await expect((consumer.connect(human) as HumanProtectedAction).performProtectedAction())
      .to.emit(consumer, "ProtectedActionPerformed")
      .withArgs(human.address);

    expect(await consumer.hasPerformedAction(human.address)).to.equal(true);
  });

  it("unverified wallet cannot perform protected action", async function () {
    const { consumer, stranger } = await deployFixture();

    await expect(
      (consumer.connect(stranger) as HumanProtectedAction).performProtectedAction()
    ).to.be.revertedWith("HumanProtectedAction: HumanPass required");
  });

  it("expired HumanPass cannot perform protected action", async function () {
    const { humanPass, consumer, verifier, human } = await deployFixture();

    const tx = await (humanPass.connect(verifier) as HumanPass).issueHumanProof(human.address, proofDuration);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);
    const expiry = BigInt(block!.timestamp) + proofDuration;

    await increaseTo(expiry);

    await expect(
      (consumer.connect(human) as HumanProtectedAction).performProtectedAction()
    ).to.be.revertedWith("HumanProtectedAction: HumanPass required");
  });

  it("same wallet cannot perform action twice", async function () {
    const { humanPass, consumer, verifier, human } = await deployFixture();
    await issueProof(humanPass, verifier, human);

    await (consumer.connect(human) as HumanProtectedAction).performProtectedAction();

    await expect(
      (consumer.connect(human) as HumanProtectedAction).performProtectedAction()
    ).to.be.revertedWith("HumanProtectedAction: already performed");
  });

  it("consumer contract reads HumanPass through the IHumanPass interface", async function () {
    const { humanPass, consumer, verifier, human, stranger } = await deployFixture();

    // Before proof: isHuman returns false, consumer blocks action
    expect(await humanPass.isHuman(human.address)).to.equal(false);
    await expect(
      (consumer.connect(human) as HumanProtectedAction).performProtectedAction()
    ).to.be.revertedWith("HumanProtectedAction: HumanPass required");

    // After proof: isHuman returns true, consumer allows action
    await issueProof(humanPass, verifier, human);
    expect(await humanPass.isHuman(human.address)).to.equal(true);
    await expect(
      (consumer.connect(human) as HumanProtectedAction).performProtectedAction()
    ).to.emit(consumer, "ProtectedActionPerformed");

    // Stranger still blocked
    expect(await humanPass.isHuman(stranger.address)).to.equal(false);
    await expect(
      (consumer.connect(stranger) as HumanProtectedAction).performProtectedAction()
    ).to.be.revertedWith("HumanProtectedAction: HumanPass required");
  });
});
