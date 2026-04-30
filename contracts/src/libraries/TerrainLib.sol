// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { TerrainTile, TerrainType } from "../codegen/index.sol";

library TerrainLib {
  function requireTileExists(int32 x, int32 y) internal view {
    require(TerrainTile.getExists(x, y), "missing terrain");
  }

  function terrainAt(int32 x, int32 y) internal view returns (bytes32) {
    requireTileExists(x, y);
    return TerrainTile.getTerrainId(x, y);
  }

  function requireTerrainType(bytes32 terrainId) internal view {
    require(TerrainType.getExists(terrainId), "missing terrain type");
  }

  function requireWalkable(int32 x, int32 y) internal view returns (bytes32) {
    bytes32 terrainId = terrainAt(x, y);
    requireTerrainType(terrainId);
    require(TerrainType.getWalkable(terrainId), "terrain blocked");
    return terrainId;
  }

  function requireDiggable(int32 x, int32 y) internal view returns (bytes32) {
    bytes32 terrainId = terrainAt(x, y);
    requireTerrainType(terrainId);
    require(TerrainType.getDiggable(terrainId), "terrain not diggable");
    return terrainId;
  }

  function requirePlantable(int32 x, int32 y) internal view returns (bytes32) {
    bytes32 terrainId = terrainAt(x, y);
    requireTerrainType(terrainId);
    require(TerrainType.getPlantable(terrainId), "terrain not plantable");
    return terrainId;
  }

  function moveCostAt(int32 x, int32 y) internal view returns (uint32) {
    bytes32 terrainId = terrainAt(x, y);
    requireTerrainType(terrainId);
    return TerrainType.getMoveCost(terrainId);
  }
}
