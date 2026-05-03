# Architecture Notes

This document describes the intended shape of the project. It is not an implemented architecture yet.

For the current end-to-end stack diagram, see
[`docs/system-diagram.md`](./system-diagram.md).

For the current Central Uni Bank agent and planned Gold/Uniswap v3 economy
layer, see [`docs/economy-gold-and-bank.md`](./economy-gold-and-bank.md).

## Layers

```txt
User / Community / Project
        |
        v
Deity creation and branding
        |
        v
Land generation and configuration
        |
        v
Playable NFT population
        |
        v
Agent-controlled game actions
        |
        v
Onchain state, storage, compute, and execution
```

## Candidate Modules

### Game Domain

- Deity definitions
- Land definitions
- Race and population definitions
- Resource systems
- Action rules
- Inventory and progression
- World events

### Agent Runtime

- Planner
- Memory
- Tool registry
- Game state reader
- Action proposer
- Transaction executor
- Reflection and audit log

### Asset Workflows

- Branding intake
- Lore generation
- Race generation
- Land visual generation
- Metadata publishing
- Asset provenance tracking

### Onchain Layer

- Land ownership
- Deity registration
- Playable NFT minting
- Character state
- Resource state
- Action settlement
- Upgrade paths

### Protocol Integrations

- 0G Storage for persistent game state, memory, logs, and generated assets.
- 0G Compute for decentralized inference and agent reasoning.
- 0G Chain for EVM-compatible contracts and game state settlement.
- Gensyn AXL for peer-to-peer agent communication.
- ENS for deity, land, guild, and agent identity.
- Uniswap API for agentic markets and swaps.
- KeeperHub for reliable onchain execution.

## Suggested First Milestone

Keep the first working slice narrow:

1. Define one deity.
2. Define one land.
3. Mint or mock one playable NFT.
4. Give one agent a simple goal.
5. Let the agent read state, choose one action, and record the result.
6. Store memory or logs through 0G.
7. Document the flow clearly enough for judges to reproduce.

## Future Workspace Mapping

```txt
apps/web                  Main game or demo interface.
apps/admin                Optional deity and land management interface.
packages/core             Shared Pantheon domain types and rules.
packages/agents           Agent runtime primitives.
packages/assets           Asset workflow utilities.
packages/protocol-0g      0G Storage, Compute, and Chain adapters.
packages/protocol-axl     Gensyn AXL communication adapter.
packages/protocol-ens     ENS identity adapter.
packages/protocol-swap    Uniswap API integration.
packages/execution        KeeperHub execution adapter.
contracts/game            Pantheon contracts.
examples/first-agent      Minimal working agent example.
```
