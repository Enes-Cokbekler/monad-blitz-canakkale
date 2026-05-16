# HumanPass on Monad

## Project Summary

HumanPass is a proof-of-human session layer built on Monad for consumer applications.

As AI agents, bots, and synthetic users become harder to distinguish from real humans, consumer apps need a simple way to verify that a sensitive action is being performed by a real person.

HumanPass does not try to solve global identity or biometric verification. Instead, it creates a short-lived, privacy-friendly “Human Session Proof” that apps can require before allowing actions such as voting, claiming rewards, joining games, posting content, or accessing gated communities.

The project is designed for fast, real-time consumer use cases where Monad’s speed, low latency, and EVM compatibility are valuable.

---

## Problem

The internet is entering a phase where it is becoming increasingly difficult to know whether we are interacting with:

- a real human
- an AI agent
- a bot
- a fake account
- an automated script
- a synthetic identity

This creates problems for many consumer applications:

- Games are filled with bots.
- Voting systems can be manipulated.
- Reward campaigns are abused by fake users.
- Social platforms struggle with AI-generated spam.
- Communities cannot easily verify real participation.
- Airdrops and quests are attacked by sybil accounts.

Current solutions are either too heavy, too centralized, too invasive, or too difficult for small consumer apps to integrate.

HumanPass solves this by giving apps a lightweight way to ask:

> “Is this wallet currently controlled by a real human?”

---

## Core Idea

HumanPass allows a user to complete a short human verification challenge.

After the challenge is completed, the user receives a temporary on-chain Human Session Proof on Monad.

Other apps can then check this proof before allowing important actions.

Example:

1. User connects wallet.
2. User completes a short human challenge.
3. HumanPass issues a temporary proof to the user’s wallet.
4. Another app checks whether the wallet has a valid human proof.
5. If valid, the user can vote, claim, play, post, or participate.

---

## Why Monad?

HumanPass is designed for real-time consumer apps.

Monad is a strong fit because:

- It is EVM-compatible.
- Developers can use Solidity and familiar Web3 tooling.
- It supports fast, high-throughput applications.
- It is suitable for consumer experiences that require quick confirmation.
- Apps can verify human proofs without slow or expensive user flows.

Human verification should feel instant. Monad makes this UX more realistic.

---

## Target Users

### 1. Consumer Apps

Apps that want to reduce bot activity and AI abuse.

Examples:

- games
- social platforms
- voting apps
- creator platforms
- dating/friend apps
- event apps
- reward platforms
- quest platforms

### 2. Event Organizers

Hackathons, conferences, university events, and brand activations can use HumanPass to verify real attendees before allowing:

- voting
- reward claiming
- leaderboard participation
- raffle entries
- event badges

### 3. Web3 Projects

Web3 apps can use HumanPass to protect:

- airdrops
- quests
- mints
- allowlists
- DAO votes
- community rewards

---

## MVP Scope

The hackathon MVP should focus on a simple but powerful demo.

### Main Features

- Wallet connection
- Human verification challenge
- Temporary human proof issued on Monad
- Public proof status page
- Demo voting app protected by HumanPass
- Live list of verified humans
- Basic smart contract for proof storage
- Simple frontend for user flow

---

## User Flow

### Step 1: Connect Wallet

The user opens the HumanPass web app and connects their wallet.

### Step 2: Start Verification

The user clicks:

> Prove I am Human

### Step 3: Complete Challenge

The user completes a simple challenge.

Possible challenge examples:

- click the moving target
- repeat a random phrase
- solve a quick visual pattern
- press buttons in the shown order
- complete a short reaction test
- scan an event QR code

For the MVP, the challenge can be simple and frontend-based.

### Step 4: Issue Human Proof

After the challenge is completed, the app calls the smart contract and issues a temporary proof to the user’s wallet.

Example:

```solidity
humanUntil[user] = block.timestamp + 10 minutes;
Step 5: Use Proof in Demo App

The user enters a protected demo app.

Example demo:

voting room
reward claim page
game lobby
event leaderboard

The app checks whether the connected wallet has an active HumanPass proof.

If the proof is valid, the user can continue.

If not, the app asks the user to verify first.

Demo App Concept
Human-Protected Voting Room

The MVP should include a voting app where only verified humans can vote.

Demo flow:

User connects wallet.
User tries to vote.
If not verified, the app redirects to HumanPass.
User completes challenge.
Human proof is issued on Monad.
User returns to voting page.
User votes successfully.
Vote count updates live.

This demo clearly shows why HumanPass matters.

Smart Contract Requirements
HumanPass Contract

The contract stores temporary human proof sessions.

Required functions:

function issueHumanProof(address user, uint256 duration) external;
function isHuman(address user) external view returns (bool);
function getHumanUntil(address user) external view returns (uint256);
function revokeHumanProof(address user) external;
Basic State
mapping(address => uint256) public humanUntil;
address public verifier;
Logic
humanUntil[user] stores the timestamp until which the user is considered verified.
If humanUntil[user] > block.timestamp, the user has an active HumanPass.
Only an authorized verifier/backend should be able to issue proofs.
Proofs should expire automatically after a short duration.
Example Solidity Logic
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract HumanPass {
    address public owner;
    address public verifier;

    mapping(address => uint256) public humanUntil;

    event HumanProofIssued(address indexed user, uint256 validUntil);
    event HumanProofRevoked(address indexed user);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyVerifier() {
        require(msg.sender == verifier, "Not verifier");
        _;
    }

    constructor(address _verifier) {
        owner = msg.sender;
        verifier = _verifier;
    }

    function setVerifier(address _verifier) external onlyOwner {
        verifier = _verifier;
    }

    function issueHumanProof(address user, uint256 duration) external onlyVerifier {
        uint256 validUntil = block.timestamp + duration;
        humanUntil[user] = validUntil;

        emit HumanProofIssued(user, validUntil);
    }

    function isHuman(address user) external view returns (bool) {
        return humanUntil[user] > block.timestamp;
    }

    function getHumanUntil(address user) external view returns (uint256) {
        return humanUntil[user];
    }

    function revokeHumanProof(address user) external onlyVerifier {
        humanUntil[user] = 0;

        emit HumanProofRevoked(user);
    }
}
Frontend Pages
1. Landing Page

Purpose: Explain the product quickly.

Sections:

Hero
Problem
How it works
Use cases
Start verification button
Demo app button

Hero copy:

HumanPass is a proof-of-human session layer for consumer apps on Monad.

Subheadline:

Verify real users before votes, rewards, games, posts, claims, and other sensitive actions.

2. Verification Page

Purpose: Let users complete the human challenge.

Components:

Wallet connect button
Current verification status
Challenge card
“Start Challenge” button
“Issue HumanPass” transaction button
Success state

Success message:

Human proof active. You can now access protected apps.

3. Proof Status Page

Purpose: Show whether a wallet has an active human proof.

Components:

Wallet address
Human status
Expiration time
Transaction hash
Verification badge

Status examples:

Verified Human
Not Verified
Expired
4. Demo Voting App

Purpose: Demonstrate HumanPass in action.

Components:

Wallet connect
Verification check
Vote options
Vote button
Live results
“Verify first” modal

Rules:

Only verified humans can vote.
Unverified users are blocked.
Each wallet can vote once.
Votes can be stored on-chain or mocked for MVP speed.
Suggested Tech Stack
Frontend
Next.js
TypeScript
Tailwind CSS
shadcn/ui
wagmi
viem
RainbowKit or ConnectKit
Smart Contract
Solidity
Foundry or Hardhat
Monad testnet
Backend / Verifier

For MVP:

Next.js API route
Simple challenge validation
Server wallet signs/sends verification transaction

Optional:

Supabase for user/challenge logs
Redis for temporary challenge sessions
Backend Verification Logic

The backend should prevent users from directly issuing proofs without completing the challenge.

Basic flow:

Frontend requests a new challenge.
Backend generates a random challenge.
User completes the challenge.
Frontend sends answer to backend.
Backend validates answer.
If valid, backend calls the HumanPass contract as verifier.
Contract stores the user’s temporary proof.
Challenge Ideas
MVP Challenge

Use a simple reaction or pattern challenge.

Example:

Show 5 random numbers.
User must click them in correct order.
If completed under a time limit, verification succeeds.

This is simple to build and easy to demo.

Better Future Challenges
camera-based liveness
voice challenge
device motion challenge
social graph signal
wallet reputation
event QR proof
proof-of-location
integration with World ID or other identity systems
Privacy Positioning

HumanPass should not store private biometric data.

The MVP only stores:

wallet address
proof expiration timestamp
transaction data

HumanPass does not claim to permanently identify a person.

It only proves that a wallet passed a human challenge for a short period of time.

This makes the product lighter, safer, and more privacy-friendly.

Important Design Principle

Do not position HumanPass as:

“We can perfectly detect humans and AI.”

That claim is too big.

Instead, position it as:

“We provide a lightweight human session proof for consumer apps that need protection against bots, AI agents, and fake interactions.”

Main Pitch
One-Sentence Pitch

HumanPass is a proof-of-human session layer on Monad that lets consumer apps verify real users before sensitive actions like voting, claiming rewards, playing games, or joining communities.

Short Pitch

AI agents and bots are making it harder to know whether online actions come from real humans. HumanPass gives consumer apps a simple way to require a short-lived human proof before allowing important actions. Users complete a quick challenge, receive a temporary proof on Monad, and can use that proof across protected apps.

Demo Pitch

In our demo, users must verify as human before voting. If they do not have an active HumanPass, the app blocks the vote. After completing a short challenge, a proof is issued on Monad, and the user can vote instantly.

Hackathon Demo Script
Open the HumanPass landing page.
Explain the problem: AI agents and bots are flooding consumer apps.
Connect wallet.
Try to vote without verification.
App blocks the action.
Complete human challenge.
Issue HumanPass proof on Monad.
Show proof status.
Return to voting app.
Vote successfully.
Show live result update.
Explain how any consumer app can integrate this.
Future Roadmap
Phase 1: Hackathon MVP
wallet connection
basic challenge
temporary proof contract
demo voting app
proof status page
Phase 2: SDK
JavaScript SDK
React hooks
simple integration docs
requireHuman() helper

Example:

const isHuman = await humanpass.isHuman(address);

if (!isHuman) {
  redirectToVerification();
}
Phase 3: Stronger Verification
liveness checks
social verification
device fingerprinting
optional World ID integration
event QR/location proof
anti-sybil scoring
Phase 4: Ecosystem
HumanPass badge
app marketplace
verified human leaderboard
reward campaigns
DAO voting protection
game anti-bot layer
Possible Product Names
HumanPass
HumanGate
Proof of Human Session
HumanLayer
NotAI
RealUser
Proof of Presence
Monad HumanPass

Recommended name for MVP:

HumanPass

Reason:

Simple
Easy to understand
Consumer-friendly
Sounds like an access layer
Works well with “Get your HumanPass” copy
Success Criteria for Hackathon

The project should be judged successful if:

The problem is clear in less than 30 seconds.
The demo is interactive.
The audience can understand the use case immediately.
Monad is not just added randomly; it is part of the real-time proof system.
The smart contract is simple but functional.
The product feels like a reusable layer, not a one-off demo.
What to Build First

Priority order:

Smart contract: HumanPass proof storage
Wallet connection
Verification page
Basic challenge
Backend verifier endpoint
Issue proof transaction
Proof status UI
Demo voting app
Landing page
Polish and pitch visuals
MVP Feature Checklist
Must Have
 Connect wallet
 Complete human challenge
 Issue temporary proof on Monad
 Check if wallet is verified
 Protected demo app
 Basic UI explaining the product
Should Have
 Expiration countdown
 Transaction hash display
 Human badge
 Live voting demo
 Simple dashboard showing verified users
Nice to Have
 SDK mock
 QR event verification
 Leaderboard
 AI/bot simulation
 Admin panel
 World ID integration placeholder
Final Vision

HumanPass can become the human verification layer for the AI-native internet.

As AI agents become more common, apps will need to distinguish between automated activity and real human participation without forcing users into invasive identity systems.

HumanPass gives consumer apps a simple, fast, and privacy-friendly way to verify human presence using Monad.

The goal is not to prove who someone is forever.

The goal is to prove that a real human is behind an important action right now.
