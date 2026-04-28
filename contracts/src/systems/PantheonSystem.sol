// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { PlayerState, TerrainState, PlantState, ActionLog } from "../codegen/index.sol";

contract PantheonSystem is System {
  uint32 internal constant STARTING_ENERGY = 100;
  uint32 internal constant MOVE_ENERGY_COST = 1;
  uint32 internal constant DIG_ENERGY_COST = 12;
  uint32 internal constant PLANT_ENERGY_COST = 8;
  uint8 internal constant PLANT_STAGE_GROWING = 0;
  uint8 internal constant PLANT_STAGE_HARVESTED = 2;
  bytes32 internal constant TERRAIN_DIRT = bytes32("dirt");

  function spawn(int32 x, int32 y) public {
    address player = _msgSender();
    require(!PlayerState.getExists(player), "already spawned");

    PlayerState.set(player, x, y, STARTING_ENERGY, STARTING_ENERGY, true);
    _log(player, "spawn", "Spawned");
  }

  function move(int32 x, int32 y) public {
    address player = _msgSender();
    _requirePlayer(player);
    _spendEnergy(player, MOVE_ENERGY_COST);

    PlayerState.setX(player, x);
    PlayerState.setY(player, y);
    _log(player, "move", "Moved");
  }

  function rest(uint32 amount) public {
    address player = _msgSender();
    _requirePlayer(player);

    uint32 maxEnergy = PlayerState.getMaxEnergy(player);
    uint32 energy = PlayerState.getEnergy(player);
    uint32 nextEnergy = energy + amount;
    PlayerState.setEnergy(player, nextEnergy > maxEnergy ? maxEnergy : nextEnergy);
    _log(player, "rest", "Rested");
  }

  function dig(int32 x, int32 y) public {
    address player = _msgSender();
    _requirePlayer(player);
    _spendEnergy(player, DIG_ENERGY_COST);

    uint32 depth = TerrainState.getDigDepth(x, y);
    bool loosened = TerrainState.getLoosened(x, y);
    TerrainState.set(x, y, TERRAIN_DIRT, loosened ? depth + 1 : depth, true);
    _log(player, "dig", "Dug soil");
  }

  function plant(int32 x, int32 y, bytes32 plantId) public {
    address player = _msgSender();
    _requirePlayer(player);
    require(!PlantState.getExists(x, y), "plant exists");
    _spendEnergy(player, PLANT_ENERGY_COST);

    PlantState.set(x, y, plantId, player, uint64(block.timestamp), PLANT_STAGE_GROWING, true);
    _log(player, "plant", "Planted seed");
  }

  function harvest(int32 x, int32 y) public {
    address player = _msgSender();
    _requirePlayer(player);
    require(PlantState.getExists(x, y), "missing plant");

    PlantState.setStage(x, y, PLANT_STAGE_HARVESTED);
    _log(player, "harvest", "Harvested plant");
  }

  function _requirePlayer(address player) internal view {
    require(PlayerState.getExists(player), "not spawned");
  }

  function _spendEnergy(address player, uint32 amount) internal {
    uint32 energy = PlayerState.getEnergy(player);
    require(energy >= amount, "not enough energy");
    PlayerState.setEnergy(player, energy - amount);
  }

  function _log(address player, bytes32 action, string memory message) internal {
    ActionLog.set(player, action, uint64(block.timestamp), message);
  }
}
