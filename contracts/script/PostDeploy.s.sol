// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Script } from "forge-std/Script.sol";
import { console } from "forge-std/console.sol";
import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";

import { IWorld } from "../src/codegen/world/IWorld.sol";
import { PantheonConstants } from "../src/libraries/PantheonConstants.sol";

contract PostDeploy is Script {
  function run(address worldAddress) external {
    StoreSwitch.setStoreAddress(worldAddress);

    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

    vm.startBroadcast(deployerPrivateKey);

    IWorld(worldAddress).pantheon__initWorldTime(PantheonConstants.DEFAULT_DAY_LENGTH);
    console.log("Seeded world time in world:", worldAddress);

    IWorld(worldAddress).pantheon__spawn(100, 100);
    console.log("Seeded deployer player in world:", worldAddress);

    vm.stopBroadcast();
  }
}
