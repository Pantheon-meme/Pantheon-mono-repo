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

  function spend(address player, bytes32 itemId, uint32 amount) internal {
    if (amount == 0) {
      return;
    }

    uint32 current = PlayerInventory.getAmount(player, itemId);
    require(current >= amount, "missing item");

    uint32 nextAmount = current - amount;
    PlayerInventory.set(player, itemId, nextAmount, nextAmount > 0);
  }
}
