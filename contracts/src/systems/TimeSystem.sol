// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { WorldTime } from "../codegen/index.sol";
import { PantheonConstants } from "../libraries/PantheonConstants.sol";

contract TimeSystem is System {
  function initWorldTime(uint64 dayLength) public {
    require(dayLength > 0, "invalid day length");
    require(!WorldTime.getExists(PantheonConstants.WORLD_TIME_ID), "time exists");

    WorldTime.set(
      PantheonConstants.WORLD_TIME_ID,
      uint64(block.timestamp),
      dayLength,
      true
    );
  }

  function setDayLength(uint64 dayLength) public {
    require(dayLength > 0, "invalid day length");
    require(WorldTime.getExists(PantheonConstants.WORLD_TIME_ID), "time missing");

    WorldTime.setDayLength(PantheonConstants.WORLD_TIME_ID, dayLength);
  }
}
