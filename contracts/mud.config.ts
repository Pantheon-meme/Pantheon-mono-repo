import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  namespace: "pantheon",
  tables: {
    PlayerState: {
      schema: {
        player: "address",
        x: "int32",
        y: "int32",
        energy: "uint32",
        maxEnergy: "uint32",
        lastMoveAt: "uint64",
        moveSpeed: "uint32",
        exists: "bool",
      },
      key: ["player"],
    },
    TerrainState: {
      schema: {
        x: "int32",
        y: "int32",
        material: "bytes32",
        digDepth: "uint32",
        loosened: "bool",
      },
      key: ["x", "y"],
    },
    TerrainAdmin: {
      schema: {
        id: "bytes32",
        admin: "address",
        exists: "bool",
      },
      key: ["id"],
    },
    TerrainType: {
      schema: {
        terrainId: "bytes32",
        walkable: "bool",
        diggable: "bool",
        plantable: "bool",
        sleepModifier: "uint32",
        moveCost: "uint32",
        exists: "bool",
        label: "string",
      },
      key: ["terrainId"],
    },
    TerrainTile: {
      schema: {
        x: "int32",
        y: "int32",
        terrainId: "bytes32",
        biomeId: "bytes32",
        exists: "bool",
      },
      key: ["x", "y"],
    },
    PlantState: {
      schema: {
        x: "int32",
        y: "int32",
        plantId: "bytes32",
        owner: "address",
        plantedAt: "uint64",
        stage: "uint8",
        exists: "bool",
      },
      key: ["x", "y"],
    },
    ActionLog: {
      schema: {
        player: "address",
        action: "bytes32",
        updatedAt: "uint64",
        message: "string",
      },
      key: ["player"],
    },
    PendingAction: {
      schema: {
        player: "address",
        action: "bytes32",
        readyAt: "uint64",
        x: "int32",
        y: "int32",
        value: "uint32",
        data: "bytes32",
        exists: "bool",
      },
      key: ["player"],
    },
    WorldTime: {
      schema: {
        id: "bytes32",
        startedAt: "uint64",
        dayLength: "uint64",
        exists: "bool",
      },
      key: ["id"],
    },
  },
});
