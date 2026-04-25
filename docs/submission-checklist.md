# Hackathon Submission Checklist

## Required For 0G Tracks

- Project name and short description.
- Contract deployment addresses.
- Public GitHub repository.
- README with setup instructions.
- Demo video under 3 minutes.
- Live demo link.
- Explanation of protocol features or SDKs used.
- Team member names and contact info.
- At least one working example agent built with the framework or tooling.
- Architecture diagram showing integration with 0G Storage, 0G Compute, and optional OpenClaw-style components.

## Strong 0G Fit

- 0G Storage for land metadata, generated assets, memory, or action logs.
- 0G Compute for agent inference, planning, or reflection.
- 0G Chain for land, deity, playable NFT, and game action contracts.
- A clear explanation of why the agent needs decentralized storage, compute, or settlement.

## Optional Sponsor Tracks

### Uniswap

- Integrate the Uniswap API in a meaningful agentic finance flow.
- Include `FEEDBACK.md` in the repo root.
- Document what worked, what did not, docs gaps, and missing endpoints.

### Gensyn AXL

- Use AXL for communication across separate nodes.
- Avoid replacing AXL with a centralized message broker.
- Show inter-agent or inter-node communication in the demo.

### ENS

- Use ENS for functional agent, deity, land, or guild identity.
- Avoid hard-coded cosmetic name usage.
- Demonstrate resolution, metadata, discovery, access control, or coordination.

### KeeperHub

- Use KeeperHub MCP, CLI, or API for meaningful execution.
- Include a brief write-up explaining the approach.
- Capture specific feedback if pursuing the feedback bounty.

## Repository Readiness

- Root README explains the product and setup.
- Working example is easy to run.
- Contract addresses are documented.
- Architecture diagram is included in `docs/`.
- Demo script is documented.
- Environment variables are listed in `.env.example`.
- Team/contact section is complete.
- Sponsor-specific feedback files are present where required.
