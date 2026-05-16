# Draft: HumanPass Hackathon Demo Polish

## Requirements (confirmed)
- Add high-impact hackathon demo polish without changing the core architecture.
- Do not add on-chain voting, Redis, Supabase, database, NFT minting, or camera liveness.
- Keep HumanPass proof issuance on-chain.
- Keep voting storage backend/mock.
- Add `/simulator` Bot Attack Simulator page with bot/human attempts and counters.
- Add `/developers` Developer Integration page with reusable HumanPass positioning and code snippets.
- Improve verification success UI and `/status` proof card with badge, shortened wallet, expiration countdown, Monad Testnet, contract address, tx hash, and buttons: View Status, Go to Vote Demo, Copy Proof.
- Add navigation links for Verify, Vote Demo, Status, Live Humans, Simulator, Developers.
- Update README with simulator explanation, developer integration explanation, and demo script including simulator flow.

## Technical Decisions
- Planning-only mode: produce a decision-complete work plan, no code changes.
- Architecture unchanged: frontend polish + static/demo UI + README + tests only.
- Simulator is UI/demo-only with deterministic mocked attempts; it must not touch smart contract, vote store, verifier, or backend persistence.
- Developer page is documentation-style UI with static snippets; no SDK implementation.

## Research Findings
- Pending exploration: current UI/page/nav/proof-card/README patterns.
- Pending exploration: test/e2e and evidence patterns.

## Open Questions
- None blocking; requirements and exclusions are explicit.

## Scope Boundaries
- INCLUDE: `/simulator`, `/developers`, improved proof card UI reuse, nav links, README updates, tests/e2e evidence.
- EXCLUDE: on-chain voting, database/persistent storage, NFT minting, liveness/camera, SDK implementation, verifier architecture changes, new backend state systems.
