// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { ActionLog } from "../codegen/index.sol";

library ActionLogLib {
  function write(address player, bytes32 action, string memory message) internal {
    ActionLog.set(player, action, uint64(block.timestamp), message);
  }
}
