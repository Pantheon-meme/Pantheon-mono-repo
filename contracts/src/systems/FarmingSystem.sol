// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {System} from "@latticexyz/world/src/System.sol";
import {FarmTileState, LastHarvestResult, ObjectState, PlantState, PlantTerrainRule, PlantType, TerrainTile, TerrainType, WorldObject, WorldObjectCount} from "../codegen/index.sol";
import {ActionLogLib} from "../libraries/ActionLogLib.sol";
import {InventoryLib} from "../libraries/InventoryLib.sol";
import {PantheonConstants} from "../libraries/PantheonConstants.sol";
import {PendingActionLib} from "../libraries/PendingActionLib.sol";
import {PlayerLib} from "../libraries/PlayerLib.sol";

contract FarmingSystem is System {
  struct HarvestResult {
    bytes32 itemId;
    uint32 amount;
    bytes32 rareItemId;
    uint32 rareAmount;
  }

  function plant(int32 x, int32 y, bytes32 plantId) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(TerrainTile.getExists(x, y), "missing terrain");
    PlayerLib.requireNear(player, x, y, "plant too far");
    require(PlantType.getExists(plantId), "missing plant type");
    require(!PlantState.getExists(x, y), "plant exists");

    bytes32 terrainId = TerrainTile.getTerrainId(x, y);
    require(TerrainType.getPlantable(terrainId), "terrain not plantable");
    require(
      _plantAllowedOnTerrain(plantId, terrainId),
      "plant dislikes terrain"
    );

    InventoryLib.spend(player, PlantType.getSeedItemId(plantId), 1);
    PlayerLib.spendEnergy(player, PantheonConstants.PLANT_ENERGY_COST);
    _ensureFarmTile(x, y, terrainId);

    PlantState.set(
      x,
      y,
      plantId,
      player,
      uint64(block.timestamp),
      PantheonConstants.PLANT_STAGE_GROWING,
      PantheonConstants.FARM_MAX_CARE,
      _initialPlantStress(plantId, x, y),
      uint64(block.timestamp),
      true
    );
    PendingActionLib.startBusy(
      player,
      PantheonConstants.ACTION_PLANT,
      PantheonConstants.PLANT_DURATION
    );
    ActionLogLib.write(player, PantheonConstants.ACTION_PLANT, "Planted seed");
  }

  function harvest(int32 x, int32 y) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(PlantState.getExists(x, y), "missing plant");
    PlayerLib.requireNear(player, x, y, "harvest too far");
    require(
      PlantState.getStage(x, y) != PantheonConstants.PLANT_STAGE_HARVESTED,
      "already harvested"
    );
    require(_plantIsReady(x, y), "plant not ready");

    PlayerLib.spendEnergy(player, PantheonConstants.HARVEST_ENERGY_COST);
    HarvestResult memory result = _resolveHarvest(player, x, y);
    PlantState.setStage(x, y, PantheonConstants.PLANT_STAGE_HARVESTED);
    FarmTileState.setExhaustion(
      x,
      y,
      _clamp100(
        FarmTileState.getExhaustion(x, y) +
          PantheonConstants.FARM_HARVEST_EXHAUSTION
      )
    );
    PendingActionLib.startBusy(
      player,
      PantheonConstants.ACTION_HARVEST,
      PantheonConstants.HARVEST_DURATION
    );
    LastHarvestResult.set(
      player,
      x,
      y,
      result.itemId,
      result.amount,
      result.rareItemId,
      result.rareAmount,
      true
    );
    ActionLogLib.write(
      player,
      PantheonConstants.ACTION_HARVEST,
      "Harvested plant"
    );
  }

  function water(int32 x, int32 y) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(PlantState.getExists(x, y), "missing plant");
    PlayerLib.requireNear(player, x, y, "water too far");

    bytes32 terrainId = TerrainTile.getTerrainId(x, y);
    _ensureFarmTile(x, y, terrainId);
    PlayerLib.spendEnergy(player, PantheonConstants.WATER_ENERGY_COST);

    uint32 moisture = _clamp100(
      FarmTileState.getMoisture(x, y) + PantheonConstants.FARM_WATER_AMOUNT
    );
    FarmTileState.setMoisture(x, y, moisture);
    FarmTileState.setLastWateredAt(x, y, uint64(block.timestamp));
    _recalculatePlantCare(x, y);

    PendingActionLib.startBusy(
      player,
      PantheonConstants.ACTION_WATER,
      PantheonConstants.PLANT_DURATION
    );
    ActionLogLib.write(player, PantheonConstants.ACTION_WATER, "Watered plant");
  }

  function tend(int32 x, int32 y) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);
    require(PlantState.getExists(x, y), "missing plant");
    PlayerLib.requireNear(player, x, y, "tend too far");

    bytes32 terrainId = TerrainTile.getTerrainId(x, y);
    _ensureFarmTile(x, y, terrainId);
    PlayerLib.spendEnergy(player, PantheonConstants.TEND_ENERGY_COST);

    FarmTileState.setFertility(
      x,
      y,
      _clamp100(
        FarmTileState.getFertility(x, y) +
          PantheonConstants.FARM_TEND_FERTILITY_GAIN
      )
    );
    FarmTileState.setLastMaintainedAt(x, y, uint64(block.timestamp));
    PlantState.setLastMaintainedAt(x, y, uint64(block.timestamp));
    uint32 stress = PlantState.getStress(x, y);
    PlantState.setStress(
      x,
      y,
      stress > PantheonConstants.FARM_TEND_STRESS_RELIEF
        ? stress - PantheonConstants.FARM_TEND_STRESS_RELIEF
        : 0
    );
    _recalculatePlantCare(x, y);

    PendingActionLib.startBusy(
      player,
      PantheonConstants.ACTION_TEND,
      PantheonConstants.PLANT_DURATION
    );
    ActionLogLib.write(player, PantheonConstants.ACTION_TEND, "Tended plant");
  }

  function getLastHarvestResult(
    address player
  )
    public
    view
    returns (
      int32 x,
      int32 y,
      bytes32 itemId,
      uint32 amount,
      bytes32 rareItemId,
      uint32 rareAmount,
      bool exists
    )
  {
    return (
      LastHarvestResult.getX(player),
      LastHarvestResult.getY(player),
      LastHarvestResult.getItemId(player),
      LastHarvestResult.getAmount(player),
      LastHarvestResult.getRareItemId(player),
      LastHarvestResult.getRareAmount(player),
      LastHarvestResult.getExists(player)
    );
  }

  function _plantAllowedOnTerrain(
    bytes32 plantId,
    bytes32 terrainId
  ) private view returns (bool) {
    return
      PlantTerrainRule.getExists(plantId, terrainId)
        ? PlantTerrainRule.getAllowed(plantId, terrainId)
        : true;
  }

  function _ensureFarmTile(int32 x, int32 y, bytes32 terrainId) private {
    if (FarmTileState.getExists(x, y)) {
      return;
    }

    uint32 moisture = PantheonConstants.FARM_DEFAULT_MOISTURE;
    uint32 fertility = PantheonConstants.FARM_DEFAULT_FERTILITY;

    if (
      terrainId == PantheonConstants.TERRAIN_WATER ||
      terrainId == PantheonConstants.TERRAIN_SWAMP
    ) {
      moisture = 82;
    } else if (terrainId == PantheonConstants.TERRAIN_SAND) {
      moisture = 20;
      fertility = 35;
    } else if (terrainId == PantheonConstants.TERRAIN_FOREST_FLOOR) {
      moisture = 58;
      fertility = 74;
    } else if (terrainId == PantheonConstants.TERRAIN_STONE) {
      moisture = 28;
      fertility = 30;
    }

    FarmTileState.set(
      x,
      y,
      moisture,
      fertility,
      0,
      uint64(block.timestamp),
      0,
      true
    );
  }

  function _initialPlantStress(
    bytes32 plantId,
    int32 x,
    int32 y
  ) private view returns (uint32) {
    return
      _careStress(
        plantId,
        FarmTileState.getMoisture(x, y),
        FarmTileState.getFertility(x, y),
        FarmTileState.getExhaustion(x, y)
      );
  }

  function _recalculatePlantCare(int32 x, int32 y) private {
    bytes32 plantId = PlantState.getPlantId(x, y);
    uint32 stress = _careStress(
      plantId,
      FarmTileState.getMoisture(x, y),
      FarmTileState.getFertility(x, y),
      FarmTileState.getExhaustion(x, y)
    );
    PlantState.setStress(x, y, stress);
    PlantState.setHealth(x, y, PantheonConstants.FARM_MAX_CARE - stress);
  }

  function _careStress(
    bytes32 plantId,
    uint32 moisture,
    uint32 fertility,
    uint32 exhaustion
  ) private view returns (uint32) {
    uint32 stress = exhaustion;
    uint32 idealMin = PlantType.getIdealMoistureMin(plantId);
    uint32 idealMax = PlantType.getIdealMoistureMax(plantId);
    uint32 fertilityNeed = PlantType.getFertilityNeed(plantId);

    if (moisture < idealMin) {
      stress += idealMin - moisture;
    } else if (moisture > idealMax) {
      stress += moisture - idealMax;
    }

    if (fertility < fertilityNeed) {
      stress += fertilityNeed - fertility;
    }

    return _clamp100(stress);
  }

  function _plantIsReady(int32 x, int32 y) private view returns (bool) {
    bytes32 plantId = PlantState.getPlantId(x, y);
    bytes32 terrainId = TerrainTile.getTerrainId(x, y);
    uint64 growthSeconds = PlantType.getGrowthSeconds(plantId);
    uint32 growthModifier = PlantTerrainRule.getExists(plantId, terrainId)
      ? PlantTerrainRule.getGrowthModifier(plantId, terrainId)
      : PantheonConstants.FARM_RULE_SCALE;
    uint64 adjustedGrowthSeconds = uint64(
      (uint256(growthSeconds) * PantheonConstants.FARM_RULE_SCALE) /
        growthModifier
    );

    if (adjustedGrowthSeconds == 0) {
      adjustedGrowthSeconds = 1;
    }

    return
      block.timestamp >= PlantState.getPlantedAt(x, y) + adjustedGrowthSeconds;
  }

  function _resolveHarvest(
    address player,
    int32 x,
    int32 y
  ) private returns (HarvestResult memory result) {
    bytes32 plantId = PlantState.getPlantId(x, y);
    bytes32 terrainId = TerrainTile.getTerrainId(x, y);
    bytes32 entropy = keccak256(
      abi.encodePacked(player, x, y, plantId, block.prevrandao, block.timestamp)
    );
    uint32 minYield = PlantType.getBaseYieldMin(plantId);
    uint32 maxYield = PlantType.getBaseYieldMax(plantId);
    uint32 range = maxYield > minYield ? maxYield - minYield + 1 : 1;
    uint32 amount = minYield + uint32(uint256(entropy) % range);
    uint32 stress = PlantState.getStress(x, y);

    if (PlantTerrainRule.getExists(plantId, terrainId)) {
      amount += PlantTerrainRule.getYieldBonus(plantId, terrainId);
    }

    if (stress >= 75) {
      amount = amount > 1 ? amount / 2 : 1;
    } else if (stress <= 10) {
      amount += 1;
    }

    result.itemId = PlantType.getHarvestItemId(plantId);
    result.amount = amount;
    _spawnHarvestObjects(player, x, y, result.itemId, result.amount, entropy);

    if (
      PlantTerrainRule.getExists(plantId, terrainId) &&
      PlantTerrainRule.getRareItemId(plantId, terrainId) != bytes32(0)
    ) {
      uint32 rareChance = PlantTerrainRule.getRareChance(plantId, terrainId);
      uint32 rareRoll = uint32(
        uint256(keccak256(abi.encodePacked(entropy, "rare"))) % 10000
      );

      if (rareRoll < rareChance) {
        result.rareItemId = PlantTerrainRule.getRareItemId(plantId, terrainId);
        result.rareAmount = 1;
        _spawnHarvestObjects(
          player,
          x,
          y,
          result.rareItemId,
          result.rareAmount,
          keccak256(abi.encodePacked(entropy, "rareDrop"))
        );
      }
    }
  }

  function _spawnHarvestObjects(
    address player,
    int32 x,
    int32 y,
    bytes32 itemId,
    uint32 amount,
    bytes32 entropy
  ) private {
    if (amount == 0 || itemId == bytes32(0)) {
      return;
    }

    bytes32 counterId = PantheonConstants.WORLD_OBJECT_COUNTER_ID;
    uint32 count = WorldObjectCount.getCount(counterId);

    for (uint32 index = 0; index < amount; index++) {
      count += 1;
      (int32 dropX, int32 dropY) = _harvestDropTile(x, y, entropy, index);
      _spawnWorldObject(bytes32(uint256(count)), player, dropX, dropY, itemId);
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

  function _harvestDropTile(
    int32 x,
    int32 y,
    bytes32 entropy,
    uint32 index
  ) private view returns (int32 dropX, int32 dropY) {
    int32[9] memory offsetsX = [
      int32(0),
      int32(1),
      int32(-1),
      int32(0),
      int32(0),
      int32(1),
      int32(-1),
      int32(1),
      int32(-1)
    ];
    int32[9] memory offsetsY = [
      int32(0),
      int32(0),
      int32(0),
      int32(1),
      int32(-1),
      int32(1),
      int32(1),
      int32(-1),
      int32(-1)
    ];
    uint256 offsetIndex = uint256(keccak256(abi.encodePacked(entropy, index))) %
      offsetsX.length;

    dropX = x + offsetsX[offsetIndex];
    dropY = y + offsetsY[offsetIndex];

    if (!TerrainTile.getExists(dropX, dropY)) {
      dropX = x;
      dropY = y;
    }
  }

  function _clamp100(uint32 value) private pure returns (uint32) {
    return
      value > PantheonConstants.FARM_MAX_CARE
        ? PantheonConstants.FARM_MAX_CARE
        : value;
  }
}
