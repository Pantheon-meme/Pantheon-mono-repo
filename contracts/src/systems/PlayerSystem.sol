// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {System} from "@latticexyz/world/src/System.sol";
import {AgentPlayer} from "../codegen/index.sol";
import {ActionLogLib} from "../libraries/ActionLogLib.sol";
import {PantheonConstants} from "../libraries/PantheonConstants.sol";
import {PendingActionLib} from "../libraries/PendingActionLib.sol";
import {PlayerLib} from "../libraries/PlayerLib.sol";

contract PlayerSystem is System {
  function spawn(int32 x, int32 y) public {
    address player = _msgSender();
    require(AgentPlayer.getExists(player), "agent required");

    PlayerLib.spawn(player, x, y);
    ActionLogLib.write(player, PantheonConstants.ACTION_SPAWN, "Spawned");
  }

  function move(int32 x, int32 y) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);

    PlayerLib.move(player, x, y);
    ActionLogLib.write(player, PantheonConstants.ACTION_MOVE, "Moved");
  }

  function movePath(int32[] memory xs, int32[] memory ys) public {
    address player = _msgSender();
    PlayerLib.requireExists(player);
    PendingActionLib.resolveReady(player);
    PendingActionLib.requireIdle(player);

    PlayerLib.movePath(player, xs, ys);
    ActionLogLib.write(player, PantheonConstants.ACTION_MOVE, "Moved");
  }
}
