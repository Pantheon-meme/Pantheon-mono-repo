// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { PlayerState, TerrainState } from "../codegen/index.sol";
import { PantheonConstants } from "./PantheonConstants.sol";
import { PlayerLib } from "./PlayerLib.sol";

library SleepActionLib {
  function sleep(address player) internal returns (uint64 readyAt, uint32 energyGain) {
    require(PlayerState.getEnergy(player) < PlayerState.getMaxEnergy(player), "energy full");

    uint32 rate = energyRate(player);
    energyGain = rate * uint32(PantheonConstants.SLEEP_DURATION);
    readyAt = uint64(block.timestamp) + PantheonConstants.SLEEP_DURATION;
    PlayerLib.addEnergy(player, energyGain);
  }

  function energyRate(address player) internal view returns (uint32) {
    int32 x = PlayerState.getX(player);
    int32 y = PlayerState.getY(player);
    bytes32 material = TerrainState.getMaterial(x, y);

    if (material == bytes32(0)) {
      return PantheonConstants.SLEEP_GRASS_ENERGY_PER_SECOND;
    }

    if (material == PantheonConstants.TERRAIN_DIRT) {
      return PantheonConstants.SLEEP_DIRT_ENERGY_PER_SECOND;
    }

    return PantheonConstants.SLEEP_ROUGH_ENERGY_PER_SECOND;
  }
}
