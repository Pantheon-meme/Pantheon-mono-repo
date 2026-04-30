// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import {
  ForageLootSlot,
  ForageNonce,
  ForageState,
  ForageTable,
  LastForageResult,
  PlantState,
  TerrainState,
  TerrainTile
} from "../codegen/index.sol";
import { ActionLogLib } from "../libraries/ActionLogLib.sol";
import { InventoryLib } from "../libraries/InventoryLib.sol";
import { PantheonConstants } from "../libraries/PantheonConstants.sol";
import { PendingActionLib } from "../libraries/PendingActionLib.sol";
import { PlayerLib } from "../libraries/PlayerLib.sol";

contract PantheonSystem is System {
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
    PlayerLib.spendEnergy(player, PantheonConstants.DIG_ENERGY_COST);

    uint32 depth = TerrainState.getDigDepth(x, y);
    bool loosened = TerrainState.getLoosened(x, y);
    TerrainState.set(
      x,
      y,
      PantheonConstants.TERRAIN_DIRT,
      loosened ? depth + 1 : depth,
      true
    );
    ActionLogLib.write(player, PantheonConstants.ACTION_DIG, "Dug soil");
  }

  function forage(int32 x, int32 y) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(TerrainTile.getExists(x, y), "missing terrain");
    require(_isNearPlayer(player, x, y), "forage too far");

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
      InventoryLib.add(player, result.itemId, result.amount);
      ActionLogLib.write(player, PantheonConstants.ACTION_FORAGE, "Foraged resource");
    } else {
      ActionLogLib.write(player, PantheonConstants.ACTION_FORAGE, "Foraged nothing");
    }
  }

  function plant(int32 x, int32 y, bytes32 plantId) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(!PlantState.getExists(x, y), "plant exists");
    PlayerLib.spendEnergy(player, PantheonConstants.PLANT_ENERGY_COST);

    PlantState.set(
      x,
      y,
      plantId,
      player,
      uint64(block.timestamp),
      PantheonConstants.PLANT_STAGE_GROWING,
      true
    );
    ActionLogLib.write(player, PantheonConstants.ACTION_PLANT, "Planted seed");
  }

  function harvest(int32 x, int32 y) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(PlantState.getExists(x, y), "missing plant");

    PlantState.setStage(x, y, PantheonConstants.PLANT_STAGE_HARVESTED);
    ActionLogLib.write(player, PantheonConstants.ACTION_HARVEST, "Harvested plant");
  }

  function getLastForageResult(
    address player
  ) public view returns (int32 x, int32 y, bytes32 itemId, uint32 amount, bool exists) {
    return (
      LastForageResult.getX(player),
      LastForageResult.getY(player),
      LastForageResult.getItemId(player),
      LastForageResult.getAmount(player),
      LastForageResult.getExists(player)
    );
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

    for (uint8 slot = 0; slot < PantheonConstants.FORAGE_MAX_LOOT_SLOTS; slot++) {
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

    for (uint8 slot = 0; slot < PantheonConstants.FORAGE_MAX_LOOT_SLOTS; slot++) {
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

  function _isNearPlayer(address player, int32 x, int32 y) private view returns (bool) {
    (int32 playerX, int32 playerY) = PlayerLib.getPosition(player);

    int32 dx = x > playerX ? x - playerX : playerX - x;
    int32 dy = y > playerY ? y - playerY : playerY - y;

    return dx <= 1 && dy <= 1;
  }
}
