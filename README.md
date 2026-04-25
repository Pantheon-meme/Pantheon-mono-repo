# Pantheon

Pantheon is a hackathon monorepo for an onchain AI game where projects and communities can create branded deities, receive lands, populate those lands with playable NFT races, and let autonomous agents act through onchain state.

This repository is intentionally a boilerplate right now. It provides the workspace structure, documentation, and submission scaffolding needed to add apps, contracts, packages, examples, and tooling as the project becomes concrete.

## Concept

Pantheon is designed around a few core ideas:

- **Deities**: branded entities created by projects, people, or communities.
- **Lands**: world regions tied to a deity, with their own visual identity, resources, rules, and population.
- **Playable NFTs**: land populations represented as NFTs with evolving onchain state.
- **Agents**: autonomous players that can reason, act, coordinate, and execute moves for playable NFTs.
- **Asset workflows**: pipelines for generating and managing deity, land, race, and item assets.
- **Protocol integrations**: 0G for storage, compute, and chain infrastructure, with optional integrations for agent communication, identity, finance, and execution.

## Monorepo Layout

```txt
apps/       Deployable applications, frontends, dashboards, demos, and game clients.
packages/   Shared libraries, SDKs, agent primitives, game logic, asset tooling, and adapters.
contracts/  Smart contracts and deployment scripts.
examples/   Working example agents, demos, sample lands, and integration examples.
tools/      Repo-level scripts, generators, CLIs, and development utilities.
docs/       Product notes, architecture docs, diagrams, and submission material.
```

## Workspace

This repo uses:

- **pnpm workspaces** for package management.
- **Turborepo** for task orchestration.
- **Prettier** for formatting.

Install dependencies:

```sh
pnpm install
```

Run workspace tasks:

```sh
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm typecheck
pnpm format
```

These commands are ready for future apps and packages. They will become meaningful as each workspace adds matching scripts.

## Adding Workspaces

Recommended naming:

```txt
apps/web
apps/demo
packages/core
packages/agents
packages/assets
packages/protocol-0g
packages/protocol-ens
packages/protocol-uniswap
packages/protocol-keeperhub
contracts/game
examples/first-agent
tools/generators
```

Each new workspace should include its own `package.json`, README, and focused scripts for `dev`, `build`, `lint`, `test`, and `typecheck` when applicable.

## Hackathon Direction

Pantheon can fit multiple sponsor tracks, but the clearest primary direction is:

- **0G**: persistent game and agent memory through 0G Storage, inference through 0G Compute, and onchain state through 0G Chain.

Possible secondary integrations:

- **Gensyn AXL**: peer-to-peer communication between autonomous agents.
- **ENS**: persistent identities and discoverability for deities, agents, lands, or guilds.
- **Uniswap API**: agentic trading, resource markets, or treasury actions.
- **KeeperHub**: reliable execution for agent-triggered onchain transactions.

## Current Status

This is a clean monorepo skeleton. No gameplay systems, contracts, agents, asset generators, or protocol adapters have been implemented yet.

See [docs/vision.md](docs/vision.md), [docs/architecture.md](docs/architecture.md), and [docs/submission-checklist.md](docs/submission-checklist.md) for the initial project framing.
