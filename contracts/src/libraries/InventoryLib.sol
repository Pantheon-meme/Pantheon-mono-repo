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
      uint8 slot = _firstFreeSlot(player, maxWeight);
      require(
        _usedWeight(player, maxWeight) + _itemWeight(itemId) <= maxWeight,
        "inventory full"
      );

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
    uint32 maxWeight = _maxWeight(player);

    for (uint8 slot = 0; slot < uint8(maxWeight) && remaining > 0; slot++) {
      if (!PlayerInventory.getExists(player, slot)) {
        continue;
      }

      bytes32 objectId = PlayerInventory.getObjectId(player, slot);

      if (ObjectState.getItemId(objectId) != itemId) {
        continue;
      }

      PlayerInventory.deleteRecord(player, slot);
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

  function _firstFreeSlot(address player, uint32 maxWeight) private view returns (uint8) {
    require(maxWeight <= type(uint8).max, "inventory too large");

    for (uint8 slot = 0; slot < uint8(maxWeight); slot++) {
      if (!PlayerInventory.getExists(player, slot)) {
        return slot;
      }
    }

    revert("inventory full");
  }

  function _usedWeight(
    address player,
    uint32 maxWeight
  ) private view returns (uint32 totalWeight) {
    require(maxWeight <= type(uint8).max, "inventory too large");

    for (uint8 slot = 0; slot < uint8(maxWeight); slot++) {
      if (PlayerInventory.getExists(player, slot)) {
        totalWeight += _itemWeight(
          ObjectState.getItemId(PlayerInventory.getObjectId(player, slot))
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
