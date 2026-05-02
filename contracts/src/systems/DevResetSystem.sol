// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import {
  ActionLog,
  FarmTileState,
  ForageNonce,
  ForageState,
  InventoryObject,
  LastForageResult,
  LastHarvestResult,
  ObjectState,
  PendingAction,
  PlantState,
  PlayerInventory,
  PlayerInventoryCapacity,
  PlayerState,
  TerrainAdmin,
  TerrainState,
  WorldObject,
  WorldObjectCount
} from "../codegen/index.sol";
import { PantheonConstants } from "../libraries/PantheonConstants.sol";

contract DevResetSystem is System {
  function resetCurrentPlayerAndWorldObjects() public {
    _requireTerrainAdmin();

    _resetPlayer(_msgSender());
    _resetWorldObjects(1, WorldObjectCount.getCount(PantheonConstants.WORLD_OBJECT_COUNTER_ID));
    WorldObjectCount.deleteRecord(PantheonConstants.WORLD_OBJECT_COUNTER_ID);
  }

  function resetPlayer(address player) public {
    _requireTerrainAdmin();

    _resetPlayer(player);
  }

  function resetWorldObjects(uint32 startIndex, uint32 endIndex, bool clearCounter) public {
    _requireTerrainAdmin();

    _resetWorldObjects(startIndex, endIndex);

    if (clearCounter) {
      WorldObjectCount.deleteRecord(PantheonConstants.WORLD_OBJECT_COUNTER_ID);
    }
  }

  function resetRuntimeCells(
    int32[] calldata xs,
    int32[] calldata ys,
    bool resetTerrainState
  ) public {
    _requireTerrainAdmin();
    require(xs.length == ys.length, "invalid cells");

    for (uint256 i = 0; i < xs.length; i++) {
      int32 x = xs[i];
      int32 y = ys[i];

      ForageState.deleteRecord(x, y);
      PlantState.deleteRecord(x, y);
      FarmTileState.deleteRecord(x, y);

      if (resetTerrainState) {
        TerrainState.deleteRecord(x, y);
      }
    }
  }

  function _resetPlayer(address player) private {
    for (uint16 slot = 0; slot <= uint16(type(uint8).max); slot++) {
      uint8 inventorySlot = uint8(slot);

      if (!PlayerInventory.getExists(player, inventorySlot)) {
        continue;
      }

      bytes32 objectId = PlayerInventory.getObjectId(player, inventorySlot);

      PlayerInventory.deleteRecord(player, inventorySlot);
      InventoryObject.deleteRecord(objectId);
      ObjectState.deleteRecord(objectId);
    }

    PlayerInventoryCapacity.deleteRecord(player);
    PlayerState.deleteRecord(player);
    PendingAction.deleteRecord(player);
    ActionLog.deleteRecord(player);
    ForageNonce.deleteRecord(player);
    LastForageResult.deleteRecord(player);
    LastHarvestResult.deleteRecord(player);
  }

  function _resetWorldObjects(uint32 startIndex, uint32 endIndex) private {
    require(startIndex > 0, "invalid start");

    for (uint32 index = startIndex; index <= endIndex; index++) {
      bytes32 objectId = bytes32(uint256(index));

      WorldObject.deleteRecord(objectId);
      InventoryObject.deleteRecord(objectId);
      ObjectState.deleteRecord(objectId);
    }
  }

  function _requireTerrainAdmin() private view {
    require(TerrainAdmin.getExists(PantheonConstants.TERRAIN_ADMIN_ID), "admin missing");
    require(
      TerrainAdmin.getAdmin(PantheonConstants.TERRAIN_ADMIN_ID) == _msgSender(),
      "not terrain admin"
    );
  }
}
