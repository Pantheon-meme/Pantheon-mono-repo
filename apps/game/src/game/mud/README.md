# MUD Client Module Map

This folder is the browser game's MUD boundary. The rule of thumb:

- `MudWorldBridge.ts` submits transactions and exposes the public client API used by gameplay systems.
- Reader files decode onchain table state into plain snapshots.
- Hydrator files apply those snapshots into local ECS/Phaser presentation.
- Gameplay actions stay optimistic; MUD confirmation reconciles or rolls them back.

## Object And Inventory Direction

The old hand-held/drop model is being replaced by onchain objects plus an
onchain player inventory. From this point forward, user-facing object systems
should be designed as MUD-backed systems first; Phaser only previews and
hydrates their local presentation.

### Object Model

Everything in the world except terrain and players should resolve to a
`WorldObject` with an `objectId` and `objectTypeId`. This includes forage
drops, seeds, plants, trees, harvest results, placed props, and any future
interactive world entity. Terrain remains tile state, and players remain
player state.

Use `ObjectType` for shared object metadata:

- `itemId` links object instances to item definitions when the object can be
  represented as inventory content or stack output.
- `weight` is the authoritative carry weight used by inventory checks.
- `grabbable` gates whether an object can be moved into player inventory.
- `usable` gates whether the object may dispatch to an object-specific use
  system.
- `category` and `label` support UI, filtering, and action messages.

`WorldObject` should keep instance state:

- `objectId`, `objectTypeId`, location, amount, creator, and created time.
- `owner` plus `inInventory` when the object is currently carried by a player.
- `exists` for removal after pickup, use, decay, or conversion.

Plants and trees should migrate from a separate presentation-only concept into
objects with plant-specific state tables keyed by `objectId` when they need
growth, health, harvest, or care data. During the transition, `PlantState`
can remain as a hydration source, but new plant/tree behavior should be shaped
around object identity.

### Inventory Model

Player inventory is an onchain table of object slots, not the old two-hand
component state. The initial capacity is intentionally tiny:

- Default `PlayerInventoryCapacity.maxWeight` is `2`.
- `PlayerInventory` stores one `objectId` per player slot.
- Pickup validates that the object is `grabbable`, still exists in the world,
  is not already in inventory, and would keep total carried weight at or below
  the player's max weight.
- Capacity upgrades should update capacity through separate future systems
  rather than changing the base rule.

The Phaser client may still show fast local feedback, but pickup, drop, and use
must flow through the client action coordination layer so movement completes
before inventory mutations that depend on the player's confirmed position.

### Object Actions

Object actions should be small MUD systems behind bridge methods:

- `pickupObject(objectId)` moves a grabbable world object into inventory.
- `dropObject(objectId, x, y)` removes it from inventory and places it at the
  confirmed target tile.
- `useObject(objectId, target)` dispatches to object-specific rules.

Object use is intentionally contextual. A use may require a terrain type, a
target tile, another object, ownership, growth stage, energy, or any other
onchain state. Keep the common inventory/object tables generic and put those
constraints in object-specific systems or rule tables. Examples:

- A seed object can be used on plantable terrain to create a plant object.
- A harvestable plant object can be used to create harvest objects or inventory
  objects.
- A tool object might only work on a terrain material or adjacent object.

Each migrated action still needs optimistic presentation: locally hide a picked
up object, locally place a dropped object, or preview a use result; submit the
MUD transaction in the background; then confirm, reconcile, or roll back.

## Files

`MudWorldBridge.ts`

- Public facade used by game systems.
- Owns pending transaction de-dupe sets for dig, forage, plant, harvest, care, movement, sleep, and object/inventory actions.
- Submits `pantheon__*` system calls through viem wallet client.
- Delegates reads to `MudSnapshotReader`.
- Keep imports from other gameplay systems pointed here when possible.

`MudSnapshotReader.ts`

- Reads player-facing snapshots: player state, energy, inventory, action log, pending action, world objects, last forage/harvest results.
- Adds optional nearby world-state hydration by delegating to `MudWorldStateReader`.
- This is where to add new table reads that are part of the player sync loop.

`MudWorldStateReader.ts`

- Reads nearby persistent world tiles from MUD tables, currently `TerrainState` and `PlantState`.
- Scans a bounded square around the confirmed player tile. Keep this bounded unless there is an indexed/query API.
- This is where to add refresh-time reads for new persistent tile/world state.

`OnchainWorldHydrator.ts`

- Applies snapshot data to local ECS state and Phaser-visible entities.
- Restores dirt/dig depth, objects, plants, and forage world-object drops after refresh.
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

Migrate a held/drop/use interaction to inventory:

1. Model the target as `WorldObject` plus `ObjectType`; only terrain and players
   should remain outside the object layer.
2. Add a MUD system call for pickup, drop, or object-specific use.
3. Route the client action through the action coordination layer so it waits for
   pending movement reconciliation.
4. Apply the optimistic local inventory/object visual change immediately.
5. Roll back the local inventory/object state on rejection.
6. Reconcile with `PlayerInventory` and `WorldObject` snapshots on refresh.

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
