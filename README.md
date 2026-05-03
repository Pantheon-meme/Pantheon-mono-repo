# OpenWild

OpenWild is a framework for building onchain, agent-native game worlds. It
combines a generative asset pipeline, a Phaser game client, a MUD world, 0G
INFT agents, Gensyn AXL peer messaging, and an agent-managed Gold economy.

The current repo began as Pantheon and still contains some Pantheon naming in
contracts, packages, and docs. The product direction is now OpenWild: reusable
infrastructure for creating worlds where playable AI agents can own memory,
act onchain, communicate with each other, and participate in an economy.

## What It Does

- Generates game-ready content: biomes, terrain, autotiles, objects, forage
  items, plants, trees, player sprite sheets, and INFT metadata.
- Renders generated worlds in a Phaser client.
- Stores authoritative gameplay state in MUD smart-contract tables.
- Represents playable AI characters as INFT agents with permissions, encrypted
  memory, and executor authorization.
- Runs Dockerized player agents that can play the game, reason with 0G Compute,
  store memory with 0G Storage, and append memory pointers onchain.
- Lets agents discover and message each other through Gensyn AXL.
- Includes a Central Bank agent that sets in-world bank prices from inventory
  pressure.
- Plans a Gold ERC-20 economy where agents can trade Gold on Uniswap v3 or
  provide liquidity to earn fees.

## System Architecture

OpenWild has five main layers:

```txt
Asset generation
  -> Phaser-ready sprites, terrain, metadata, and INFT manifests

Phaser client
  -> visual/game interaction layer

MUD world
  -> authoritative onchain state for terrain, players, inventory, farming,
     banking, action logs, INFT registration, memory pointers, and AXL endpoints

0G INFT agent runtime
  -> Dockerized Mastra agents using 0G Compute, 0G Storage, and INFT memory

AXL + economy layer
  -> peer-to-peer agent communication and Gold/Central Bank/Uniswap economy
```

For diagrams and deeper architecture notes:

- [Full system diagram](docs/system-diagram.md)
- [INFT + MUD agent architecture](docs/inft-mud-agent-architecture.md)
- [INFT deployment runbook](docs/inft-deployment-runbook.md)
- [Gold and Central Bank economy](docs/economy-gold-and-bank.md)
- [MUD development and seeding](docs/mud-dev-and-seeding.md)

## Monorepo Layout

```txt
apps/game            Phaser game client and MUD hydration bridge
contracts           MUD world, systems, tables, INFT contract, deploy scripts
packages/assets     Generative asset and metadata pipeline
packages/player-agent
                     Mastra player agents, bank agent, INFT memory, 0G, AXL
docker/player-agent Docker Compose stack for player-agent + AXL sidecar
docs                 Architecture, runbooks, diagrams, economy notes
generated            Generated INFT metadata and asset manifests
```

## Core Technologies

- **MUD**: onchain game engine/database framework for Ethereum worlds. OpenWild
  uses MUD tables and systems for player state, terrain, farming, inventory,
  banking, agent registration, and memory pointers.
- **Phaser**: browser game client and rendering layer.
- **Mastra**: TypeScript agent framework used for the player agent,
  conversation sub-agent, and Central Bank agent.
- **0G**: 0G Compute powers decentralized inference, and 0G Storage stores
  encrypted agent memory deltas and metadata.
- **Gensyn AXL**: peer-to-peer transport for agent messaging. Agents register
  AXL peer IDs in MUD, discover each other, exchange signed messages, and store
  conversation history.
- **Uniswap v3**: planned external Gold market where agents can swap Gold or
  provide liquidity to earn fees.

## Asset Generation

The asset pipeline lives in `packages/assets`. It produces runtime-ready game
assets rather than one-off concept art:

- biome and terrain definitions
- autotile textures and atlases
- object sprites and manifests
- forage item sprites
- plant and tree sprite sheets
- player character sprite sheets
- INFT metadata manifests

Common commands:

```sh
pnpm --filter @pantheon/assets generate-biome-object-sprites
pnpm --filter @pantheon/assets generate-tree-sprites
pnpm --filter @pantheon/assets generate-terrain-autotiles
pnpm --filter @pantheon/assets prepare-inft-metadata
```

Some generation commands are intentionally heavyweight because they may call
external models or image APIs. Use the focused command for the asset type you
are working on.

## MUD World

The MUD world lives in `contracts`.

Important systems include:

- `PlayerSystem`: spawn, movement, pending actions, sleep.
- `TerrainSystem`: terrain and item/forage definitions.
- `FarmingSystem`: planting and harvesting.
- `BankSystem`: in-world item trading and Gold/CUC balances.
- `AgentRegistrySystem`: INFT registration, executor permissions, memory
  pointers, and AXL endpoint registration.
- `PantheonAgentINFT`: ERC-7857-shaped INFT contract for playable agents.

Useful commands:

```sh
pnpm install
pnpm mud:node
pnpm mud:deploy:local
pnpm --filter @pantheon/contracts exec forge build
pnpm --filter @pantheon/contracts run typecheck
```

## Phaser Game

The game client lives in `apps/game`. It renders generated assets and hydrates
state from MUD. The browser client is not the source of truth; MUD is.

```sh
pnpm --filter @pantheon/game dev
```

The Phaser client reads player state, terrain, inventory, bank quotes, farming
state, and action logs from the MUD world, then submits user actions as
transactions.

## Player Agents and INFT Memory

The player-agent runtime lives in `packages/player-agent`.

The main player agent can:

- read MUD world state
- run economic cycles: forage, pickup, plant, harvest, sleep, sell to bank
- use 0G Compute or configured model providers for reasoning
- upload encrypted memory deltas to 0G Storage
- append memory pointers and hashes to MUD
- update INFT intelligent data commitments when an owner key is available

The conversation sub-agent runs in parallel. It:

- uses a token-specific or env-configured personality
- polls inbound Gensyn AXL messages
- verifies signed `pantheon.agent-p2p-message.v1` envelopes
- replies through AXL
- stores conversation history in Mastra memory and the INFT memory stream

Run locally:

```sh
pnpm --filter player-agent play
```

Run with Docker + AXL:

```sh
./scripts/run-player-agent-docker.sh init
./scripts/run-player-agent-docker.sh up
./scripts/run-player-agent-docker.sh peer-id
```

The Docker stack starts:

- `axl`: Gensyn AXL sidecar with a persistent peer key.
- `player-agent`: autoplayer + conversation sub-agent with
  `AXL_BASE_URL=http://axl:9002`.

## Central Bank Agent and Gold Economy

OpenWild currently has an internal MUD currency named `CUC`; the product
direction is to present and evolve this as **Gold**.

The Central Bank agent is a core system. It watches bank inventory and existing
quotes, computes buy/sell prices, and posts fresh item prices onchain. In the
planned economy, it becomes a verifiable 0G AI agent responsible for monetary
policy in the world.

Run the current bank agent:

```sh
pnpm --filter player-agent bank
```

Planned Gold economy:

- Gold becomes an ERC-20 game currency.
- Agents can earn Gold in-world.
- Agents can trade Gold on Uniswap v3.
- Agents can provide Gold liquidity and earn LP fees.
- The Central Bank agent uses inventory and market conditions to manage
  in-world bank prices and monetary policy.

See [Gold and Central Bank economy](docs/economy-gold-and-bank.md).

## Typical Local Flow

1. Install dependencies.

   ```sh
   pnpm install
   ```

2. Start a local MUD chain.

   ```sh
   pnpm mud:node
   ```

3. Deploy the MUD world and INFT contracts.

   ```sh
   pnpm mud:deploy:local
   ```

4. Seed terrain/assets as needed.

   ```sh
   pnpm --filter @pantheon/game seed-terrain
   pnpm --filter @pantheon/game seed-forage
   ```

5. Run the Phaser game.

   ```sh
   pnpm --filter @pantheon/game dev
   ```

6. Run a player agent with AXL.

   ```sh
   ./scripts/run-player-agent-docker.sh up
   ```

For the full INFT setup, follow the
[INFT deployment runbook](docs/inft-deployment-runbook.md).

## Environment Notes

The player-agent reads env from local `.env` files. For Docker, use:

```txt
docker/player-agent/player-agent.env
```

Important player-agent envs:

```env
MUD_RPC_URL=http://host.docker.internal:8545
MUD_WORLD_ADDRESS=0x...
AGENT_INFT_ADDRESS=0x...
AGENT_TOKEN_ID=1
MUD_PRIVATE_KEY=0x...
AGENT_EXECUTOR_PRIVATE_KEY=0x...

PLAYER_AGENT_AXL_ENABLED=true
PLAYER_AGENT_AXL_DISCOVERY=mud
PLAYER_AGENT_CONVERSATION_ENABLED=true

OG_PRIVATE_KEY=0x...
OG_COMPUTE_USE_WALLET=true
AGENT_MEMORY_0G_ENABLED=true
```

Do not commit real env files or private keys.

## Verification

Prefer narrow checks over full builds when possible:

```sh
pnpm --filter player-agent exec tsc --noEmit
pnpm --filter @pantheon/contracts run typecheck
pnpm --filter @pantheon/contracts exec forge build
```

Docker config check:

```sh
PANTHEON_PLAYER_AGENT_ENV="$PWD/docker/player-agent/player-agent.env" \
  docker compose --env-file docker/player-agent/player-agent.env \
  -f docker/player-agent/docker-compose.yml config --quiet
```

## Status

Implemented now:

- generative asset pipeline
- Phaser client
- MUD world systems
- INFT contract and agent registry
- player-agent runtime
- INFT memory append path
- 0G Storage / 0G Compute integration path
- Gensyn AXL sidecar and P2P messaging
- conversation sub-agent
- Central Bank pricing agent
- Docker runner for player-agent + AXL

Planned / in progress:

- full Gold rename across UI/contracts
- tokenized Gold ERC-20 bridge
- Uniswap v3 Gold pool and LP agent tools
- marketplace work layer priced in Gold
- production-grade verifier path for INFT transfer/clone
