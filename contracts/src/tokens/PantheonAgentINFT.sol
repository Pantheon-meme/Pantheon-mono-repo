// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {AgentMintOffer, IERC7857DataVerifier, IPantheonAgentINFT, IntelligentData, TransferValidityProof, TransferValidityProofOutput} from "../interfaces/IERC7857.sol";

contract PantheonAgentINFT is IPantheonAgentINFT {
  struct TokenData {
    address owner;
    address[] authorizedUsers;
    address approvedUser;
    IntelligentData[] intelligentData;
  }

  struct UsageAuthorizationData {
    bytes permissions;
    uint64 expiresAt;
    bool exists;
  }

  struct AgentRuntimePointer {
    string publicURI;
    string encryptedStorageURI;
    bytes32 memoryRoot;
    uint64 updatedAt;
    bool exists;
  }

  address public contractOwner;
  string private _name;
  string private _symbol;
  string private _storageInfo;
  IERC7857DataVerifier private _verifier;
  uint256 public nextTokenId = 1;
  uint256 public nextMintOfferId = 1;

  mapping(uint256 tokenId => TokenData token) private _tokens;
  mapping(address owner => uint256 balance) private _balances;
  mapping(address owner => mapping(address operator => bool approved))
    private _operatorApprovals;
  mapping(address user => address assistant) private _accessAssistants;
  mapping(uint256 tokenId => mapping(address user => UsageAuthorizationData auth))
    private _usageAuthorizations;
  mapping(uint256 tokenId => AgentRuntimePointer pointer)
    private _runtimePointers;
  mapping(uint256 offerId => AgentMintOffer offer) private _mintOffers;
  mapping(uint256 offerId => IntelligentData[] data)
    private _mintOfferIntelligentData;
  mapping(address wallet => uint256[] offerIds) private _approvedMintOfferIds;
  mapping(uint256 offerId => mapping(address wallet => bool listed))
    private _mintOfferListedForWallet;

  event Transfer(
    address indexed from,
    address indexed to,
    uint256 indexed tokenId
  );
  event Minted(
    uint256 indexed tokenId,
    address indexed creator,
    address indexed owner
  );
  event Updated(
    uint256 indexed tokenId,
    IntelligentData[] oldData,
    IntelligentData[] newData
  );
  event VerifierUpdated(
    address indexed previousVerifier,
    address indexed newVerifier
  );
  event StorageInfoUpdated(string storageInfo);
  event UsageAuthorizedWithPermissions(
    uint256 indexed tokenId,
    address indexed executor,
    bytes permissions,
    uint64 expiresAt
  );
  event AgentRuntimePointerUpdated(
    uint256 indexed tokenId,
    string publicURI,
    string encryptedStorageURI,
    bytes32 memoryRoot
  );
  event MintOfferCreated(
    uint256 indexed offerId,
    string displayName,
    string publicURI,
    string encryptedStorageURI,
    bytes32 memoryRoot
  );
  event MintOfferApproved(uint256 indexed offerId, address indexed wallet);
  event MintOfferApprovalRevoked(
    uint256 indexed offerId,
    address indexed wallet
  );
  event MintOfferClaimed(
    uint256 indexed offerId,
    uint256 indexed tokenId,
    address indexed wallet
  );
  event ContractOwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );

  modifier onlyContractOwner() {
    require(msg.sender == contractOwner, "not contract owner");
    _;
  }

  constructor(
    string memory name_,
    string memory symbol_,
    string memory storageInfo_,
    address verifier_
  ) {
    require(verifier_ != address(0), "missing verifier");

    contractOwner = msg.sender;
    _name = name_;
    _symbol = symbol_;
    _storageInfo = storageInfo_;
    _verifier = IERC7857DataVerifier(verifier_);
  }

  function name() external view returns (string memory) {
    return _name;
  }

  function symbol() external view returns (string memory) {
    return _symbol;
  }

  function verifier() external view returns (IERC7857DataVerifier) {
    return _verifier;
  }

  function storageInfo(uint256 tokenId) external view returns (string memory) {
    ownerOf(tokenId);

    return _storageInfo;
  }

  function balanceOf(address account) external view returns (uint256) {
    require(account != address(0), "zero address");

    return _balances[account];
  }

  function ownerOf(uint256 tokenId) public view returns (address tokenOwner) {
    tokenOwner = _tokens[tokenId].owner;
    require(tokenOwner != address(0), "token missing");
  }

  function intelligentDataOf(
    uint256 tokenId
  ) external view returns (IntelligentData[] memory) {
    ownerOf(tokenId);

    return _copyIntelligentData(_tokens[tokenId].intelligentData);
  }

  function authorizedUsersOf(
    uint256 tokenId
  ) external view returns (address[] memory) {
    ownerOf(tokenId);

    return _tokens[tokenId].authorizedUsers;
  }

  function getApproved(uint256 tokenId) external view returns (address) {
    ownerOf(tokenId);

    return _tokens[tokenId].approvedUser;
  }

  function isApprovedForAll(
    address owner,
    address operator
  ) external view returns (bool) {
    return _operatorApprovals[owner][operator];
  }

  function getDelegateAccess(address user) external view returns (address) {
    return _accessAssistants[user];
  }

  function usageAuthorization(
    uint256 tokenId,
    address executor
  )
    external
    view
    returns (bytes memory permissions, uint64 expiresAt, bool exists)
  {
    ownerOf(tokenId);
    UsageAuthorizationData storage auth = _usageAuthorizations[tokenId][
      executor
    ];

    return (auth.permissions, auth.expiresAt, auth.exists);
  }

  function agentRuntimePointerOf(
    uint256 tokenId
  ) external view returns (AgentRuntimePointer memory) {
    ownerOf(tokenId);

    return _runtimePointers[tokenId];
  }

  function mintOfferOf(
    uint256 offerId
  ) external view returns (AgentMintOffer memory) {
    _requireMintOfferExists(offerId);

    return _mintOffers[offerId];
  }

  function mintOfferIntelligentDataOf(
    uint256 offerId
  ) external view returns (IntelligentData[] memory) {
    _requireMintOfferExists(offerId);

    return _copyIntelligentData(_mintOfferIntelligentData[offerId]);
  }

  function approvedMintOfferIdsOf(
    address wallet
  ) external view returns (uint256[] memory) {
    return _approvedMintOfferIds[wallet];
  }

  function approvedMintOffersOf(
    address wallet
  ) external view returns (AgentMintOffer[] memory offers) {
    uint256[] storage offerIds = _approvedMintOfferIds[wallet];
    uint256 count = 0;

    for (uint256 index = 0; index < offerIds.length; index++) {
      AgentMintOffer storage offer = _mintOffers[offerIds[index]];

      if (_isClaimableBy(offer, wallet)) {
        count++;
      }
    }

    offers = new AgentMintOffer[](count);
    uint256 nextIndex = 0;

    for (uint256 index = 0; index < offerIds.length; index++) {
      AgentMintOffer storage offer = _mintOffers[offerIds[index]];

      if (_isClaimableBy(offer, wallet)) {
        offers[nextIndex++] = offer;
      }
    }
  }

  function updateVerifier(address newVerifier) external onlyContractOwner {
    require(newVerifier != address(0), "missing verifier");

    emit VerifierUpdated(address(_verifier), newVerifier);
    _verifier = IERC7857DataVerifier(newVerifier);
  }

  function updateStorageInfo(
    string calldata storageInfo_
  ) external onlyContractOwner {
    _storageInfo = storageInfo_;
    emit StorageInfoUpdated(storageInfo_);
  }

  function transferContractOwnership(
    address newOwner
  ) external onlyContractOwner {
    require(newOwner != address(0), "missing owner");

    emit ContractOwnershipTransferred(contractOwner, newOwner);
    contractOwner = newOwner;
  }

  function mint(
    IntelligentData[] calldata intelligentData,
    address to,
    string calldata publicURI,
    string calldata encryptedStorageURI,
    bytes32 memoryRoot
  ) external onlyContractOwner returns (uint256 tokenId) {
    require(to != address(0), "zero address");
    require(intelligentData.length > 0, "empty data");

    tokenId = nextTokenId++;
    TokenData storage token = _tokens[tokenId];
    token.owner = to;
    _balances[to] += 1;
    _setIntelligentDataFromCalldata(token, intelligentData);
    _runtimePointers[tokenId] = AgentRuntimePointer(
      publicURI,
      encryptedStorageURI,
      memoryRoot,
      uint64(block.timestamp),
      true
    );

    emit Minted(tokenId, msg.sender, to);
    emit Transfer(address(0), to, tokenId);
    emit AgentRuntimePointerUpdated(
      tokenId,
      publicURI,
      encryptedStorageURI,
      memoryRoot
    );
  }

  function createMintOffer(
    string calldata displayName,
    IntelligentData[] calldata intelligentData,
    string calldata publicURI,
    string calldata encryptedStorageURI,
    bytes32 memoryRoot
  ) external onlyContractOwner returns (uint256 offerId) {
    require(intelligentData.length > 0, "empty data");

    offerId = nextMintOfferId++;
    _mintOffers[offerId] = AgentMintOffer(
      offerId,
      address(0),
      0,
      displayName,
      publicURI,
      encryptedStorageURI,
      memoryRoot,
      uint64(block.timestamp),
      true,
      false,
      true
    );
    _setIntelligentDataArrayFromCalldata(
      _mintOfferIntelligentData[offerId],
      intelligentData
    );

    emit MintOfferCreated(
      offerId,
      displayName,
      publicURI,
      encryptedStorageURI,
      memoryRoot
    );
  }

  function approveMintOffer(
    uint256 offerId,
    address wallet
  ) external onlyContractOwner {
    require(wallet != address(0), "zero address");
    AgentMintOffer storage offer = _requireMintOfferExists(offerId);
    require(offer.active, "offer inactive");
    require(!offer.claimed, "offer claimed");

    offer.approvedWallet = wallet;

    if (!_mintOfferListedForWallet[offerId][wallet]) {
      _approvedMintOfferIds[wallet].push(offerId);
      _mintOfferListedForWallet[offerId][wallet] = true;
    }

    emit MintOfferApproved(offerId, wallet);
  }

  function revokeMintOfferApproval(uint256 offerId) external onlyContractOwner {
    AgentMintOffer storage offer = _requireMintOfferExists(offerId);
    address wallet = offer.approvedWallet;
    require(wallet != address(0), "missing approval");
    require(!offer.claimed, "offer claimed");

    offer.approvedWallet = address(0);

    emit MintOfferApprovalRevoked(offerId, wallet);
  }

  function claimMintOffer(uint256 offerId) external returns (uint256 tokenId) {
    AgentMintOffer storage offer = _requireMintOfferExists(offerId);
    require(_isClaimableBy(offer, msg.sender), "not approved");

    tokenId = nextTokenId++;
    TokenData storage token = _tokens[tokenId];
    token.owner = msg.sender;
    _balances[msg.sender] += 1;
    _setIntelligentData(
      token,
      _copyIntelligentData(_mintOfferIntelligentData[offerId])
    );
    _runtimePointers[tokenId] = AgentRuntimePointer(
      offer.publicURI,
      offer.encryptedStorageURI,
      offer.memoryRoot,
      uint64(block.timestamp),
      true
    );

    offer.active = false;
    offer.claimed = true;
    offer.mintedTokenId = tokenId;

    emit Minted(tokenId, contractOwner, msg.sender);
    emit Transfer(address(0), msg.sender, tokenId);
    emit AgentRuntimePointerUpdated(
      tokenId,
      offer.publicURI,
      offer.encryptedStorageURI,
      offer.memoryRoot
    );
    emit MintOfferClaimed(offerId, tokenId, msg.sender);
  }

  function update(
    uint256 tokenId,
    IntelligentData[] calldata newData
  ) external {
    require(ownerOf(tokenId) == msg.sender, "not owner");
    require(newData.length > 0, "empty data");

    TokenData storage token = _tokens[tokenId];
    IntelligentData[] memory oldData = _copyIntelligentData(
      token.intelligentData
    );
    _replaceIntelligentDataFromCalldata(token, newData);

    emit Updated(tokenId, oldData, _copyIntelligentData(token.intelligentData));
  }

  function updateAgentRuntimePointer(
    uint256 tokenId,
    string calldata publicURI,
    string calldata encryptedStorageURI,
    bytes32 memoryRoot
  ) external {
    require(ownerOf(tokenId) == msg.sender, "not owner");

    _runtimePointers[tokenId] = AgentRuntimePointer(
      publicURI,
      encryptedStorageURI,
      memoryRoot,
      uint64(block.timestamp),
      true
    );

    emit AgentRuntimePointerUpdated(
      tokenId,
      publicURI,
      encryptedStorageURI,
      memoryRoot
    );
  }

  function approve(address to, uint256 tokenId) external {
    address tokenOwner = ownerOf(tokenId);
    require(to != tokenOwner, "approval to owner");
    require(
      msg.sender == tokenOwner || _operatorApprovals[tokenOwner][msg.sender],
      "not approved"
    );

    _tokens[tokenId].approvedUser = to;
    emit Approval(tokenOwner, to, tokenId);
  }

  function setApprovalForAll(address operator, bool approved) external {
    require(operator != msg.sender, "approval to caller");

    _operatorApprovals[msg.sender][operator] = approved;
    emit ApprovalForAll(msg.sender, operator, approved);
  }

  function delegateAccess(address assistant) external {
    require(assistant != address(0), "zero address");

    _accessAssistants[msg.sender] = assistant;
    emit DelegateAccess(msg.sender, assistant);
  }

  function authorizeUsage(uint256 tokenId, address user) external {
    _authorizeUsage(tokenId, user, "", 0);
  }

  function authorizeUsageWithPermissions(
    uint256 tokenId,
    address user,
    bytes calldata permissions,
    uint64 expiresAt
  ) external {
    _authorizeUsage(tokenId, user, permissions, expiresAt);
  }

  function batchAuthorizeUsage(
    uint256 tokenId,
    address[] calldata users
  ) external {
    require(users.length > 0, "empty users");

    for (uint256 index = 0; index < users.length; index++) {
      _authorizeUsage(tokenId, users[index], "", 0);
    }
  }

  function revokeAuthorization(uint256 tokenId, address user) external {
    require(ownerOf(tokenId) == msg.sender, "not owner");
    require(user != address(0), "zero address");

    _removeAuthorizedUser(tokenId, user);
    delete _usageAuthorizations[tokenId][user];
    emit AuthorizationRevoked(msg.sender, user, tokenId);
  }

  function iTransfer(
    address to,
    uint256 tokenId,
    TransferValidityProof[] calldata proofs
  ) external {
    require(_isApprovedOrOwner(msg.sender, tokenId), "not approved");

    _iTransfer(ownerOf(tokenId), to, tokenId, proofs);
  }

  function iTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    TransferValidityProof[] calldata proofs
  ) external {
    require(_isApprovedOrOwner(msg.sender, tokenId), "not approved");

    _iTransfer(from, to, tokenId, proofs);
  }

  function transferFrom(address from, address to, uint256 tokenId) external {
    require(_isApprovedOrOwner(msg.sender, tokenId), "not approved");
    require(ownerOf(tokenId) == from, "not owner");
    require(to != address(0), "zero address");

    _transferOwnership(from, to, tokenId);
  }

  function iClone(
    address to,
    uint256 tokenId,
    TransferValidityProof[] calldata proofs
  ) external returns (uint256 newTokenId) {
    require(_isApprovedOrOwner(msg.sender, tokenId), "not approved");

    return _iClone(ownerOf(tokenId), to, tokenId, proofs);
  }

  function iCloneFrom(
    address from,
    address to,
    uint256 tokenId,
    TransferValidityProof[] calldata proofs
  ) external returns (uint256 newTokenId) {
    require(_isApprovedOrOwner(msg.sender, tokenId), "not approved");

    return _iClone(from, to, tokenId, proofs);
  }

  function _authorizeUsage(
    uint256 tokenId,
    address user,
    bytes memory permissions,
    uint64 expiresAt
  ) private {
    require(ownerOf(tokenId) == msg.sender, "not owner");
    require(user != address(0), "zero address");

    if (!_isAuthorizedUser(tokenId, user)) {
      _tokens[tokenId].authorizedUsers.push(user);
    }

    _usageAuthorizations[tokenId][user] = UsageAuthorizationData(
      permissions,
      expiresAt,
      true
    );

    emit Authorization(msg.sender, user, tokenId);
    emit UsageAuthorizedWithPermissions(tokenId, user, permissions, expiresAt);
  }

  function _iTransfer(
    address from,
    address to,
    uint256 tokenId,
    TransferValidityProof[] calldata proofs
  ) private {
    (bytes[] memory sealedKeys, IntelligentData[] memory newData) = _proofCheck(
      from,
      to,
      tokenId,
      proofs
    );

    _replaceIntelligentData(_tokens[tokenId], newData);
    _transferOwnership(from, to, tokenId);
    emit PublishedSealedKey(to, tokenId, sealedKeys);
  }

  function _iClone(
    address from,
    address to,
    uint256 tokenId,
    TransferValidityProof[] calldata proofs
  ) private returns (uint256 newTokenId) {
    require(to != address(0), "zero address");
    (bytes[] memory sealedKeys, IntelligentData[] memory newData) = _proofCheck(
      from,
      to,
      tokenId,
      proofs
    );

    newTokenId = nextTokenId++;
    TokenData storage newToken = _tokens[newTokenId];
    newToken.owner = to;
    _balances[to] += 1;
    _setIntelligentData(newToken, newData);

    AgentRuntimePointer storage sourcePointer = _runtimePointers[tokenId];
    _runtimePointers[newTokenId] = AgentRuntimePointer(
      sourcePointer.publicURI,
      sourcePointer.encryptedStorageURI,
      sourcePointer.memoryRoot,
      uint64(block.timestamp),
      sourcePointer.exists
    );

    emit Cloned(tokenId, newTokenId, from, to);
    emit Transfer(address(0), to, newTokenId);
    emit PublishedSealedKey(to, newTokenId, sealedKeys);
  }

  function _proofCheck(
    address from,
    address to,
    uint256 tokenId,
    TransferValidityProof[] calldata proofs
  )
    private
    returns (bytes[] memory sealedKeys, IntelligentData[] memory newData)
  {
    require(to != address(0), "zero address");
    require(ownerOf(tokenId) == from, "not owner");
    require(proofs.length > 0, "empty proofs");

    TransferValidityProofOutput[] memory outputs = _verifier
      .verifyTransferValidity(proofs);
    IntelligentData[] storage currentData = _tokens[tokenId].intelligentData;
    require(outputs.length == currentData.length, "proof count mismatch");

    sealedKeys = new bytes[](outputs.length);
    newData = new IntelligentData[](outputs.length);

    for (uint256 index = 0; index < outputs.length; index++) {
      require(
        outputs[index].oldDataHash == currentData[index].dataHash,
        "old hash mismatch"
      );
      require(
        outputs[index].accessAssistant == to ||
          outputs[index].accessAssistant == _accessAssistants[to],
        "assistant mismatch"
      );
      _requireReceiverKey(
        to,
        outputs[index].encryptedPubKey,
        outputs[index].wantedKey
      );

      sealedKeys[index] = outputs[index].sealedKey;
      newData[index] = IntelligentData(
        currentData[index].dataDescription,
        outputs[index].newDataHash
      );
    }
  }

  function _transferOwnership(
    address from,
    address to,
    uint256 tokenId
  ) private {
    require(ownerOf(tokenId) == from, "not owner");
    require(to != address(0), "zero address");

    TokenData storage token = _tokens[tokenId];
    token.owner = to;
    token.approvedUser = address(0);
    delete token.authorizedUsers;
    _balances[from] -= 1;
    _balances[to] += 1;

    emit Transferred(tokenId, from, to);
    emit Transfer(from, to, tokenId);
  }

  function _isApprovedOrOwner(
    address operator,
    uint256 tokenId
  ) private view returns (bool) {
    address tokenOwner = ownerOf(tokenId);

    return
      operator == tokenOwner ||
      operator == _tokens[tokenId].approvedUser ||
      _operatorApprovals[tokenOwner][operator];
  }

  function _isAuthorizedUser(
    uint256 tokenId,
    address user
  ) private view returns (bool) {
    address[] storage authorizedUsers = _tokens[tokenId].authorizedUsers;

    for (uint256 index = 0; index < authorizedUsers.length; index++) {
      if (authorizedUsers[index] == user) {
        return true;
      }
    }

    return false;
  }

  function _removeAuthorizedUser(uint256 tokenId, address user) private {
    address[] storage authorizedUsers = _tokens[tokenId].authorizedUsers;

    for (uint256 index = 0; index < authorizedUsers.length; index++) {
      if (authorizedUsers[index] == user) {
        authorizedUsers[index] = authorizedUsers[authorizedUsers.length - 1];
        authorizedUsers.pop();
        return;
      }
    }
  }

  function _requireMintOfferExists(
    uint256 offerId
  ) private view returns (AgentMintOffer storage offer) {
    offer = _mintOffers[offerId];
    require(offer.exists, "offer missing");
  }

  function _isClaimableBy(
    AgentMintOffer storage offer,
    address wallet
  ) private view returns (bool) {
    return
      offer.exists &&
      offer.active &&
      !offer.claimed &&
      offer.approvedWallet == wallet;
  }

  function _setIntelligentData(
    TokenData storage token,
    IntelligentData[] memory newData
  ) private {
    for (uint256 index = 0; index < newData.length; index++) {
      require(newData[index].dataHash != bytes32(0), "missing data hash");
      token.intelligentData.push(newData[index]);
    }
  }

  function _setIntelligentDataFromCalldata(
    TokenData storage token,
    IntelligentData[] calldata newData
  ) private {
    _setIntelligentDataArrayFromCalldata(token.intelligentData, newData);
  }

  function _setIntelligentDataArrayFromCalldata(
    IntelligentData[] storage target,
    IntelligentData[] calldata newData
  ) private {
    for (uint256 index = 0; index < newData.length; index++) {
      require(newData[index].dataHash != bytes32(0), "missing data hash");
      target.push(newData[index]);
    }
  }

  function _replaceIntelligentData(
    TokenData storage token,
    IntelligentData[] memory newData
  ) private {
    delete token.intelligentData;
    _setIntelligentData(token, newData);
  }

  function _replaceIntelligentDataFromCalldata(
    TokenData storage token,
    IntelligentData[] calldata newData
  ) private {
    delete token.intelligentData;
    _setIntelligentData(token, newData);
  }

  function _copyIntelligentData(
    IntelligentData[] storage data
  ) private view returns (IntelligentData[] memory copied) {
    copied = new IntelligentData[](data.length);

    for (uint256 index = 0; index < data.length; index++) {
      copied[index] = data[index];
    }
  }

  function _requireReceiverKey(
    address to,
    bytes memory encryptedPubKey,
    bytes memory wantedKey
  ) private pure {
    if (wantedKey.length == 0) {
      require(
        _addressFromPublicKey(encryptedPubKey) == to,
        "receiver key mismatch"
      );
      return;
    }

    require(
      keccak256(encryptedPubKey) == keccak256(wantedKey),
      "encrypted key mismatch"
    );
  }

  function _addressFromPublicKey(
    bytes memory publicKey
  ) private pure returns (address) {
    require(publicKey.length == 64 || publicKey.length == 65, "bad public key");

    bytes memory normalized = new bytes(64);
    uint256 offset = publicKey.length == 65 ? 1 : 0;

    for (uint256 index = 0; index < 64; index++) {
      normalized[index] = publicKey[index + offset];
    }

    return address(uint160(uint256(keccak256(normalized))));
  }
}
