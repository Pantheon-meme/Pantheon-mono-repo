// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {System} from "@latticexyz/world/src/System.sol";
import {AgentConfig, AgentIdentity, AgentMemoryCheckpoint, AgentMemoryCount, AgentMemoryDelta, AgentNetworkEndpoint, AgentPermission, AgentPlayer, TerrainAdmin} from "../codegen/index.sol";
import {IPantheonAgentINFT} from "../interfaces/IERC7857.sol";
import {AgentPermissionLib} from "../libraries/AgentPermissionLib.sol";
import {PantheonConstants} from "../libraries/PantheonConstants.sol";

contract AgentRegistrySystem is System {
  function setAgentINFTContract(address inftContract) public {
    _requireTerrainAdmin();
    require(inftContract != address(0), "missing inft");

    AgentConfig.set(PantheonConstants.AGENT_CONFIG_ID, inftContract, true);
  }

  function registerAgent(
    uint256 tokenId,
    address player,
    string calldata publicName,
    string calldata publicURI
  ) public {
    require(player != address(0), "missing player");

    address tokenOwner = _requireTokenOwner(tokenId);
    address previousPlayer = AgentIdentity.getPlayer(tokenId);

    if (previousPlayer != address(0) && previousPlayer != player) {
      AgentPlayer.deleteRecord(previousPlayer);
    }

    AgentIdentity.set(
      tokenId,
      player,
      tokenOwner,
      address(0),
      true,
      publicName,
      publicURI
    );
    AgentPlayer.set(player, tokenId, true);
  }

  function setAgentExecutor(
    uint256 tokenId,
    address executor,
    uint256 permissionBits,
    uint64 expiresAt,
    uint32 maxActionsPerEpoch,
    uint256 maxCucSpendPerEpoch
  ) public {
    require(executor != address(0), "missing executor");
    address tokenOwner = _requireTokenOwner(tokenId);
    require(AgentIdentity.getActive(tokenId), "agent missing");

    AgentIdentity.setOwner(tokenId, tokenOwner);
    AgentIdentity.setExecutor(tokenId, executor);
    AgentPermission.set(
      tokenId,
      executor,
      permissionBits,
      expiresAt,
      maxActionsPerEpoch,
      maxCucSpendPerEpoch,
      0,
      0,
      _currentEpoch(),
      true
    );
  }

  function mirrorINFTAuthorization(
    uint256 tokenId,
    address executor,
    uint64 expiresAt,
    uint32 maxActionsPerEpoch,
    uint256 maxCucSpendPerEpoch
  ) public {
    require(executor != address(0), "missing executor");
    require(AgentIdentity.getActive(tokenId), "agent missing");
    (
      bytes memory authorization,
      uint64 authorizedUntil,
      bool exists
    ) = _agentINFT().usageAuthorization(tokenId, executor);
    require(exists, "missing authorization");
    require(authorization.length >= 32, "missing authorization");

    uint256 permissionBits = abi.decode(authorization, (uint256));
    uint64 effectiveExpiresAt = expiresAt;

    if (
      authorizedUntil != 0 &&
      (effectiveExpiresAt == 0 || authorizedUntil < effectiveExpiresAt)
    ) {
      effectiveExpiresAt = authorizedUntil;
    }

    address tokenOwner = _agentINFT().ownerOf(tokenId);

    AgentIdentity.setOwner(tokenId, tokenOwner);
    AgentIdentity.setExecutor(tokenId, executor);
    AgentPermission.set(
      tokenId,
      executor,
      permissionBits,
      effectiveExpiresAt,
      maxActionsPerEpoch,
      maxCucSpendPerEpoch,
      0,
      0,
      _currentEpoch(),
      true
    );
  }

  function revokeAgentExecutor(uint256 tokenId, address executor) public {
    _requireTokenOwner(tokenId);
    AgentPermission.deleteRecord(tokenId, executor);

    if (AgentIdentity.getExecutor(tokenId) == executor) {
      AgentIdentity.setExecutor(tokenId, address(0));
    }
  }

  function updateAgentPublicProfile(
    uint256 tokenId,
    string calldata publicName,
    string calldata publicURI
  ) public {
    if (_msgSender() != _agentINFT().ownerOf(tokenId)) {
      _consumePermission(
        tokenId,
        _msgSender(),
        AgentPermissionLib.CAN_UPDATE_PUBLIC_PROFILE,
        0
      );
    }

    require(AgentIdentity.getActive(tokenId), "agent missing");
    AgentIdentity.setPublicName(tokenId, publicName);
    AgentIdentity.setPublicURI(tokenId, publicURI);
    AgentIdentity.setOwner(tokenId, _agentINFT().ownerOf(tokenId));
  }

  function setAgentNetworkEndpoint(
    uint256 tokenId,
    bytes32 protocol,
    string calldata endpoint
  ) public {
    require(protocol != bytes32(0), "missing protocol");
    require(bytes(endpoint).length > 0, "missing endpoint");
    _requireProfileUpdatePermission(tokenId);
    require(AgentIdentity.getActive(tokenId), "agent missing");

    AgentNetworkEndpoint.set(
      tokenId,
      protocol,
      _msgSender(),
      uint64(block.timestamp),
      true,
      endpoint
    );
    AgentIdentity.setOwner(tokenId, _agentINFT().ownerOf(tokenId));
  }

  function clearAgentNetworkEndpoint(uint256 tokenId, bytes32 protocol) public {
    require(protocol != bytes32(0), "missing protocol");
    _requireProfileUpdatePermission(tokenId);

    AgentNetworkEndpoint.deleteRecord(tokenId, protocol);
  }

  function getAgentNetworkEndpoint(
    uint256 tokenId,
    bytes32 protocol
  )
    public
    view
    returns (
      string memory endpoint,
      address updatedBy,
      uint64 updatedAt,
      bool exists
    )
  {
    exists = AgentNetworkEndpoint.getExists(tokenId, protocol);
    if (!exists) {
      return ("", address(0), 0, false);
    }

    return (
      AgentNetworkEndpoint.getEndpoint(tokenId, protocol),
      AgentNetworkEndpoint.getUpdatedBy(tokenId, protocol),
      AgentNetworkEndpoint.getUpdatedAt(tokenId, protocol),
      exists
    );
  }

  function appendMemory(
    uint256 tokenId,
    string calldata encryptedDeltaURI,
    bytes32 deltaHash,
    bytes32 action
  ) public returns (uint32 sequence) {
    require(bytes(encryptedDeltaURI).length > 0, "missing uri");
    require(deltaHash != bytes32(0), "missing hash");
    require(AgentIdentity.getActive(tokenId), "agent missing");
    _consumePermission(
      tokenId,
      _msgSender(),
      AgentPermissionLib.CAN_APPEND_MEMORY,
      0
    );

    sequence = AgentMemoryCount.getCount(tokenId) + 1;
    AgentMemoryCount.set(tokenId, sequence, true);
    AgentMemoryDelta.set(
      tokenId,
      sequence,
      _msgSender(),
      deltaHash,
      action,
      uint64(block.timestamp),
      true,
      encryptedDeltaURI
    );
  }

  function updateMemoryCheckpoint(
    uint256 tokenId,
    string calldata encryptedCheckpointURI,
    bytes32 checkpointHash,
    bytes32 memoryRoot
  ) public {
    require(bytes(encryptedCheckpointURI).length > 0, "missing uri");
    require(checkpointHash != bytes32(0), "missing hash");
    require(memoryRoot != bytes32(0), "missing root");
    require(AgentIdentity.getActive(tokenId), "agent missing");

    if (_msgSender() != _agentINFT().ownerOf(tokenId)) {
      _consumePermission(
        tokenId,
        _msgSender(),
        AgentPermissionLib.CAN_CHECKPOINT_MEMORY,
        0
      );
    }

    AgentMemoryCheckpoint.set(
      tokenId,
      checkpointHash,
      memoryRoot,
      _msgSender(),
      uint64(block.timestamp),
      true,
      encryptedCheckpointURI
    );
    AgentIdentity.setOwner(tokenId, _agentINFT().ownerOf(tokenId));
  }

  function isAuthorized(
    uint256 tokenId,
    address executor,
    uint256 requiredBits
  ) public view returns (bool) {
    if (!AgentIdentity.getActive(tokenId)) {
      return false;
    }

    if (_agentINFT().ownerOf(tokenId) == executor) {
      return true;
    }

    if (!AgentPermission.getExists(tokenId, executor)) {
      return false;
    }

    uint64 expiresAt = AgentPermission.getExpiresAt(tokenId, executor);

    if (expiresAt != 0 && block.timestamp > expiresAt) {
      return false;
    }

    return
      AgentPermissionLib.has(
        AgentPermission.getPermissionBits(tokenId, executor),
        requiredBits
      );
  }

  function consumeAgentAction(
    uint256 tokenId,
    uint256 requiredBits,
    uint256 cucSpend
  ) public {
    _consumePermission(tokenId, _msgSender(), requiredBits, cucSpend);
  }

  function _requireProfileUpdatePermission(uint256 tokenId) private {
    if (_msgSender() != _agentINFT().ownerOf(tokenId)) {
      _consumePermission(
        tokenId,
        _msgSender(),
        AgentPermissionLib.CAN_UPDATE_PUBLIC_PROFILE,
        0
      );
    }
  }

  function _consumePermission(
    uint256 tokenId,
    address executor,
    uint256 requiredBits,
    uint256 cucSpend
  ) private {
    if (_agentINFT().ownerOf(tokenId) == executor) {
      return;
    }

    require(AgentIdentity.getActive(tokenId), "agent missing");
    require(AgentPermission.getExists(tokenId, executor), "not executor");

    uint64 expiresAt = AgentPermission.getExpiresAt(tokenId, executor);
    require(
      expiresAt == 0 || block.timestamp <= expiresAt,
      "permission expired"
    );
    require(
      AgentPermissionLib.has(
        AgentPermission.getPermissionBits(tokenId, executor),
        requiredBits
      ),
      "permission missing"
    );

    uint32 epoch = _currentEpoch();
    uint32 usedActions = AgentPermission.getUsedActions(tokenId, executor);
    uint256 usedCucSpend = AgentPermission.getUsedCucSpend(tokenId, executor);

    if (AgentPermission.getEpoch(tokenId, executor) != epoch) {
      usedActions = 0;
      usedCucSpend = 0;
      AgentPermission.setEpoch(tokenId, executor, epoch);
    }

    uint32 maxActions = AgentPermission.getMaxActionsPerEpoch(
      tokenId,
      executor
    );

    if (maxActions != 0) {
      require(usedActions < maxActions, "action budget spent");
      AgentPermission.setUsedActions(tokenId, executor, usedActions + 1);
    }

    uint256 maxCucSpend = AgentPermission.getMaxCucSpendPerEpoch(
      tokenId,
      executor
    );

    if (maxCucSpend != 0 || cucSpend != 0) {
      require(usedCucSpend + cucSpend <= maxCucSpend, "cuc budget spent");
      AgentPermission.setUsedCucSpend(
        tokenId,
        executor,
        usedCucSpend + cucSpend
      );
    }
  }

  function _requireTokenOwner(
    uint256 tokenId
  ) private view returns (address tokenOwner) {
    tokenOwner = _agentINFT().ownerOf(tokenId);
    require(tokenOwner == _msgSender(), "not token owner");
  }

  function _agentINFT() private view returns (IPantheonAgentINFT) {
    require(
      AgentConfig.getExists(PantheonConstants.AGENT_CONFIG_ID),
      "agent inft missing"
    );

    return
      IPantheonAgentINFT(
        AgentConfig.getInftContract(PantheonConstants.AGENT_CONFIG_ID)
      );
  }

  function _currentEpoch() private view returns (uint32) {
    return uint32(block.timestamp / PantheonConstants.DEFAULT_DAY_LENGTH);
  }

  function _requireTerrainAdmin() private view {
    require(
      TerrainAdmin.getExists(PantheonConstants.TERRAIN_ADMIN_ID),
      "admin missing"
    );
    require(
      TerrainAdmin.getAdmin(PantheonConstants.TERRAIN_ADMIN_ID) == _msgSender(),
      "not terrain admin"
    );
  }
}
