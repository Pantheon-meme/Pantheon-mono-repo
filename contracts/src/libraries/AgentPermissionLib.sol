// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

library AgentPermissionLib {
  uint256 internal constant CAN_RUN_INFERENCE = 1 << 0;
  uint256 internal constant CAN_ACT_IN_WORLD = 1 << 1;
  uint256 internal constant CAN_MOVE = 1 << 2;
  uint256 internal constant CAN_FORAGE = 1 << 3;
  uint256 internal constant CAN_SLEEP = 1 << 4;
  uint256 internal constant CAN_PICKUP = 1 << 5;
  uint256 internal constant CAN_DROP = 1 << 6;
  uint256 internal constant CAN_PLANT = 1 << 7;
  uint256 internal constant CAN_HARVEST = 1 << 8;
  uint256 internal constant CAN_WATER = 1 << 9;
  uint256 internal constant CAN_TEND = 1 << 10;
  uint256 internal constant CAN_BANK_SELL = 1 << 11;
  uint256 internal constant CAN_BANK_BUY = 1 << 12;
  uint256 internal constant CAN_APPEND_MEMORY = 1 << 13;
  uint256 internal constant CAN_CHECKPOINT_MEMORY = 1 << 14;
  uint256 internal constant CAN_UPDATE_PUBLIC_PROFILE = 1 << 15;
  uint256 internal constant CAN_CLONE = 1 << 16;

  function has(
    uint256 bits,
    uint256 requiredBits
  ) internal pure returns (bool) {
    return (bits & requiredBits) == requiredBits;
  }
}
