// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {StoreSwitch} from "@latticexyz/store/src/StoreSwitch.sol";

import {IWorld} from "../src/codegen/world/IWorld.sol";
import {PantheonConstants} from "../src/libraries/PantheonConstants.sol";
import {PantheonAgentINFT} from "../src/tokens/PantheonAgentINFT.sol";
import {MockERC7857Verifier} from "../src/verifiers/MockERC7857Verifier.sol";

contract PostDeploy is Script {
  function run(address worldAddress) external {
    StoreSwitch.setStoreAddress(worldAddress);

    uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
    address deployer = vm.addr(deployerPrivateKey);

    vm.startBroadcast(deployerPrivateKey);

    IWorld(worldAddress).pantheon__initTerrainAdmin(deployer);
    console.log("Initialized terrain admin:", deployer);

    IWorld(worldAddress).pantheon__initWorldTime(
      PantheonConstants.DEFAULT_DAY_LENGTH
    );
    console.log("Seeded world time in world:", worldAddress);

    MockERC7857Verifier verifier = new MockERC7857Verifier();
    console.log("Deployed mock ERC-7857 verifier:", address(verifier));

    PantheonAgentINFT agentINFT = new PantheonAgentINFT(
      "Pantheon Agent INFT",
      "PINFT",
      "0g-storage://local-dev",
      address(verifier)
    );
    console.log("Deployed Pantheon Agent INFT:", address(agentINFT));

    IWorld(worldAddress).pantheon__setAgentINFTContract(address(agentINFT));
    console.log("Registered Pantheon Agent INFT in world:", worldAddress);

    vm.stopBroadcast();
  }
}
