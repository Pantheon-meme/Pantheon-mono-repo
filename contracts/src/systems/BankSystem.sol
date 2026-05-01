// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import {
  BankAgent,
  BankInventoryCount,
  BankInventorySlot,
  BankItemInventory,
  BankItemPrice,
  BankObject,
  BankTradeCount,
  BankTradeReceipt,
  BankTradeReceiptData,
  CucBalance,
  InventoryObject,
  ObjectState,
  ObjectType,
  PlayerInventory,
  PlayerInventoryCapacity,
  TerrainAdmin
} from "../codegen/index.sol";
import { ActionLogLib } from "../libraries/ActionLogLib.sol";
import { PantheonConstants } from "../libraries/PantheonConstants.sol";
import { PendingActionLib } from "../libraries/PendingActionLib.sol";
import { PlayerLib } from "../libraries/PlayerLib.sol";

contract BankSystem is System {
  uint16 private constant INVENTORY_SLOT_COUNT = 256;

  struct BankTradeInput {
    address player;
    bytes32 itemId;
    bytes32 objectId;
    uint32 quantity;
    uint256 unitPrice;
    uint256 totalCuc;
    bool isPlayerSale;
  }

  function setBankAgent(address agent) public {
    _requireTerrainAdmin();
    BankAgent.set(PantheonConstants.BANK_AGENT_ID, agent, true);
  }

  function setBankItemPrice(
    bytes32 itemId,
    uint256 buyPrice,
    uint256 sellPrice,
    uint32 buyMaxQuantity,
    uint32 sellMaxQuantity,
    uint64 validUntil,
    uint32 epoch
  ) public {
    _requireBankAgentOrAdmin();
    require(itemId != bytes32(0), "missing item");
    require(buyPrice > 0 || sellPrice > 0, "missing price");

    BankItemPrice.set(
      itemId,
      buyPrice,
      sellPrice,
      buyMaxQuantity,
      sellMaxQuantity,
      validUntil,
      epoch,
      true
    );
  }

  function sellObjectsToBank(bytes32[] calldata objectIds) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(objectIds.length > 0, "missing objects");

    uint256 totalCuc = 0;

    for (uint256 index = 0; index < objectIds.length; index++) {
      bytes32 objectId = objectIds[index];
      require(ObjectState.getExists(objectId), "missing object");
      require(InventoryObject.getOwner(objectId) == player, "not carried");
      require(!BankObject.getExists(objectId), "already banked");

      bytes32 itemId = ObjectState.getItemId(objectId);
      uint32 amount = ObjectState.getAmount(objectId);
      require(amount > 0, "empty object");
      uint256 unitPrice = _validBuyPrice(itemId, amount);
      uint8 playerSlot = _inventorySlotForObject(player, objectId);

      PlayerInventory.deleteRecord(player, playerSlot);
      InventoryObject.deleteRecord(objectId);
      _addObjectToBank(objectId, itemId, amount);
      uint256 objectTotal = unitPrice * amount;
      totalCuc += objectTotal;
      _recordBankTrade(
        BankTradeInput(player, itemId, objectId, amount, unitPrice, objectTotal, true)
      );
    }

    CucBalance.set(player, CucBalance.getBalance(player) + totalCuc, true);
    ActionLogLib.write(
      player,
      PantheonConstants.ACTION_BANK_SELL,
      "Sold goods to Central Uni Bank"
    );
  }

  function buyObjectsFromBank(bytes32 itemId, uint32 quantity) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(quantity > 0, "missing quantity");

    uint256 unitPrice = _validSellPrice(itemId, quantity);
    uint256 totalCuc = unitPrice * quantity;
    require(CucBalance.getBalance(player) >= totalCuc, "missing CUC");

    uint32 remaining = quantity;
    uint32 count = BankInventoryCount.getCount(
      PantheonConstants.BANK_INVENTORY_COUNTER_ID
    );

    for (uint32 slot = 1; slot <= count && remaining > 0; slot++) {
      if (!BankInventorySlot.getExists(slot)) {
        continue;
      }

      bytes32 objectId = BankInventorySlot.getObjectId(slot);

      if (ObjectState.getItemId(objectId) != itemId) {
        continue;
      }

      uint32 amount = ObjectState.getAmount(objectId);

      if (amount == 0 || amount > remaining) {
        continue;
      }

      _removeObjectFromBank(slot, objectId, itemId, amount);
      _addObjectToPlayer(player, objectId);
      remaining -= amount;
      _recordBankTrade(
        BankTradeInput(
          player,
          itemId,
          objectId,
          amount,
          unitPrice,
          unitPrice * amount,
          false
        )
      );
    }

    require(remaining == 0, "bank inventory low");
    CucBalance.set(player, CucBalance.getBalance(player) - totalCuc, true);
    ActionLogLib.write(
      player,
      PantheonConstants.ACTION_BANK_BUY,
      "Bought goods from Central Uni Bank"
    );
  }

  function _validBuyPrice(
    bytes32 itemId,
    uint32 amount
  ) private view returns (uint256) {
    require(BankItemPrice.getExists(itemId), "bank not buying item");
    _requirePriceFresh(itemId);

    uint256 buyPrice = BankItemPrice.getBuyPrice(itemId);
    uint32 maxQuantity = BankItemPrice.getBuyMaxQuantity(itemId);
    require(buyPrice > 0, "bank not buying item");
    require(maxQuantity == 0 || amount <= maxQuantity, "buy quantity too high");

    return buyPrice;
  }

  function _validSellPrice(
    bytes32 itemId,
    uint32 quantity
  ) private view returns (uint256) {
    require(BankItemPrice.getExists(itemId), "bank not selling item");
    _requirePriceFresh(itemId);

    uint256 sellPrice = BankItemPrice.getSellPrice(itemId);
    uint32 maxQuantity = BankItemPrice.getSellMaxQuantity(itemId);
    require(sellPrice > 0, "bank not selling item");
    require(maxQuantity == 0 || quantity <= maxQuantity, "sell quantity too high");
    require(BankItemInventory.getQuantity(itemId) >= quantity, "bank inventory low");

    return sellPrice;
  }

  function _requirePriceFresh(bytes32 itemId) private view {
    uint64 validUntil = BankItemPrice.getValidUntil(itemId);
    require(validUntil == 0 || block.timestamp <= validUntil, "price expired");
  }

  function _addObjectToBank(
    bytes32 objectId,
    bytes32 itemId,
    uint32 amount
  ) private {
    uint32 slot = BankInventoryCount.getCount(
      PantheonConstants.BANK_INVENTORY_COUNTER_ID
    ) + 1;

    BankInventoryCount.set(
      PantheonConstants.BANK_INVENTORY_COUNTER_ID,
      slot,
      true
    );
    BankInventorySlot.set(slot, objectId, true);
    BankObject.set(objectId, slot, true);
    BankItemInventory.set(
      itemId,
      BankItemInventory.getQuantity(itemId) + amount,
      true
    );
  }

  function _removeObjectFromBank(
    uint32 slot,
    bytes32 objectId,
    bytes32 itemId,
    uint32 amount
  ) private {
    BankInventorySlot.deleteRecord(slot);
    BankObject.deleteRecord(objectId);
    BankItemInventory.set(
      itemId,
      BankItemInventory.getQuantity(itemId) - amount,
      true
    );
  }

  function _addObjectToPlayer(address player, bytes32 objectId) private {
    uint32 maxWeight = _playerInventoryMaxWeight(player);
    uint32 currentWeight = _playerInventoryWeight(player);
    uint32 objectWeight = _objectWeight(objectId);
    require(currentWeight + objectWeight <= maxWeight, "inventory full");

    uint8 slot = _firstFreeInventorySlot(player);
    PlayerInventory.set(player, slot, objectId, true);
    InventoryObject.set(objectId, player, true);
  }

  function _recordBankTrade(BankTradeInput memory trade) private {
    uint32 tradeId = BankTradeCount.getCount(
      PantheonConstants.BANK_TRADE_COUNTER_ID
    ) + 1;

    BankTradeCount.set(PantheonConstants.BANK_TRADE_COUNTER_ID, tradeId, true);
    BankTradeReceipt.set(
      tradeId,
      BankTradeReceiptData(
        trade.player,
        trade.itemId,
        trade.objectId,
        trade.quantity,
        trade.unitPrice,
        trade.totalCuc,
        trade.isPlayerSale,
        BankItemPrice.getEpoch(trade.itemId),
        uint64(block.timestamp),
        true
      )
    );
  }

  function _requireBankAgentOrAdmin() private view {
    if (
      BankAgent.getExists(PantheonConstants.BANK_AGENT_ID) &&
      BankAgent.getAgent(PantheonConstants.BANK_AGENT_ID) == _msgSender()
    ) {
      return;
    }

    _requireTerrainAdmin();
  }

  function _requireTerrainAdmin() private view {
    require(TerrainAdmin.getExists(PantheonConstants.TERRAIN_ADMIN_ID), "admin missing");
    require(
      TerrainAdmin.getAdmin(PantheonConstants.TERRAIN_ADMIN_ID) == _msgSender(),
      "not terrain admin"
    );
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
}
