// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { PlayerInventory } from "../codegen/index.sol";

library InventoryLib {
  function add(address player, bytes32 itemId, uint32 amount) internal {
    if (amount == 0) {
      return;
    }

    uint32 current = PlayerInventory.getAmount(player, itemId);
    PlayerInventory.set(player, itemId, current + amount, true);
  }
}
