// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {StoreSwitch} from "@latticexyz/store/src/StoreSwitch.sol";

import {AgentConfig} from "../src/codegen/tables/AgentConfig.sol";
import {IWorld} from "../src/codegen/world/IWorld.sol";
import {IntelligentData} from "../src/interfaces/IERC7857.sol";
import {AgentPermissionLib} from "../src/libraries/AgentPermissionLib.sol";
import {PantheonConstants} from "../src/libraries/PantheonConstants.sol";
import {PantheonAgentINFT} from "../src/tokens/PantheonAgentINFT.sol";

contract MintDevAgent is Script {
  uint256 private constant DEFAULT_MAX_ACTIONS_PER_EPOCH = 256;
  uint256 private constant DEFAULT_MAX_CUC_SPEND_PER_EPOCH = 0;

  struct ExecutorConfig {
    address executor;
    bool hasPrivateKey;
    uint256 privateKey;
  }

  struct AgentMintConfig {
    string publicName;
    string publicURI;
    string encryptedStorageURI;
    bytes32 memoryRoot;
    uint256 permissionBits;
    uint64 expiresAt;
    uint32 maxActionsPerEpoch;
    uint256 maxCucSpendPerEpoch;
  }

  function run() external {
    run(vm.envAddress("MUD_WORLD_ADDRESS"));
  }

  function run(address worldAddress) public {
    require(worldAddress != address(0), "missing world");
    StoreSwitch.setStoreAddress(worldAddress);

    uint256 ownerPrivateKey = _envPrivateKey();
    address owner = vm.addr(ownerPrivateKey);
    ExecutorConfig memory executorConfig = _executor();
    address agentInftAddress = _agentInftAddress();

    _mintAndAuthorize(
      worldAddress,
      agentInftAddress,
      ownerPrivateKey,
      owner,
      executorConfig.executor
    );
    _maybeSpawnExecutor(worldAddress, executorConfig);
  }

  function _mintAndAuthorize(
    address worldAddress,
    address agentInftAddress,
    uint256 ownerPrivateKey,
    address owner,
    address executor
  ) private {
    PantheonAgentINFT agentInft = PantheonAgentINFT(agentInftAddress);
    AgentMintConfig memory config = _agentMintConfig();

    vm.startBroadcast(ownerPrivateKey);

    uint256 tokenId = agentInft.mint(
      _intelligentData(),
      owner,
      config.publicURI,
      config.encryptedStorageURI,
      config.memoryRoot
    );
    IWorld(worldAddress).pantheon__registerAgent(
      tokenId,
      executor,
      config.publicName,
      config.publicURI
    );
    agentInft.authorizeUsageWithPermissions(
      tokenId,
      executor,
      abi.encode(config.permissionBits),
      config.expiresAt
    );
    IWorld(worldAddress).pantheon__mirrorINFTAuthorization(
      tokenId,
      executor,
      config.expiresAt,
      config.maxActionsPerEpoch,
      config.maxCucSpendPerEpoch
    );

    vm.stopBroadcast();

    _logMintResult(tokenId, agentInftAddress, owner, executor, config);
  }

  function _maybeSpawnExecutor(
    address worldAddress,
    ExecutorConfig memory executorConfig
  ) private {
    if (!executorConfig.hasPrivateKey) {
      return;
    }

    vm.startBroadcast(executorConfig.privateKey);
    IWorld(worldAddress).pantheon__spawn(_spawnX(), _spawnY());
    vm.stopBroadcast();
    console.log("Spawned executor/player:", executorConfig.executor);
  }

  function _agentMintConfig()
    private
    view
    returns (AgentMintConfig memory config)
  {
    config.publicName = _envString("AGENT_PUBLIC_NAME", "Aletheia");
    config.publicURI = _envString(
      "AGENT_PUBLIC_URI",
      "0g-storage://local-dev/agents/aletheia/public.json"
    );
    config.encryptedStorageURI = _envString(
      "AGENT_ENCRYPTED_STORAGE_URI",
      "0g-storage://local-dev/agents/aletheia/encrypted"
    );
    config.memoryRoot = _hashEnvOrUri(
      "AGENT_MEMORY_ROOT",
      "AGENT_MEMORY_CHECKPOINT_URI",
      "0g-storage://local-dev/agents/aletheia/memory-checkpoint.enc.json"
    );
    config.permissionBits = _defaultPermissionBits();
    config.expiresAt = uint64(vm.envOr("AGENT_AUTH_EXPIRES_AT", uint256(0)));
    config.maxActionsPerEpoch = uint32(
      vm.envOr("AGENT_MAX_ACTIONS_PER_EPOCH", DEFAULT_MAX_ACTIONS_PER_EPOCH)
    );
    config.maxCucSpendPerEpoch = vm.envOr(
      "AGENT_MAX_CUC_SPEND_PER_EPOCH",
      DEFAULT_MAX_CUC_SPEND_PER_EPOCH
    );
  }

  function _intelligentData()
    private
    view
    returns (IntelligentData[] memory intelligentData)
  {
    intelligentData = new IntelligentData[](3);
    intelligentData[0] = IntelligentData({
      dataDescription: "agent-capsule",
      dataHash: _hashEnvOrUri(
        "AGENT_CAPSULE_HASH",
        "AGENT_CAPSULE_URI",
        "0g-storage://local-dev/agents/aletheia/capsule.enc.json"
      )
    });
    intelligentData[1] = IntelligentData({
      dataDescription: "memory-checkpoint",
      dataHash: _hashEnvOrUri(
        "AGENT_MEMORY_CHECKPOINT_HASH",
        "AGENT_MEMORY_CHECKPOINT_URI",
        "0g-storage://local-dev/agents/aletheia/memory-checkpoint.enc.json"
      )
    });
    intelligentData[2] = IntelligentData({
      dataDescription: "strategy-profile",
      dataHash: _hashEnvOrUri(
        "AGENT_STRATEGY_PROFILE_HASH",
        "AGENT_STRATEGY_PROFILE_URI",
        "0g-storage://local-dev/agents/aletheia/strategy-profile.enc.json"
      )
    });
  }

  function _logMintResult(
    uint256 tokenId,
    address agentInftAddress,
    address owner,
    address executor,
    AgentMintConfig memory config
  ) private pure {
    console.log("Minted Pantheon Agent INFT token:", tokenId);
    console.log("INFT contract:", agentInftAddress);
    console.log("Owner/custody key:", owner);
    console.log("Runtime executor/player:", executor);
    console.log("Public name:", config.publicName);
    console.log("Public URI:", config.publicURI);
    console.log("Permission bits:", config.permissionBits);
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

  function _executor() private view returns (ExecutorConfig memory config) {
    if (vm.envExists("AGENT_EXECUTOR_PRIVATE_KEY")) {
      config.privateKey = vm.envUint("AGENT_EXECUTOR_PRIVATE_KEY");
      config.executor = vm.addr(config.privateKey);
      config.hasPrivateKey = true;
      return config;
    }

    if (vm.envExists("AGENT_EXECUTOR_ADDRESS")) {
      config.executor = vm.envAddress("AGENT_EXECUTOR_ADDRESS");
      return config;
    }

    config.privateKey = _envPrivateKey();
    config.executor = vm.addr(config.privateKey);
  }

  function _agentInftAddress() private view returns (address inftContract) {
    if (vm.envExists("AGENT_INFT_ADDRESS")) {
      inftContract = vm.envAddress("AGENT_INFT_ADDRESS");
    } else if (AgentConfig.getExists(PantheonConstants.AGENT_CONFIG_ID)) {
      inftContract = AgentConfig.getInftContract(
        PantheonConstants.AGENT_CONFIG_ID
      );
    }

    require(inftContract != address(0), "missing agent inft");
  }

  function _defaultPermissionBits() private pure returns (uint256) {
    return
      AgentPermissionLib.CAN_RUN_INFERENCE |
      AgentPermissionLib.CAN_ACT_IN_WORLD |
      AgentPermissionLib.CAN_MOVE |
      AgentPermissionLib.CAN_FORAGE |
      AgentPermissionLib.CAN_SLEEP |
      AgentPermissionLib.CAN_PICKUP |
      AgentPermissionLib.CAN_PLANT |
      AgentPermissionLib.CAN_HARVEST |
      AgentPermissionLib.CAN_BANK_SELL |
      AgentPermissionLib.CAN_APPEND_MEMORY;
  }

  function _hashEnvOrUri(
    string memory hashEnv,
    string memory uriEnv,
    string memory defaultURI
  ) private view returns (bytes32) {
    if (vm.envExists(hashEnv)) {
      return vm.envBytes32(hashEnv);
    }

    return keccak256(bytes(_envString(uriEnv, defaultURI)));
  }

  function _envString(
    string memory key,
    string memory defaultValue
  ) private view returns (string memory) {
    if (vm.envExists(key)) {
      return vm.envString(key);
    }

    return defaultValue;
  }

  function _spawnX() private view returns (int32) {
    return int32(vm.envOr("AGENT_SPAWN_X", int256(100)));
  }

  function _spawnY() private view returns (int32) {
    return int32(vm.envOr("AGENT_SPAWN_Y", int256(100)));
  }
}
