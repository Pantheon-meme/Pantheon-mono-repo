// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import {
  ForageLootSlot,
  ForageTable,
  ItemType,
  TerrainAdmin,
  TerrainTile,
  TerrainType
} from "../codegen/index.sol";
import { PantheonConstants } from "../libraries/PantheonConstants.sol";

contract TerrainSystem is System {
  function initTerrainAdmin(address admin) public {
    require(!TerrainAdmin.getExists(PantheonConstants.TERRAIN_ADMIN_ID), "admin exists");
    TerrainAdmin.set(PantheonConstants.TERRAIN_ADMIN_ID, admin, true);
  }

  function registerTerrainType(
    bytes32 terrainId,
    string calldata label,
    bool walkable,
    bool diggable,
    bool plantable,
    uint32 sleepModifier,
    uint32 moveCost
  ) public {
    _requireTerrainAdmin();
    _setTerrainType(terrainId, label, walkable, diggable, plantable, sleepModifier, moveCost);
  }

  function seedTerrainTile(
    int32 x,
    int32 y,
    bytes32 terrainId,
    bytes32 biomeId
  ) public {
    _requireTerrainAdmin();
    _setTerrainTile(x, y, terrainId, biomeId);
  }

  function seedTerrainTiles(
    int32[] calldata xs,
    int32[] calldata ys,
    bytes32[] calldata terrainIds,
    bytes32[] calldata biomeIds
  ) public {
    _requireTerrainAdmin();
    require(
      xs.length == ys.length &&
        xs.length == terrainIds.length &&
        xs.length == biomeIds.length,
      "invalid terrain tiles"
    );

    for (uint256 i = 0; i < xs.length; i++) {
      _setTerrainTile(xs[i], ys[i], terrainIds[i], biomeIds[i]);
    }
  }

  function registerItemType(
    bytes32 itemId,
    bytes32 category,
    string calldata label
  ) public {
    _requireTerrainAdmin();
    require(itemId != bytes32(0), "empty item");

    ItemType.set(itemId, category, true, label);
  }

  function registerForageTable(
    bytes32 terrainId,
    bytes32 tableId,
    uint32 baseChance
  ) public {
    _requireTerrainAdmin();
    require(TerrainType.getExists(terrainId), "missing terrain type");
    require(tableId != bytes32(0), "empty table");
    require(baseChance <= 10000, "chance too high");

    ForageTable.set(terrainId, tableId, baseChance, true);
  }

  function registerForageLootSlot(
    bytes32 tableId,
    uint8 slot,
    bytes32 itemId,
    uint32 weight,
    uint32 minAmount,
    uint32 maxAmount,
    bool enabled
  ) public {
    _requireTerrainAdmin();
    require(slot < PantheonConstants.FORAGE_MAX_LOOT_SLOTS, "slot too high");
    require(ItemType.getExists(itemId), "missing item");
    require(weight > 0, "empty weight");
    require(minAmount > 0 && maxAmount >= minAmount, "invalid amount");

    ForageLootSlot.set(tableId, slot, itemId, weight, minAmount, maxAmount, enabled);
  }

  function setTerrainTile(
    int32 x,
    int32 y,
    bytes32 terrainId,
    bytes32 biomeId
  ) public {
    _requireTerrainAdmin();
    _setTerrainTile(x, y, terrainId, biomeId);
  }

  function _setTerrainType(
    bytes32 terrainId,
    string calldata label,
    bool walkable,
    bool diggable,
    bool plantable,
    uint32 sleepModifier,
    uint32 moveCost
  ) private {
    require(terrainId != bytes32(0), "empty terrain");
    require(moveCost > 0, "empty move cost");

    TerrainType.set(
      terrainId,
      walkable,
      diggable,
      plantable,
      sleepModifier,
      moveCost,
      true,
      label
    );
  }

  function _setTerrainTile(
    int32 x,
    int32 y,
    bytes32 terrainId,
    bytes32 biomeId
  ) private {
    require(TerrainType.getExists(terrainId), "missing terrain type");

    TerrainTile.set(x, y, terrainId, biomeId, true);
  }

  function _requireTerrainAdmin() private view {
    require(TerrainAdmin.getExists(PantheonConstants.TERRAIN_ADMIN_ID), "admin missing");
    require(
      TerrainAdmin.getAdmin(PantheonConstants.TERRAIN_ADMIN_ID) == _msgSender(),
      "not terrain admin"
    );
  }
}
