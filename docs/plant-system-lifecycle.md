# Plant System Lifecycle

This diagram maps the plant lifecycle across the authoritative MUD contracts and
the Phaser client presentation layer. The onchain layer owns truth for terrain,
inventory, energy, care, harvest results, and final acceptance. Phaser keeps the
game responsive by predicting the visible result, then reconciling from MUD
confirmation callbacks and periodic hydration.

## Whole System Map

```mermaid
flowchart LR
  subgraph Config["Definition and Admin Data"]
    TerrainType["TerrainType\nplantable, diggable, move cost"]
    TerrainTile["TerrainTile\nx,y -> terrainId, biomeId"]
    PlantType["PlantType\nseed item, harvest item,\ngrowth, yield, care needs"]
    PlantTerrainRule["PlantTerrainRule\nallowed, growth modifier,\nyield bonus, rare drop"]
    ItemType["ItemType / ObjectType\nlabels, categories, weights"]
  end

  subgraph Chain["MUD Authoritative State"]
    PlayerState["PlayerState\nposition, energy"]
    PlayerInventory["PlayerInventory\nslot -> objectId"]
    ObjectState["ObjectState\nobjectId -> itemId, amount"]
    InventoryObject["InventoryObject\nobject owner"]
    PlantStateTable["PlantState\nx,y -> plantId, owner,\nplantedAt, stage, health, stress"]
    FarmTileState["FarmTileState\nmoisture, fertility,\nexhaustion, water/tend timestamps"]
    LastHarvestResult["LastHarvestResult\nplayer -> item, amount, rare"]
    ActionLog["ActionLog\nlatest action + message"]
    PendingAction["PendingAction\nbusy timer"]
  end

  subgraph Bridge["Client MUD Bridge"]
    MudWorldBridge["MudWorldBridge\nsubmitPlant/Harvest/Water/Tend"]
    MudSnapshotReader["MudSnapshotReader\nreads player, inventory,\nplants, terrain, results"]
    MudHydrationSystem["MudHydrationSystem\npoll + apply snapshot"]
    OnchainWorldHydrator["OnchainWorldHydrator\ncreates/updates local plants"]
  end

  subgraph Phaser["Phaser ECS Presentation"]
    TargetActionMenu["TargetActionMenu\nPlant/Fetch/Water/Tend"]
    ActionQueue["ActionQueue + ActionSystem\nordered action execution"]
    PlantActions["PlantActions\noptimistic plant/care/harvest"]
    LocalInventory["PlayerInventory component\nactive seed slot"]
    LocalPlantState["PlantState component\nseed/growing/grown/fetched"]
    PlantCareState["PlantCareState component\nhealth/stress/care sync"]
    PlantGrowthSystem["PlantGrowthSystem\nlocal elapsed growth"]
    PlantRenderSystem["PlantRenderSystem\nsprites/stage frames"]
    PlantStatusPanel["PlantStatusPanel\nstage, growth, care, sync"]
  end

  TerrainType --> TerrainTile
  PlantType --> PlantTerrainRule
  ItemType --> ObjectState
  ObjectType --> ObjectState
  PlayerInventory --> ObjectState
  ObjectState --> InventoryObject
  TerrainTile --> PlantStateTable
  TerrainTile --> FarmTileState
  PlantType --> PlantStateTable
  PlantTerrainRule --> PlantStateTable
  PlantStateTable --> LastHarvestResult
  PlayerState --> PendingAction
  PlantStateTable --> ActionLog

  TargetActionMenu --> ActionQueue --> PlantActions
  LocalInventory --> PlantActions
  PlantActions --> MudWorldBridge
  MudWorldBridge --> Chain
  Chain --> MudSnapshotReader --> MudHydrationSystem --> OnchainWorldHydrator
  OnchainWorldHydrator --> LocalPlantState
  OnchainWorldHydrator --> PlantCareState
  LocalPlantState --> PlantGrowthSystem --> PlantRenderSystem
  PlantCareState --> PlantStatusPanel
  LocalPlantState --> PlantStatusPanel
```

## Lifecycle State Machine

```mermaid
stateDiagram-v2
  [*] --> SeedAvailable: seed item exists in inventory or SeedPouch
  SeedAvailable --> PlantOffered: focus tile is valid\nand no plant occupies tile
  PlantOffered --> PlantPending: player queues Plant
  PlantPending --> LocalSeed: Phaser consumes seed locally,\ncreates local plant,\nmarks care pending
  LocalSeed --> LocalGrowing: Phaser local growth threshold
  LocalGrowing --> LocalGrown: Phaser local growth completes

  LocalSeed --> ChainGrowing: MUD tx confirmed\nPlantState written
  LocalGrowing --> ChainGrowing: MUD tx confirmed\nPlantState written
  ChainGrowing --> LocalGrowing: hydration reconciles\nstage/care/inventory/energy
  ChainGrowing --> ChainReady: block time reaches\nadjusted growth duration
  ChainReady --> LocalGrown: Phaser elapsed growth or hydration

  LocalGrowing --> CarePending: Water or Tend queued
  LocalGrown --> CarePending: Water or Tend queued
  CarePending --> LocalCareUpdated: Phaser predicts care change
  LocalCareUpdated --> ChainCareUpdated: MUD tx confirmed
  LocalCareUpdated --> LocalGrowing: MUD tx rejected,\nrollback care/energy
  ChainCareUpdated --> LocalGrowing: hydration/callback confirms

  LocalGrown --> HarvestPending: Fetch queued
  HarvestPending --> LocalFetched: Phaser marks fetched\nand drops harvest preview
  LocalFetched --> ChainHarvested: MUD harvest confirmed
  LocalFetched --> LocalGrown: MUD tx rejected,\nrestore plant/drop/energy
  ChainHarvested --> InventoryUpdated: InventoryLib.add harvest items\nLastHarvestResult written
  InventoryUpdated --> [*]
```

## Plant Transaction Sequence

```mermaid
sequenceDiagram
  autonumber
  actor Player
  participant UI as TargetActionMenuSystem
  participant AS as ActionSystem
  participant PA as PlantActions
  participant Bridge as MudWorldBridge
  participant Farm as FarmingSystem.plant
  participant Tables as MUD Tables
  participant Hydrator as MudHydrationSystem
  participant Render as PlantGrowth/Render/UI

  Player->>UI: Focus dirt tile with selected seed
  UI->>UI: getTargetActions() adds Plant
  Player->>AS: Click Plant or press bound key
  AS->>PA: canStart plant
  PA->>PA: Resolve seed source\nactive inventory seed first,\nthen SeedPouch
  PA->>PA: Validate target has no local plant\nand inventory seed requires dirt
  AS->>PA: apply plant after action duration
  PA->>PA: Optimistically consume seed,\ncreate local PlantState,\nset PlantCareState pending
  PA->>Bridge: submitPlant(x,y,plantId)
  Bridge->>Farm: pantheon__plant(x,y,plantId)
  Farm->>Tables: require player, idle, terrain,\nnearby, plant type, no plant
  Farm->>Tables: require terrain plantable\nand PlantTerrainRule allowed
  Farm->>Tables: InventoryLib.spend(seed)
  Farm->>Tables: spend energy,\nensure FarmTileState,\nset PlantState
  Farm->>Tables: start PendingAction,\nwrite ActionLog
  Bridge->>Bridge: waitForTransactionReceipt
  Bridge->>PA: onConfirmed(playerEnergy, inventory)
  PA->>PA: settle optimistic energy,\nmark care confirmed,\nreplace inventory snapshot
  Hydrator->>Tables: poll readPlayerSnapshot
  Hydrator->>Render: hydrate PlantState/CareState\nand inventory as confirmed
  Render->>Player: plant remains visible,\nstatus panel shows confirmed state
```

## Care Sequence: Water and Tend

```mermaid
sequenceDiagram
  autonumber
  actor Player
  participant UI as TargetActionMenuSystem
  participant PA as PlantActions
  participant Bridge as MudWorldBridge
  participant Farm as FarmingSystem.water/tend
  participant Tables as MUD Tables

  Player->>UI: Focus existing plant
  UI->>Player: Shows Water and Tend
  Player->>PA: Queue Water or Tend
  PA->>PA: Snapshot local PlantCareState
  PA->>PA: Optimistically update care\nWater: moisture +28\nTend: fertility +12, stress -24
  PA->>Bridge: submitWater(x,y) or submitTend(x,y)
  Bridge->>Farm: pantheon__water or pantheon__tend
  Farm->>Tables: require player, idle,\nplant exists, nearby
  Farm->>Tables: ensure FarmTileState,\nspend energy
  alt Water
    Farm->>Tables: moisture += FARM_WATER_AMOUNT,\nlastWateredAt = now
  else Tend
    Farm->>Tables: fertility += FARM_TEND_FERTILITY_GAIN,\nstress -= FARM_TEND_STRESS_RELIEF,\nlastMaintainedAt = now
  end
  Farm->>Tables: recalculate stress/health,\nstart PendingAction,\nwrite ActionLog
  Bridge->>PA: onConfirmed or onRejected
  PA->>PA: confirmed: settle energy,\nsyncState confirmed
  PA->>PA: rejected: restore care snapshot,\nrollback energy
```

## Harvest Sequence

```mermaid
sequenceDiagram
  autonumber
  actor Player
  participant UI as TargetActionMenuSystem
  participant PA as PlantActions
  participant Bridge as MudWorldBridge
  participant Farm as FarmingSystem.harvest
  participant Inv as InventoryLib
  participant Tables as MUD Tables

  Player->>UI: Focus grown plant
  UI->>Player: Shows Fetch
  Player->>PA: Queue Fetch
  PA->>PA: Optimistically set local stage fetched\nand spawn harvest drop preview
  PA->>Bridge: submitHarvest(x,y)
  Bridge->>Farm: pantheon__harvest(x,y)
  Farm->>Tables: require plant exists,\nnot harvested, nearby, ready
  Farm->>Tables: spend energy
  Farm->>Farm: resolve yield from PlantType,\nPlantTerrainRule, stress,\nrandomness
  Farm->>Tables: PlantState.stage = HARVESTED
  Farm->>Tables: FarmTileState.exhaustion += 8
  Farm->>Inv: add harvest item\nand maybe rare item
  Farm->>Tables: write LastHarvestResult,\nstart PendingAction,\nwrite ActionLog
  Bridge->>PA: onConfirmed(result, playerEnergy)
  PA->>PA: settle energy,\nmark care confirmed,\nlog result
  PA->>PA: onRejected restores previous stage,\nremoves preview drop,\nrolls back energy
```

## Contract Responsibilities

| Area | Contract/table | Responsibility |
| --- | --- | --- |
| Plant definitions | `PlantType` | Seed item, harvest item, growth seconds, yield range, maintenance interval, moisture range, fertility need, label. |
| Terrain compatibility | `TerrainType`, `TerrainTile`, `PlantTerrainRule` | A tile must exist, be plantable, and be allowed for the plant. Terrain rules can modify growth, yield, and rare drops. |
| Plant state | `PlantState` | Authoritative plant record keyed by `x,y`: plant id, owner, planted time, stage, health, stress, maintenance timestamp. |
| Tile care | `FarmTileState` | Moisture, fertility, exhaustion, last maintained/watered timestamps. Created lazily by planting/care. |
| Inventory | `PlayerInventory`, `ObjectState`, `InventoryObject`, `InventoryLib` | Seeds are spent during planting; harvest and rare items are added during harvest. |
| Player action gating | `PlayerState`, `PendingAction`, `ActionLog` | Validates player exists, action is idle, player is nearby; spends energy; records busy duration and message. |
| Harvest result | `LastHarvestResult` | Stores the latest harvest payload so the client can report confirmed item/amount/rare drop. |

## Onchain Core Model

This is the plant system with the client removed. The core contract concept is:
plant records live at terrain coordinates, while plant definitions, terrain
rules, farm tile care, inventory, and player energy constrain how those records
can be created or changed.

```mermaid
flowchart TD
  subgraph Static["Static / Admin-Seeded Tables"]
    TerrainType["TerrainType(terrainId)\nplantable, diggable, moveCost"]
    TerrainTile["TerrainTile(x,y)\nterrainId, biomeId"]
    PlantType["PlantType(plantId)\nseedItemId, harvestItemId,\ngrowthSeconds, yield range,\ncare needs"]
    PlantTerrainRule["PlantTerrainRule(plantId, terrainId)\nallowed, growthModifier,\nyieldBonus, rareItem"]
    ItemType["ItemType(itemId)\ncategory, weight, label"]
    ObjectType["ObjectType(objectTypeId)\nitem, category, weight"]
  end

  subgraph Player["Player-Owned State"]
    PlayerState["PlayerState(player)\nx,y, energy, exists"]
    PlayerInventory["PlayerInventory(player, slot)\nslot -> objectId"]
    ObjectState["ObjectState(objectId)\nitemId, amount"]
    InventoryObject["InventoryObject(objectId)\nowner"]
  end

  subgraph Farm["Farm / Plant State"]
    FarmTileState["FarmTileState(x,y)\nmoisture, fertility,\nexhaustion, timestamps"]
    PlantState["PlantState(x,y)\nplantId, owner, plantedAt,\nstage, health, stress"]
    LastHarvestResult["LastHarvestResult(player)\nitem, amount, rare item"]
  end

  subgraph Action["Action Gating"]
    PendingAction["PendingAction(player)\naction, readyAt, x,y,value,data"]
    ActionLog["ActionLog(player)\naction, updatedAt, message"]
  end

  TerrainType --> TerrainTile
  TerrainTile --> PlantState
  PlantType --> PlantState
  PlantType --> PlantTerrainRule
  TerrainTile --> PlantTerrainRule
  TerrainTile --> FarmTileState
  FarmTileState --> PlantState
  PlantState --> LastHarvestResult
  ItemType --> ObjectState
  ObjectType --> ObjectState
  PlayerInventory --> ObjectState
  ObjectState --> InventoryObject
  PlayerState --> PendingAction
  PendingAction --> ActionLog
```

### Onchain Plant State Machine

```mermaid
stateDiagram-v2
  [*] --> EmptyTile: no PlantState(x,y)

  EmptyTile --> Growing: plant(x,y,plantId)\ncreates PlantState
  Growing --> Growing: water(x,y)\nupdates FarmTileState moisture\nand recalculates health/stress
  Growing --> Growing: tend(x,y)\nupdates fertility, timestamps,\nstress relief, health/stress
  Growing --> Ready: time >= plantedAt + adjustedGrowthSeconds
  Ready --> Ready: water/tend still allowed
  Ready --> Harvested: harvest(x,y)\nsets stage = HARVESTED\nadds inventory items
  Harvested --> [*]: plant remains as harvested record

  note right of Growing
    Onchain does not store a separate "seed" display stage.
    `plant()` writes `PLANT_STAGE_GROWING` immediately.
  end note

  note right of Ready
    Ready is derived, not stored.
    `harvest()` calls `_plantIsReady()`.
  end note
```

### Onchain Action Rules

| Action | Preconditions | State writes | Result |
| --- | --- | --- | --- |
| `plant(x,y,plantId)` | Player exists, pending action resolved, player idle, terrain tile exists, player within 1 tile, plant type exists, no `PlantState(x,y)`, terrain is plantable, plant terrain rule allows it, player has seed item. | `InventoryLib.spend(seed)`, player energy spend, lazy `FarmTileState`, `PlantState.set(...)`, `PendingAction.startBusy`, `ActionLog.write`. | A new authoritative plant exists at `x,y` with owner, planted time, health, stress, and growing stage. |
| `water(x,y)` | Player exists, idle, plant exists, player within 1 tile. | Lazy `FarmTileState`, energy spend, moisture increase, `lastWateredAt`, recalculated plant health/stress, `PendingAction`, `ActionLog`. | Tile moisture improves and plant care is recalculated. |
| `tend(x,y)` | Player exists, idle, plant exists, player within 1 tile. | Lazy `FarmTileState`, energy spend, fertility increase, last maintained timestamps, stress relief, recalculated health/stress, `PendingAction`, `ActionLog`. | Fertility/maintenance improves and stress is reduced. |
| `harvest(x,y)` | Player exists, idle, plant exists, player within 1 tile, plant is not harvested, `_plantIsReady()` returns true. | Energy spend, yield resolution, `PlantState.stage = HARVESTED`, farm exhaustion increase, `InventoryLib.add(...)`, `LastHarvestResult`, `PendingAction`, `ActionLog`. | Harvest items, and maybe rare items, are added to inventory. |

### Derived Values

```mermaid
flowchart LR
  PlantType["PlantType\nideal moisture, fertility need,\ngrowthSeconds, yield range"]
  TerrainRule["PlantTerrainRule\ngrowthModifier, yieldBonus, rare chance"]
  FarmTile["FarmTileState\nmoisture, fertility, exhaustion"]
  PlantState["PlantState\nplantedAt, stress, health"]
  Ready["_plantIsReady()\nadjusted growth time"]
  Stress["_careStress()\nmoisture/fertility/exhaustion -> stress"]
  Harvest["_resolveHarvest()\nyield + rare result"]

  PlantType --> Ready
  TerrainRule --> Ready
  PlantState --> Ready
  PlantType --> Stress
  FarmTile --> Stress
  Stress --> PlantState
  PlantType --> Harvest
  TerrainRule --> Harvest
  PlantState --> Harvest
```

- Readiness is not stored. It is computed at harvest time as
  `plantedAt + adjustedGrowthSeconds`, where `adjustedGrowthSeconds` comes from
  `PlantType.growthSeconds` and optional `PlantTerrainRule.growthModifier`.
- Stress is recomputed from tile exhaustion, moisture outside the plant's ideal
  range, and fertility below the plant's need.
- Health is `100 - stress`.
- Harvest yield starts from the plant type's min/max range, then receives terrain
  yield bonus, stress penalty or low-stress bonus, and optional rare item roll.
- Harvested plants are not deleted. The record remains with stage
  `PLANT_STAGE_HARVESTED`.

## Phaser Responsibilities

| Area | File/component | Responsibility |
| --- | --- | --- |
| Action discovery | `ActionAvailability.ts`, `TargetActionMenuSystem.ts` | Decides which actions appear for a focused tile/object. Plant appears for an available seed source and an unoccupied target. |
| Action ordering | `ActionQueue`, `ActionSystem` | Preserves intent order and waits for movement reconciliation before starting queued actions. |
| Plant action bridge | `PlantActions.ts` | Performs optimistic plant, fetch, water, and tend behavior; submits MUD transactions; rolls back rejected actions. |
| MUD bridge | `MudWorldBridge.ts` | Sends `pantheon__plant`, `pantheon__harvest`, `pantheon__water`, `pantheon__tend`; tracks pending keys to avoid duplicate submissions. |
| Snapshot reading | `MudSnapshotReader.ts` | Reads player energy, inventory, world terrain, plants, and last harvest result after confirmations or polling. |
| Hydration | `MudHydrationSystem.ts`, `OnchainWorldHydrator.ts` | Applies authoritative snapshots into local ECS plants, care, inventory, terrain, and presentation state. |
| Local growth | `PlantGrowthSystem.ts` | Advances visual stages from `seed` to `growing` to `grown` using local elapsed time. |
| Rendering/status | `PlantRenderSystem.ts`, `PlantStatusPanelSystem.ts` | Displays sprite stage, growth progress, care values, and sync state. |

## Important Notes

- Onchain `FarmingSystem.plant` writes `PlantState.stage = PLANT_STAGE_GROWING`.
  Phaser may briefly show a local `seed` stage before MUD confirmation or
  hydration maps the onchain plant back to local `growing`.
- Onchain harvest readiness uses `PlantTerrainRule.growthModifier`; the Phaser
  local growth display currently uses the base client `growthSeconds`. That can
  make a plant look locally ready before or after the contract accepts harvest on
  special terrain.
- Onchain care truth includes `FarmTileState.moisture/fertility/exhaustion` and
  `PlantState.health/stress`. The current plant snapshot hydrates local
  `health/stress`; local `moisture/fertility` may be optimistic/default unless
  separately hydrated.
- Inventory seeds are authoritative onchain. Phaser consumes the selected seed
  optimistically, then replaces inventory from the confirmation snapshot or
  restores the previous slot on rejection.
- `Fetch` is the UI label for harvest. It maps to `pantheon__harvest` onchain.
