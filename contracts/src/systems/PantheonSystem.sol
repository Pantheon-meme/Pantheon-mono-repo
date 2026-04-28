// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { TerrainState, PlantState } from "../codegen/index.sol";
import { ActionLogLib } from "../libraries/ActionLogLib.sol";
import { PantheonConstants } from "../libraries/PantheonConstants.sol";
import { PendingActionLib } from "../libraries/PendingActionLib.sol";
import { PlayerLib } from "../libraries/PlayerLib.sol";

contract PantheonSystem is System {
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
}
