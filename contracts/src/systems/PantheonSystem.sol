// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {System} from "@latticexyz/world/src/System.sol";
import {ForageLootSlot, ForageNonce, ForageState, ForageTable, InventoryObject, LastForageResult, ObjectState, ObjectType, PlayerInventory, PlayerInventoryCapacity, TerrainState, TerrainTile, WorldObject, WorldObjectCount} from "../codegen/index.sol";
import {ActionLogLib} from "../libraries/ActionLogLib.sol";
import {PantheonConstants} from "../libraries/PantheonConstants.sol";
import {PendingActionLib} from "../libraries/PendingActionLib.sol";
import {PlayerLib} from "../libraries/PlayerLib.sol";

contract PantheonSystem is System {
  uint16 private constant INVENTORY_SLOT_COUNT = 256;

  struct ForageResult {
    bytes32 itemId;
    uint32 amount;
  }

  function sleep() public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);

    PendingActionLib.startSleep(player);
  }

  function resolveAction() public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
  }

  function dig(int32 x, int32 y) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(TerrainTile.getExists(x, y), "missing terrain");
    PlayerLib.requireNear(player, x, y, "dig too far");

    bytes32 terrainId = TerrainTile.getTerrainId(x, y);
    require(
      terrainId != PantheonConstants.TERRAIN_PATH &&
        terrainId != PantheonConstants.TERRAIN_WATER &&
        terrainId != PantheonConstants.TERRAIN_SWAMP,
      "terrain not diggable"
    );
    require(
      TerrainState.getDigDepth(x, y) < PantheonConstants.MAX_DIG_LEVEL,
      "already dug"
    );

    PlayerLib.spendEnergy(player, PantheonConstants.DIG_ENERGY_COST);

    TerrainState.set(
      x,
      y,
      PantheonConstants.TERRAIN_DIRT,
      PantheonConstants.MAX_DIG_LEVEL,
      true
    );
    PendingActionLib.startBusy(
      player,
      PantheonConstants.ACTION_DIG,
      PantheonConstants.DIG_DURATION
    );
    ActionLogLib.write(player, PantheonConstants.ACTION_DIG, "Dug soil");
  }

  function forage(int32 x, int32 y) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(TerrainTile.getExists(x, y), "missing terrain");
    PlayerLib.requireNear(player, x, y, "forage too far");

    bytes32 terrainId = TerrainTile.getTerrainId(x, y);
    require(ForageTable.getExists(terrainId), "terrain not forageable");

    uint64 lastForagedAt = ForageState.getLastForagedAt(x, y);
    uint64 recoverAfter = lastForagedAt + PantheonConstants.DEFAULT_DAY_LENGTH;
    require(
      lastForagedAt == 0 || block.timestamp >= recoverAfter,
      "tile recovering"
    );

    PlayerLib.spendEnergy(player, PantheonConstants.FORAGE_ENERGY_COST);

    uint32 nonce = ForageNonce.getValue(player);
    bytes32 entropy = keccak256(
      abi.encodePacked(
        player,
        x,
        y,
        terrainId,
        nonce,
        block.prevrandao,
        block.timestamp
      )
    );

    ForageNonce.set(player, nonce + 1, true);
    ForageState.set(x, y, uint64(block.timestamp), true);

    ForageResult memory result = _resolveForage(terrainId, entropy);
    LastForageResult.set(player, x, y, result.itemId, result.amount, true);

    if (result.amount > 0) {
      _spawnForageObjects(player, x, y, result.itemId, result.amount);
      ActionLogLib.write(
        player,
        PantheonConstants.ACTION_FORAGE,
        "Foraged resource"
      );
    } else {
      ActionLogLib.write(
        player,
        PantheonConstants.ACTION_FORAGE,
        "Foraged nothing"
      );
    }

    PendingActionLib.startBusy(
      player,
      PantheonConstants.ACTION_FORAGE,
      PantheonConstants.FORAGE_DURATION
    );
  }

  function pickupObject(bytes32 objectId) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(WorldObject.getExists(objectId), "missing object");
    require(ObjectState.getExists(objectId), "missing object state");
    require(!InventoryObject.getExists(objectId), "already picked up");

    PlayerLib.requireNear(
      player,
      WorldObject.getX(objectId),
      WorldObject.getY(objectId),
      "object too far"
    );

    uint32 maxWeight = _playerInventoryMaxWeight(player);
    uint32 currentWeight = _playerInventoryWeight(player);
    uint32 objectWeight = _objectWeight(objectId);
    require(currentWeight + objectWeight <= maxWeight, "inventory full");
    uint8 slot = _firstFreeInventorySlot(player);

    PlayerInventory.set(player, slot, objectId, true);
    InventoryObject.set(objectId, player, true);
    WorldObject.deleteRecord(objectId);
    ActionLogLib.write(player, bytes32("pickup"), "Picked up object");
  }

  function dropObject(bytes32 objectId, int32 x, int32 y) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(ObjectState.getExists(objectId), "missing object state");
    require(InventoryObject.getOwner(objectId) == player, "not carried");
    require(TerrainTile.getExists(x, y), "missing terrain");
    PlayerLib.requireNear(player, x, y, "drop too far");

    uint8 slot = _inventorySlotForObject(player, objectId);

    PlayerInventory.deleteRecord(player, slot);
    InventoryObject.deleteRecord(objectId);
    WorldObject.set(objectId, x, y, player, uint64(block.timestamp), true);
    ActionLogLib.write(player, bytes32("drop"), "Dropped object");
  }

  function getPlayerInventory(
    address player
  )
    public
    view
    returns (
      uint32 maxWeight,
      uint8[] memory slots,
      bytes32[] memory objectIds,
      bytes32[] memory objectTypeIds,
      bytes32[] memory itemIds,
      uint32[] memory amounts,
      uint32[] memory weights
    )
  {
    maxWeight = _playerInventoryMaxWeight(player);
    uint16 count = 0;

    for (uint16 slot = 0; slot < INVENTORY_SLOT_COUNT; slot++) {
      if (PlayerInventory.getExists(player, uint8(slot))) {
        count += 1;
      }
    }

    slots = new uint8[](count);
    objectIds = new bytes32[](count);
    objectTypeIds = new bytes32[](count);
    itemIds = new bytes32[](count);
    amounts = new uint32[](count);
    weights = new uint32[](count);

    uint16 index = 0;
    for (uint16 slot = 0; slot < INVENTORY_SLOT_COUNT; slot++) {
      uint8 inventorySlot = uint8(slot);

      if (!PlayerInventory.getExists(player, inventorySlot)) {
        continue;
      }

      bytes32 objectId = PlayerInventory.getObjectId(player, inventorySlot);
      slots[index] = inventorySlot;
      objectIds[index] = objectId;
      objectTypeIds[index] = ObjectState.getObjectTypeId(objectId);
      itemIds[index] = ObjectState.getItemId(objectId);
      amounts[index] = ObjectState.getAmount(objectId);
      weights[index] = _objectWeight(objectId);
      index += 1;
    }
  }

  function getLastForageResult(
    address player
  )
    public
    view
    returns (int32 x, int32 y, bytes32 itemId, uint32 amount, bool exists)
  {
    return (
      LastForageResult.getX(player),
      LastForageResult.getY(player),
      LastForageResult.getItemId(player),
      LastForageResult.getAmount(player),
      LastForageResult.getExists(player)
    );
  }

  function getWorldObjectCount() public view returns (uint32 count) {
    return WorldObjectCount.getCount(PantheonConstants.WORLD_OBJECT_COUNTER_ID);
  }

  function getWorldObject(
    uint32 index
  )
    public
    view
    returns (
      bytes32 objectId,
      int32 x,
      int32 y,
      bytes32 itemId,
      uint32 amount,
      address spawnedBy,
      uint64 createdAt,
      bool exists
    )
  {
    objectId = bytes32(uint256(index));

    return (
      objectId,
      WorldObject.getX(objectId),
      WorldObject.getY(objectId),
      ObjectState.getItemId(objectId),
      ObjectState.getAmount(objectId),
      WorldObject.getSpawnedBy(objectId),
      WorldObject.getCreatedAt(objectId),
      WorldObject.getExists(objectId)
    );
  }

  function _spawnForageObjects(
    address player,
    int32 x,
    int32 y,
    bytes32 itemId,
    uint32 amount
  ) private {
    bytes32 counterId = PantheonConstants.WORLD_OBJECT_COUNTER_ID;
    uint32 count = WorldObjectCount.getCount(counterId);

    for (uint32 i = 0; i < amount; i++) {
      count += 1;
      _spawnWorldObject(bytes32(uint256(count)), player, x, y, itemId);
    }

    WorldObjectCount.set(counterId, count, true);
  }

  function _spawnWorldObject(
    bytes32 objectId,
    address player,
    int32 x,
    int32 y,
    bytes32 itemId
  ) private {
    ObjectState.set(objectId, itemId, itemId, 1, true);
    WorldObject.setX(objectId, x);
    WorldObject.setY(objectId, y);
    WorldObject.setSpawnedBy(objectId, player);
    WorldObject.setCreatedAt(objectId, uint64(block.timestamp));
    WorldObject.setExists(objectId, true);
  }

  function _playerInventoryMaxWeight(
    address player
  ) private view returns (uint32) {
    uint32 maxWeight = PlayerInventoryCapacity.getExists(player)
      ? PlayerInventoryCapacity.getMaxWeight(player)
      : PantheonConstants.DEFAULT_INVENTORY_MAX_WEIGHT;

    return
      maxWeight == 0
        ? PantheonConstants.DEFAULT_INVENTORY_MAX_WEIGHT
        : maxWeight;
  }

  function _firstFreeInventorySlot(
    address player
  ) private view returns (uint8) {
    for (uint16 slot = 0; slot < INVENTORY_SLOT_COUNT; slot++) {
      uint8 inventorySlot = uint8(slot);

      if (!PlayerInventory.getExists(player, inventorySlot)) {
        return inventorySlot;
      }
    }

    revert("inventory slots exhausted");
  }

  function _inventorySlotForObject(
    address player,
    bytes32 objectId
  ) private view returns (uint8) {
    for (uint16 slot = 0; slot < INVENTORY_SLOT_COUNT; slot++) {
      uint8 inventorySlot = uint8(slot);

      if (
        PlayerInventory.getExists(player, inventorySlot) &&
        PlayerInventory.getObjectId(player, inventorySlot) == objectId
      ) {
        return inventorySlot;
      }
    }

    revert("object not in inventory");
  }

  function _playerInventoryWeight(
    address player
  ) private view returns (uint32 totalWeight) {
    for (uint16 slot = 0; slot < INVENTORY_SLOT_COUNT; slot++) {
      uint8 inventorySlot = uint8(slot);

      if (PlayerInventory.getExists(player, inventorySlot)) {
        totalWeight += _objectWeight(
          PlayerInventory.getObjectId(player, inventorySlot)
        );
      }
    }
  }

  function _objectWeight(bytes32 objectId) private view returns (uint32) {
    bytes32 objectTypeId = ObjectState.getObjectTypeId(objectId);

    if (objectTypeId != bytes32(0) && ObjectType.getExists(objectTypeId)) {
      uint32 objectTypeWeight = ObjectType.getWeight(objectTypeId);

      if (objectTypeWeight > 0) {
        return objectTypeWeight;
      }
    }

    return 1;
  }

  function _resolveForage(
    bytes32 terrainId,
    bytes32 entropy
  ) private view returns (ForageResult memory result) {
    uint32 baseChance = ForageTable.getBaseChance(terrainId);
    result.amount = _resolveForageAmount(
      uint256(keccak256(abi.encodePacked(entropy, "amount"))),
      baseChance
    );

    if (result.amount == 0) {
      return result;
    }

    bytes32 tableId = ForageTable.getTableId(terrainId);
    uint32 totalWeight = 0;

    for (
      uint8 slot = 0;
      slot < PantheonConstants.FORAGE_MAX_LOOT_SLOTS;
      slot++
    ) {
      if (ForageLootSlot.getEnabled(tableId, slot)) {
        totalWeight += ForageLootSlot.getWeight(tableId, slot);
      }
    }

    if (totalWeight == 0) {
      result.amount = 0;
      return result;
    }

    uint32 lootRoll = uint32(
      uint256(keccak256(abi.encodePacked(entropy, "loot"))) % totalWeight
    );
    uint32 cursor = 0;

    for (
      uint8 slot = 0;
      slot < PantheonConstants.FORAGE_MAX_LOOT_SLOTS;
      slot++
    ) {
      if (!ForageLootSlot.getEnabled(tableId, slot)) {
        continue;
      }

      cursor += ForageLootSlot.getWeight(tableId, slot);

      if (lootRoll < cursor) {
        result.itemId = ForageLootSlot.getItemId(tableId, slot);
        uint32 minAmount = ForageLootSlot.getMinAmount(tableId, slot);
        uint32 maxAmount = ForageLootSlot.getMaxAmount(tableId, slot);

        if (maxAmount > minAmount) {
          uint32 range = maxAmount - minAmount + 1;
          uint32 bonus = uint32(
            uint256(keccak256(abi.encodePacked(entropy, "range"))) % range
          );
          result.amount = minAmount + bonus;
        }

        return result;
      }
    }

    result.amount = 0;
  }

  function _resolveForageAmount(
    uint256 rollSeed,
    uint32 baseChance
  ) private pure returns (uint32) {
    uint256 roll = rollSeed % 10000;
    uint256 twoDropChance = baseChance + (baseChance / 4);
    uint256 threeDropChance = twoDropChance + (baseChance / 20);

    if (roll < baseChance) {
      return 1;
    }

    if (roll < twoDropChance) {
      return 2;
    }

    if (roll < threeDropChance) {
      return 3;
    }

    return 0;
  }

}
