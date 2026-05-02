// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

enum OracleType {
  TEE,
  ZKP
}

struct AccessProof {
  bytes32 oldDataHash;
  bytes32 newDataHash;
  bytes nonce;
  bytes encryptedPubKey;
  bytes proof;
}

struct OwnershipProof {
  OracleType oracleType;
  bytes32 oldDataHash;
  bytes32 newDataHash;
  bytes sealedKey;
  bytes encryptedPubKey;
  bytes nonce;
  bytes proof;
}

struct TransferValidityProof {
  AccessProof accessProof;
  OwnershipProof ownershipProof;
}

struct TransferValidityProofOutput {
  bytes32 oldDataHash;
  bytes32 newDataHash;
  bytes sealedKey;
  bytes encryptedPubKey;
  bytes wantedKey;
  address accessAssistant;
  bytes accessProofNonce;
  bytes ownershipProofNonce;
}

struct IntelligentData {
  string dataDescription;
  bytes32 dataHash;
}

struct AgentMintOffer {
  uint256 offerId;
  address approvedWallet;
  uint256 mintedTokenId;
  string displayName;
  string publicURI;
  string encryptedStorageURI;
  bytes32 memoryRoot;
  uint64 createdAt;
  bool active;
  bool claimed;
  bool exists;
}

interface IERC7857DataVerifier {
  function verifyTransferValidity(
    TransferValidityProof[] calldata proofs
  ) external returns (TransferValidityProofOutput[] memory);
}

interface IERC7857Metadata {
  function name() external view returns (string memory);

  function symbol() external view returns (string memory);

  function intelligentDataOf(
    uint256 tokenId
  ) external view returns (IntelligentData[] memory);
}

interface IERC7857 {
  event Approval(
    address indexed from,
    address indexed to,
    uint256 indexed tokenId
  );
  event ApprovalForAll(
    address indexed owner,
    address indexed operator,
    bool approved
  );
  event Authorization(
    address indexed from,
    address indexed to,
    uint256 indexed tokenId
  );
  event AuthorizationRevoked(
    address indexed from,
    address indexed to,
    uint256 indexed tokenId
  );
  event Transferred(uint256 tokenId, address indexed from, address indexed to);
  event Cloned(
    uint256 indexed tokenId,
    uint256 indexed newTokenId,
    address from,
    address to
  );
  event PublishedSealedKey(
    address indexed to,
    uint256 indexed tokenId,
    bytes[] sealedKeys
  );
  event DelegateAccess(address indexed user, address indexed assistant);

  function verifier() external view returns (IERC7857DataVerifier);

  function iTransfer(
    address to,
    uint256 tokenId,
    TransferValidityProof[] calldata proofs
  ) external;

  function iTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    TransferValidityProof[] calldata proofs
  ) external;

  function iClone(
    address to,
    uint256 tokenId,
    TransferValidityProof[] calldata proofs
  ) external returns (uint256 newTokenId);

  function iCloneFrom(
    address from,
    address to,
    uint256 tokenId,
    TransferValidityProof[] calldata proofs
  ) external returns (uint256 newTokenId);

  function authorizeUsage(uint256 tokenId, address user) external;

  function batchAuthorizeUsage(
    uint256 tokenId,
    address[] calldata users
  ) external;

  function revokeAuthorization(uint256 tokenId, address user) external;

  function transferFrom(address from, address to, uint256 tokenId) external;

  function approve(address to, uint256 tokenId) external;

  function setApprovalForAll(address operator, bool approved) external;

  function delegateAccess(address assistant) external;

  function ownerOf(uint256 tokenId) external view returns (address);

  function authorizedUsersOf(
    uint256 tokenId
  ) external view returns (address[] memory);

  function getApproved(uint256 tokenId) external view returns (address);

  function isApprovedForAll(
    address owner,
    address operator
  ) external view returns (bool);

  function getDelegateAccess(address user) external view returns (address);

  function storageInfo(uint256 tokenId) external view returns (string memory);

  function tokenURI(uint256 tokenId) external view returns (string memory);
}

interface IPantheonAgentINFT is IERC7857, IERC7857Metadata {
  function createMintOffer(
    string calldata displayName,
    IntelligentData[] calldata intelligentData,
    string calldata publicURI,
    string calldata encryptedStorageURI,
    bytes32 memoryRoot
  ) external returns (uint256 offerId);

  function approveMintOffer(uint256 offerId, address wallet) external;

  function revokeMintOfferApproval(uint256 offerId) external;

  function claimMintOffer(uint256 offerId) external returns (uint256 tokenId);

  function mintOfferOf(
    uint256 offerId
  ) external view returns (AgentMintOffer memory);

  function mintOfferIntelligentDataOf(
    uint256 offerId
  ) external view returns (IntelligentData[] memory);

  function approvedMintOfferIdsOf(
    address wallet
  ) external view returns (uint256[] memory);

  function approvedMintOffersOf(
    address wallet
  ) external view returns (AgentMintOffer[] memory);

  function usageAuthorization(
    uint256 tokenId,
    address executor
  )
    external
    view
    returns (bytes memory permissions, uint64 expiresAt, bool exists);
}
