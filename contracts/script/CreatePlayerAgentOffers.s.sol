// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {IntelligentData, IPantheonAgentINFT} from "../src/interfaces/IERC7857.sol";

contract CreatePlayerAgentOffers is Script {
  function run() external {
    uint256 ownerPrivateKey = _envPrivateKey();
    address inftContract = vm.envAddress("AGENT_INFT_ADDRESS");
    string memory manifestPath = vm.envOr(
      "INFT_METADATA_MANIFEST",
      string("generated/inft-metadata/inft-assets.json")
    );
    string memory manifestJson = vm.readFile(manifestPath);
    string[] memory ids = abi.decode(
      vm.parseJson(manifestJson, ".ids"),
      (string[])
    );
    string[] memory names = abi.decode(
      vm.parseJson(manifestJson, ".names"),
      (string[])
    );
    string[] memory publicURIs = abi.decode(
      vm.parseJson(manifestJson, ".publicURIs"),
      (string[])
    );
    string[] memory encryptedStorageURIs = abi.decode(
      vm.parseJson(manifestJson, ".encryptedStorageURIs"),
      (string[])
    );
    bytes32[] memory spriteSheetHashes = abi.decode(
      vm.parseJson(manifestJson, ".spriteSheetHashes"),
      (bytes32[])
    );
    bytes32[] memory metadataHashes = abi.decode(
      vm.parseJson(manifestJson, ".metadataHashes"),
      (bytes32[])
    );
    bytes32[] memory memoryRoots = abi.decode(
      vm.parseJson(manifestJson, ".memoryRoots"),
      (bytes32[])
    );

    require(
      ids.length == names.length &&
        ids.length == publicURIs.length &&
        ids.length == encryptedStorageURIs.length &&
        ids.length == spriteSheetHashes.length &&
        ids.length == metadataHashes.length &&
        ids.length == memoryRoots.length,
      "invalid manifest"
    );

    vm.startBroadcast(ownerPrivateKey);

    for (uint256 index = 0; index < ids.length; index++) {
      IntelligentData[] memory intelligentData = new IntelligentData[](3);

      intelligentData[0] = IntelligentData({
        dataDescription: "player-sprite-sheet",
        dataHash: spriteSheetHashes[index]
      });
      intelligentData[1] = IntelligentData({
        dataDescription: "token-metadata",
        dataHash: metadataHashes[index]
      });
      intelligentData[2] = IntelligentData({
        dataDescription: "initial-memory-root",
        dataHash: memoryRoots[index]
      });

      uint256 offerId = IPantheonAgentINFT(inftContract).createMintOffer(
        names[index],
        intelligentData,
        publicURIs[index],
        encryptedStorageURIs[index],
        memoryRoots[index]
      );

      console.log("Created INFT mint offer:", offerId);
      console.log("Agent:", ids[index]);
      console.log("Metadata URI:", publicURIs[index]);
    }

    vm.stopBroadcast();
  }

  function _envPrivateKey() private view returns (uint256 privateKey) {
    if (vm.envExists("PRIVATE_KEY")) {
      privateKey = vm.envUint("PRIVATE_KEY");
    } else if (vm.envExists("MUD_PRIVATE_KEY")) {
      privateKey = vm.envUint("MUD_PRIVATE_KEY");
    } else if (vm.envExists("VITE_MUD_PRIVATE_KEY")) {
      privateKey = vm.envUint("VITE_MUD_PRIVATE_KEY");
    }

    require(privateKey != 0, "missing private key");
  }
}
