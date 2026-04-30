# MUD Local Dev And Seeding

This guide covers the local MUD workflow for developers who need to run the
Pantheon world, seed terrain tiles, and seed forage/item definitions.

## Prerequisites

From the repository root, install dependencies once:

```sh
pnpm install
```

The local scripts assume the default Anvil account and RPC:

- RPC: `http://127.0.0.1:8545`
- Default world address: `0xfDf868Ea710FfD8cd33b829c5AFf79eDd15EcD5f`
- Default private key: Foundry's first local Anvil key

You can override the RPC or world address with flags, or with
`MUD_RPC_URL` and `MUD_WORLD_ADDRESS`.

## Start Local MUD

The easiest path is the root MUD dev script:

```sh
pnpm mud:dev
```

This uses `mprocs.mud.yaml` to start:

- Anvil from `contracts`
- `mud dev-contracts` against `http://127.0.0.1:8545`
- the contracts package explorer process, when the `contracts` package exposes
  its `explorer` script

Useful one-off commands are also available:

```sh
pnpm mud:build
pnpm mud:node
pnpm mud:deploy:local
```

If you run the one-off path, start Anvil first and deploy after it is ready:

```sh
pnpm mud:node
pnpm mud:deploy:local
```

Keep the terminal running while you seed. A fresh Anvil chain or a MUD redeploy
means the local world state needs to be seeded again.

## Seed Terrain

Seed terrain first. The forage seed script registers forage tables against
terrain types, so terrain types must exist before forage tables are registered.

```sh
pnpm --filter @pantheon/game seed-terrain
```

By default this seeds the active biome from the game definitions, using a
`200x200` grid, `256` tile size, centered spawn tile, and batches of `100`
tiles per transaction. Terrain seeding submits transactions in nonce order and
waits for receipts in groups with a default concurrency of `4`.

For a faster local smoke test around spawn:

```sh
pnpm --filter @pantheon/game seed-terrain -- --radius 12
```

Common terrain options:

```sh
pnpm --filter @pantheon/game seed-terrain -- \
  --biome uniswap \
  --width 200 \
  --height 200 \
  --spawn-x 100 \
  --spawn-y 100 \
  --batch-size 100 \
  --concurrency 4
```

Useful flags:

- `--biome <id>` chooses a biome instead of the active biome.
- `--width <n>` and `--height <n>` set grid dimensions.
- `--tile-size <n>` sets the generated tile size.
- `--spawn-x <n>` and `--spawn-y <n>` set the spawn tile.
- `--radius <n>` seeds only tiles within that square radius around spawn.
- `--start-index <n>` and `--end-index <n>` seed a slice of generated records.
- `--batch-size <n>` controls tiles submitted per transaction.
- `--concurrency <n>` controls how many transactions are submitted and awaited
  at a time.
- `--rpc <url>` overrides `MUD_RPC_URL`.
- `--world <address>` overrides `MUD_WORLD_ADDRESS`.
- `--private-key <hex>` overrides the default Anvil account.
- `--dry-run` prints what would be seeded without submitting transactions.

## Seed Items And Forage

After terrain has been seeded, register item types, forage tables, and forage
loot slots:

```sh
pnpm --filter @pantheon/game seed-forage
```

Forage seeding submits transactions in nonce order and waits for receipts in
groups with a default concurrency of `8`. It still preserves dependency order
by registering item types first, forage tables second, and loot slots last.

The script reads from:

- `apps/game/src/game/items/ItemDefinitions.ts`
- `apps/game/src/game/forage/ForageLootDefinitions.ts`
- the active biome in `apps/game/src/game/biome/BiomeDefinitions.ts`

For the current active biome, a dry run prepares `58` item types, `9` forage
tables, and `85` loot slots:

```sh
pnpm --filter @pantheon/game seed-forage -- --dry-run
```

Useful flags:

- `--rpc <url>` overrides `MUD_RPC_URL`.
- `--world <address>` overrides `MUD_WORLD_ADDRESS`.
- `--private-key <hex>` overrides the default Anvil account.
- `--concurrency <n>` controls how many submitted transactions are allowed to
  wait for receipts at a time.
- `--dry-run` prints what would be seeded without submitting transactions.

## Export Terrain Records

You can inspect the generated terrain records without touching the chain:

```sh
pnpm --filter @pantheon/game export-terrain-seed
```

By default this writes to:

```text
apps/game/generated/terrain-seed/<biome>-<width>x<height>.json
```

Example with explicit output:

```sh
pnpm --filter @pantheon/game export-terrain-seed -- \
  --biome uniswap \
  --width 200 \
  --height 200 \
  --out generated/terrain-seed/uniswap-local.json
```

Useful flags:

- `--biome <id>` chooses a biome instead of the active biome.
- `--width <n>` and `--height <n>` set grid dimensions.
- `--tile-size <n>` sets the generated tile size.
- `--spawn-x <n>` and `--spawn-y <n>` set the spawn tile.
- `--out <path>` sets the output JSON path.

## Recommended Local Flow

For a clean local world:

```sh
pnpm install
pnpm mud:dev
pnpm --filter @pantheon/game seed-terrain
pnpm --filter @pantheon/game seed-forage
pnpm --filter @pantheon/game dev
```

For a quick smoke test:

```sh
pnpm mud:dev
pnpm --filter @pantheon/game seed-terrain -- --radius 12 --concurrency 4
pnpm --filter @pantheon/game seed-forage -- --concurrency 8
```

## Troubleshooting

If a transaction cannot connect, confirm Anvil is running on
`http://127.0.0.1:8545`.

If the game points at a different world, pass the same address to both seed
scripts with `--world <address>` or set `MUD_WORLD_ADDRESS`.

If forage seeding fails with a missing terrain type, run `seed-terrain` first
against the same world address.

If terrain seeding reverts during `seedTerrainTiles`, lower the terrain batch
size:

```sh
pnpm --filter @pantheon/game seed-terrain -- --batch-size 50 --concurrency 4
```

If you restart Anvil, the local chain state is gone. Redeploy the world and run
both seed scripts again.

If `pnpm mud:dev` fails because the `contracts` package has no `explorer`
script, restore or add that package script, or use the one-off Anvil and deploy
commands while the explorer script is being wired back up.
