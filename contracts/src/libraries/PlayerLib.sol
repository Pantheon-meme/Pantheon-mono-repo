// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { PlayerState } from "../codegen/index.sol";
import { PantheonConstants } from "./PantheonConstants.sol";

library PlayerLib {
  function requireExists(address player) internal view {
    require(PlayerState.getExists(player), "not spawned");
  }

  function spendEnergy(address player, uint32 amount) internal {
    uint32 energy = PlayerState.getEnergy(player);
    require(energy >= amount, "not enough energy");
    PlayerState.setEnergy(player, energy - amount);
  }

  function addEnergy(address player, uint32 amount) internal {
    uint32 maxEnergy = PlayerState.getMaxEnergy(player);
    uint32 energy = PlayerState.getEnergy(player);
    uint32 nextEnergy = energy + amount;
    PlayerState.setEnergy(player, nextEnergy > maxEnergy ? maxEnergy : nextEnergy);
  }

  function spawn(address player, int32 x, int32 y) internal {
    require(!PlayerState.getExists(player), "already spawned");
    PlayerState.set(
      player,
      x,
      y,
      PantheonConstants.STARTING_ENERGY,
      PantheonConstants.STARTING_ENERGY,
      uint64(block.timestamp),
      PantheonConstants.DEFAULT_MOVE_SPEED,
      true
    );
  }

  function move(address player, int32 targetX, int32 targetY) internal {
    int32 currentX = PlayerState.getX(player);
    int32 currentY = PlayerState.getY(player);
    uint32 distance = _manhattanDistance(currentX, currentY, targetX, targetY);

    require(distance > 0, "already there");
    require(_isOrthogonal(currentX, currentY, targetX, targetY), "diagonal move");

    uint64 elapsed = uint64(block.timestamp) - PlayerState.getLastMoveAt(player);
    uint256 reachableDistance = uint256(elapsed) * PlayerState.getMoveSpeed(player);
    require(
      uint256(distance) * PantheonConstants.MOVE_SPEED_SCALE <= reachableDistance,
      "move too soon"
    );

    spendEnergy(player, PantheonConstants.MOVE_ENERGY_COST * distance);
    PlayerState.setX(player, targetX);
    PlayerState.setY(player, targetY);
    PlayerState.setLastMoveAt(player, uint64(block.timestamp));
  }

  function movePath(address player, int32[] memory xs, int32[] memory ys) internal {
    require(xs.length > 0, "empty path");
    require(xs.length == ys.length, "invalid path");

    int32 currentX = PlayerState.getX(player);
    int32 currentY = PlayerState.getY(player);
    uint32 distance = 0;

    for (uint256 i = 0; i < xs.length; i++) {
      int32 targetX = xs[i];
      int32 targetY = ys[i];
      uint32 legDistance = _manhattanDistance(currentX, currentY, targetX, targetY);

      require(legDistance > 0, "empty leg");
      require(_isOrthogonal(currentX, currentY, targetX, targetY), "diagonal move");

      distance += legDistance;
      currentX = targetX;
      currentY = targetY;
    }

    uint64 elapsed = uint64(block.timestamp) - PlayerState.getLastMoveAt(player);
    uint256 reachableDistance = uint256(elapsed) * PlayerState.getMoveSpeed(player);
    require(
      uint256(distance) * PantheonConstants.MOVE_SPEED_SCALE <= reachableDistance,
      "move too soon"
    );

    spendEnergy(player, PantheonConstants.MOVE_ENERGY_COST * distance);
    PlayerState.setX(player, currentX);
    PlayerState.setY(player, currentY);
    PlayerState.setLastMoveAt(player, uint64(block.timestamp));
  }

  function _isOrthogonal(
    int32 currentX,
    int32 currentY,
    int32 targetX,
    int32 targetY
  ) private pure returns (bool) {
    return currentX == targetX || currentY == targetY;
  }

  function _manhattanDistance(
    int32 currentX,
    int32 currentY,
    int32 targetX,
    int32 targetY
  ) private pure returns (uint32) {
    return _absDiff(currentX, targetX) + _absDiff(currentY, targetY);
  }

  function _absDiff(int32 a, int32 b) private pure returns (uint32) {
    return a >= b ? uint32(a - b) : uint32(b - a);
  }
}
