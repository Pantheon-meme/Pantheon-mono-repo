// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {
  InventoryObject,
  ObjectState,
  ObjectType,
  PlayerInventory,
  PlayerInventoryCapacity,
  WorldObjectCount
} from "../codegen/index.sol";
import { PantheonConstants } from "./PantheonConstants.sol";

library InventoryLib {
  uint16 private constant INVENTORY_SLOT_COUNT = 256;

  function add(address player, bytes32 itemId, uint32 amount) internal {
    if (amount == 0) {
      return;
    }

    bytes32 counterId = PantheonConstants.WORLD_OBJECT_COUNTER_ID;
    uint32 count = WorldObjectCount.getCount(counterId);

    for (uint32 index = 0; index < amount; index++) {
      count += 1;
      bytes32 objectId = bytes32(uint256(count));
      uint32 maxWeight = _maxWeight(player);
      require(
        _usedWeight(player) + _itemWeight(itemId) <= maxWeight,
        "inventory full"
      );
      uint8 slot = _firstFreeSlot(player);

      ObjectState.set(objectId, itemId, itemId, 1, true);
      InventoryObject.set(objectId, player, true);
      PlayerInventory.set(player, slot, objectId, true);
    }

    WorldObjectCount.set(counterId, count, true);
  }

  function spend(address player, bytes32 itemId, uint32 amount) internal {
    if (amount == 0) {
      return;
    }

    uint32 remaining = amount;

    for (uint16 slot = 0; slot < INVENTORY_SLOT_COUNT && remaining > 0; slot++) {
      uint8 inventorySlot = uint8(slot);

      if (!PlayerInventory.getExists(player, inventorySlot)) {
        continue;
      }

      bytes32 objectId = PlayerInventory.getObjectId(player, inventorySlot);

      if (ObjectState.getItemId(objectId) != itemId) {
        continue;
      }

      PlayerInventory.deleteRecord(player, inventorySlot);
      InventoryObject.deleteRecord(objectId);
      ObjectState.deleteRecord(objectId);
      remaining -= 1;
    }

    require(remaining == 0, "missing item");
  }

  function _maxWeight(address player) private view returns (uint32) {
    uint32 maxWeight = PlayerInventoryCapacity.getExists(player)
      ? PlayerInventoryCapacity.getMaxWeight(player)
      : PantheonConstants.DEFAULT_INVENTORY_MAX_WEIGHT;

    return maxWeight == 0 ? PantheonConstants.DEFAULT_INVENTORY_MAX_WEIGHT : maxWeight;
  }

  function _firstFreeSlot(address player) private view returns (uint8) {
    for (uint16 slot = 0; slot < INVENTORY_SLOT_COUNT; slot++) {
      uint8 inventorySlot = uint8(slot);

      if (!PlayerInventory.getExists(player, inventorySlot)) {
        return inventorySlot;
      }
    }

    revert("inventory slots exhausted");
  }

  function _usedWeight(address player) private view returns (uint32 totalWeight) {
    for (uint16 slot = 0; slot < INVENTORY_SLOT_COUNT; slot++) {
      uint8 inventorySlot = uint8(slot);

      if (PlayerInventory.getExists(player, inventorySlot)) {
        totalWeight += _itemWeight(
          ObjectState.getItemId(PlayerInventory.getObjectId(player, inventorySlot))
        );
      }
    }
  }

  function _itemWeight(bytes32 itemId) private view returns (uint32) {
    if (ObjectType.getExists(itemId) && ObjectType.getWeight(itemId) > 0) {
      return ObjectType.getWeight(itemId);
    }

    return 1;
  }
}
