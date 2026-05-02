// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { PendingAction } from "../codegen/index.sol";
import { ActionLogLib } from "./ActionLogLib.sol";
import { PantheonConstants } from "./PantheonConstants.sol";
import { SleepActionLib } from "./SleepActionLib.sol";

library PendingActionLib {
  function requireIdle(address player) internal view {
    require(!PendingAction.getExists(player), "action pending");
  }

  function clearReady(address player) internal {
    if (
      PendingAction.getExists(player) &&
      block.timestamp >= PendingAction.getReadyAt(player)
    ) {
      PendingAction.deleteRecord(player);
    }
  }

  function startBusy(address player, bytes32 action, uint64 duration) internal {
    requireIdle(player);

    PendingAction.set(
      player,
      action,
      uint64(block.timestamp) + duration,
      0,
      0,
      0,
      bytes32(0),
      true
    );
  }

  function startSleep(address player) internal {
    requireIdle(player);

    (uint64 readyAt, uint32 energyGain) = SleepActionLib.sleep(player);
    PendingAction.set(
      player,
      PantheonConstants.ACTION_SLEEP,
      readyAt,
      0,
      0,
      energyGain,
      bytes32(0),
      true
    );
    ActionLogLib.write(player, PantheonConstants.ACTION_SLEEP, "Sleeping");
  }

  function resolveReady(address player) internal {
    clearReady(player);
  }
}
