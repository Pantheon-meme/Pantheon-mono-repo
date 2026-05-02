// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {
  IERC7857DataVerifier,
  TransferValidityProof,
  TransferValidityProofOutput
} from "../interfaces/IERC7857.sol";

contract MockERC7857Verifier is IERC7857DataVerifier {
  event TransferValidityVerified(
    bytes32 indexed oldDataHash,
    bytes32 indexed newDataHash,
    address indexed accessAssistant
  );

  function verifyTransferValidity(
    TransferValidityProof[] calldata proofs
  ) external returns (TransferValidityProofOutput[] memory outputs) {
    require(proofs.length > 0, "empty proofs");

    outputs = new TransferValidityProofOutput[](proofs.length);

    for (uint256 index = 0; index < proofs.length; index++) {
      bytes32 oldDataHash = proofs[index].accessProof.oldDataHash;
      bytes32 newDataHash = proofs[index].accessProof.newDataHash;

      if (oldDataHash == bytes32(0)) {
        oldDataHash = proofs[index].ownershipProof.oldDataHash;
      }

      if (newDataHash == bytes32(0)) {
        newDataHash = proofs[index].ownershipProof.newDataHash;
      }

      require(oldDataHash != bytes32(0), "missing old data hash");
      require(newDataHash != bytes32(0), "missing new data hash");

      address accessAssistant = _decodeAccessAssistant(
        proofs[index].accessProof.proof
      );

      outputs[index] = TransferValidityProofOutput({
        oldDataHash: oldDataHash,
        newDataHash: newDataHash,
        sealedKey: proofs[index].ownershipProof.sealedKey.length > 0
          ? proofs[index].ownershipProof.sealedKey
          : abi.encodePacked(newDataHash),
        encryptedPubKey: proofs[index].accessProof.encryptedPubKey,
        wantedKey: proofs[index].ownershipProof.encryptedPubKey,
        accessAssistant: accessAssistant,
        accessProofNonce: proofs[index].accessProof.nonce,
        ownershipProofNonce: proofs[index].ownershipProof.nonce
      });

      emit TransferValidityVerified(oldDataHash, newDataHash, accessAssistant);
    }
  }

  function _decodeAccessAssistant(
    bytes calldata proof
  ) private pure returns (address) {
    if (proof.length >= 20) {
      return address(bytes20(proof[:20]));
    }

    return address(0);
  }
}
