# MUD Client Module Map

This folder is the browser game's MUD boundary. The rule of thumb:

- `MudWorldBridge.ts` submits transactions and exposes the public client API used by gameplay systems.
- Reader files decode onchain table state into plain snapshots.
- Hydrator files apply those snapshots into local ECS/Phaser presentation.
- Gameplay actions stay optimistic; MUD confirmation reconciles or rolls them back.

## Files

`MudWorldBridge.ts`

- Public facade used by game systems.
- Owns pending transaction de-dupe sets for dig, forage, plant, harvest, care, movement, and sleep.
- Submits `pantheon__*` system calls through viem wallet client.
- Delegates reads to `MudSnapshotReader`.
- Keep imports from other gameplay systems pointed here when possible.

`MudSnapshotReader.ts`

- Reads player-facing snapshots: player state, energy, action log, pending action, world objects, last forage/harvest results.
- Adds optional nearby world-state hydration by delegating to `MudWorldStateReader`.
- This is where to add new table reads that are part of the player sync loop.

`MudWorldStateReader.ts`

- Reads nearby persistent world tiles from MUD tables, currently `TerrainState` and `PlantState`.
- Scans a bounded square around the confirmed player tile. Keep this bounded unless there is an indexed/query API.
- This is where to add refresh-time reads for new persistent tile/world state.

`OnchainWorldHydrator.ts`

- Applies snapshot data to local ECS state and Phaser-visible entities.
- Restores dirt/dig depth, plants, and forage world-object drops after refresh.
- Keep rendering/presentation reconstruction here, not in `MudWorldBridge`.

`systems/MudHydrationSystem.ts`

- Polls `MudWorldBridge.readPlayerSnapshot`.
- Reconciles confirmed player position and energy with local movement/optimistic energy state.
- Starts onchain action presentation state and writes sync messages.
- Calls `OnchainWorldHydrator` for world visuals.

`MudWorldAbi.ts`

- Contains viem ABI fragments and local defaults for RPC/world/private key.
- Add new `pantheon__*` calls here before using them in the bridge/readers.

`MudTableIds.ts`

- MUD table IDs, field layouts, and field indexes.
- Values mirror generated contract table metadata.
- If `contracts/mud.config.ts` changes, verify this file against generated `contracts/src/codegen/tables/*.sol`.

`MudCodec.ts`

- Small bytes32/static-field encode/decode helpers.
- Use these instead of ad hoc slicing or hex conversion in readers.

`MudWorldTypes.ts`

- Shared snapshot, callback, and read-bound types.
- Keep bridge-facing types here so call sites can import from `MudWorldBridge.ts` re-exports or directly from this file.

`ActionDurations.ts`

- Client presentation durations for MUD-backed actions.
- These are visual timings, not contract constants.

## Common Changes

Add a new MUD-backed action:

1. Add the ABI function in `MudWorldAbi.ts`.
2. Add callback/result types in `MudWorldTypes.ts`.
3. Add submit/de-dupe/confirm flow in `MudWorldBridge.ts`.
4. Keep the gameplay action optimistic, with rollback on rejection.
5. If refresh must restore the result, add reads in `MudSnapshotReader` or `MudWorldStateReader`.
6. If the restored result creates visuals/entities, apply it in `OnchainWorldHydrator.ts`.

Add a new persisted table to refresh hydration:

1. Add table id/layout/field indexes to `MudTableIds.ts`.
2. Add snapshot types to `MudWorldTypes.ts`.
3. Read/decode in `MudWorldStateReader.ts` or `MudSnapshotReader.ts`.
4. Apply to ECS in `OnchainWorldHydrator.ts`.

## Invariants

- MUD is authoritative state; Phaser/ECS is optimistic presentation.
- User-facing actions should update locally immediately, submit in the background, then confirm or roll back.
- Movement and later discrete actions must respect the shared action queue so actions do not execute against stale onchain position.
- Avoid double-applying confirmed updates when the optimistic state already shows the change.
- Keep broad scans bounded. Prefer indexed reads or contract helpers before expanding refresh hydration.
