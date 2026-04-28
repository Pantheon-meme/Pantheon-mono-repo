# Contracts

MUD world contracts for Pantheon.

This package is the first onchain slice of the game. It keeps Phaser rendering
offchain for now, while authoritative player, terrain, plant, and action log
state lives in MUD tables that can be synchronized by the MUD indexer.

## Localnet

From the repository root:

```sh
pnpm install
pnpm mud:dev
```

This starts Anvil, deploys the MUD world with hot reloading, and opens the MUD
Explorer/indexer process.

Useful one-off commands:

```sh
pnpm mud:build
pnpm mud:node
pnpm mud:deploy:local
```
