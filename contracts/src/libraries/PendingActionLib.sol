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

  function startSleep(address player) internal {
    requireIdle(player);

    (uint64 readyAt, uint32 energyGain) = SleepActionLib.start(player);
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
    if (!PendingAction.getExists(player)) {
      return;
    }

    if (block.timestamp < PendingAction.getReadyAt(player)) {
      return;
    }

    bytes32 action = PendingAction.getAction(player);

    if (action == PantheonConstants.ACTION_SLEEP) {
      SleepActionLib.resolve(player, PendingAction.getValue(player));
      PendingAction.deleteRecord(player);
      ActionLogLib.write(player, PantheonConstants.ACTION_SLEEP, "Slept");
      return;
    }

    revert("unknown action");
  }
}
