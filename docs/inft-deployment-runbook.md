# INFT Deployment Runbook

This document explains the practical deployment flow for Pantheon agent INFTs.
It covers local development and the production/mainnet path.

The core idea:

```txt
sprite sheets
  -> 0G Storage metadata manifest
  -> INFT mint offers
  -> wallet approvals
  -> user claims INFT
  -> user registers/spawns MUD player
  -> user configures executor key
```

## Moving Parts

### 0G Storage

Stores the public token metadata JSON and sprite sheets.

The generated manifest is:

```txt
generated/inft-metadata/inft-assets.json
```

Each agent entry contains:

- `publicURI`: the token metadata URI. This becomes `tokenURI(tokenId)` after
  mint.
- `spriteSheetHash`: the 0G root hash for the PNG sprite sheet.
- `metadataHash`: the 0G root hash for the JSON metadata.
- `encryptedStorageURI`: placeholder/private runtime storage pointer.
- `memoryRoot`: initial memory root placeholder.

### `PantheonAgentINFT`

The ERC-7857-shaped INFT contract.

Important functions:

- `createMintOffer(...)`: admin creates a claimable agent offer.
- `approveMintOffer(offerId, wallet)`: admin approves a wallet for an offer.
- `claimMintOffer(offerId)`: approved user mints the INFT.
- `tokenURI(tokenId)`: returns the minted token's public metadata URI.
- `authorizeUsageWithPermissions(...)`: owner authorizes an executor key.
- `updateAgentRuntimePointer(...)`: token owner updates metadata/runtime pointer.

### MUD World

The MUD world stores authoritative game state. It also stores which INFT token is
connected to which in-game player/executor.

Important system:

```txt
AgentRegistrySystem
```

Important relationship:

```txt
INFT owner key != executor key
```

The owner key owns/transfers the INFT. The executor key is a hot runtime key used
by Docker/player-agent to act in the world.

## Local Development Flow

### 1. Start Local Chain

Use the normal local Anvil/MUD flow for the repo.

The local RPC used by the current scripts is:

```txt
http://127.0.0.1:8545
```

The default dev private key usually used locally is:

```txt
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Do not use this key for real funds.

### 2. Deploy MUD + INFT Locally

From repo root:

```sh
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
pnpm mud:deploy:local
```

`contracts/script/PostDeploy.s.sol` deploys:

1. MUD world systems/tables.
2. `MockERC7857Verifier`.
3. `PantheonAgentINFT`.
4. Stores the INFT address in MUD `AgentConfig`.

After deploy, find the INFT address in:

```txt
contracts/broadcast/PostDeploy.s.sol/31337/run-latest.json
```

Example local addresses from the current dev run:

```txt
World: 0xDf4bf90B44e96C4CcD4F24D21901362cbDEaeB34
INFT:  0x3abBB0D6ad848d64c8956edC9Bf6f18aC22E1485
```

Local addresses change when the local chain is reset/redeployed.

### 3. Generate Metadata Locally

This creates metadata JSON files and a manifest without uploading to 0G:

```sh
pnpm --filter @pantheon/assets prepare-inft-metadata
```

Outputs:

```txt
generated/inft-metadata/player.json
generated/inft-metadata/player2.json
generated/inft-metadata/player3.json
generated/inft-metadata/player4.json
generated/inft-metadata/player5.json
generated/inft-metadata/inft-assets.json
```

This is useful for local-only testing, but the URIs will be local placeholders.

### 4. Upload Metadata To 0G Storage

For testnet:

```sh
OG_PRIVATE_KEY=0x... \
OG_RPC_URL=https://evmrpc-testnet.0g.ai \
OG_STORAGE_INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai \
OG_STORAGE_FINALITY_REQUIRED=false \
pnpm --filter @pantheon/assets upload-inft-metadata -- --no-require-finality
```

For mainnet storage:

```sh
OG_PRIVATE_KEY=0x... \
OG_RPC_URL=https://evmrpc.0g.ai \
OG_STORAGE_INDEXER_RPC=https://indexer-storage-turbo.0g.ai \
OG_STORAGE_FINALITY_REQUIRED=false \
pnpm --filter @pantheon/assets upload-inft-metadata -- --no-require-finality
```

The upload script:

1. Uploads each sprite sheet PNG.
2. Writes metadata JSON where `image` points to the sprite root.
3. Uploads each metadata JSON.
4. Writes `generated/inft-metadata/inft-assets.json`.

To wait for full 0G finality instead of returning earlier:

```sh
OG_STORAGE_FINALITY_REQUIRED=true pnpm --filter @pantheon/assets upload-inft-metadata
```

Finality can take a long time. For development, `--no-require-finality` is much
more ergonomic. Files may still need a few minutes to propagate before gateway
downloads work reliably.

### 5. Check Uploaded Files

Read the manifest:

```sh
jq '.agents[] | {id, publicURI, spriteSheetHash, metadataHash}' \
  generated/inft-metadata/inft-assets.json
```

Download by root hash:

```txt
https://indexer-storage-turbo.0g.ai/file?root=0xROOT_HASH&name=file.png
```

For testnet:

```txt
https://indexer-storage-testnet-turbo.0g.ai/file?root=0xROOT_HASH&name=file.png
```

The gateway serves by hash, so files may download without a useful extension
unless `name=` is provided.

### 6. Create INFT Mint Offers

This writes the manifest data onto the INFT contract as claimable offers.

```sh
cd contracts

PRIVATE_KEY=0x... \
AGENT_INFT_ADDRESS=0x... \
INFT_METADATA_MANIFEST=../generated/inft-metadata/inft-assets.json \
forge script CreatePlayerAgentOffers --rpc-url http://127.0.0.1:8545 --broadcast -vv
```

The script calls:

```solidity
createMintOffer(
  displayName,
  intelligentData,
  publicURI,
  encryptedStorageURI,
  memoryRoot
)
```

For each offer, `intelligentData` contains:

```txt
player-sprite-sheet -> spriteSheetHash
token-metadata      -> metadataHash
initial-memory-root -> memoryRoot
```

The `PRIVATE_KEY` must be the INFT `contractOwner`.

### 7. Approve Wallets To Mint

The admin must approve wallets for offers:

```solidity
approveMintOffer(offerId, userWallet)
```

Only approved wallets can claim:

```solidity
claimMintOffer(offerId)
```

After claim, the token stores the offer's `publicURI`. Then:

```solidity
tokenURI(tokenId)
```

returns the 0G metadata URI.

### 8. Register/Spawn In MUD

The game spawn flow is gated by owning/using an INFT.

Conceptually:

1. User mints/claims INFT.
2. User registers the token as a MUD agent/player through
   `AgentRegistrySystem`.
3. User sets an executor key.
4. Executor key runs through Docker/player-agent.

The executor private key is never stored onchain. The contract stores executor
address and permission bytes only.

## Mainnet / Production Flow

Production is the same sequence, but with real RPCs, funded keys, and no local
mock assumptions.

### 1. Upload Storage Assets To 0G Mainnet

Use a funded 0G mainnet wallet:

```sh
OG_PRIVATE_KEY=0x... \
OG_RPC_URL=https://evmrpc.0g.ai \
OG_STORAGE_INDEXER_RPC=https://indexer-storage-turbo.0g.ai \
OG_STORAGE_FINALITY_REQUIRED=false \
pnpm --filter @pantheon/assets upload-inft-metadata -- --no-require-finality
```

0G mainnet basics:

```txt
Chain ID: 16661
RPC: https://evmrpc.0g.ai
Storage indexer: https://indexer-storage-turbo.0g.ai
```

The wallet pays:

```txt
storage fee + transaction gas
```

The SDK calculates storage fee from the onchain storage market contract. The
script logs lines like:

```txt
Submitting transaction with storage fee: ...
```

Storage does not auto-charge the wallet later from this script. 0G's storage
model may require recharge/extension for long-term guaranteed availability, so
production systems should track upload roots and storage submissions.

### 2. Verify Storage

Before creating mainnet mint offers, verify every metadata root and sprite root
downloads correctly.

```sh
jq '.agents[] | {id, publicURI, spriteSheetHash, metadataHash}' \
  generated/inft-metadata/inft-assets.json
```

For each metadata root:

```txt
https://indexer-storage-turbo.0g.ai/file?root=0xMETADATA_ROOT&name=metadata.json
```

For each sprite root:

```txt
https://indexer-storage-turbo.0g.ai/file?root=0xSPRITE_ROOT&name=sprite.png
```

If a file downloads but has no extension, save it with the expected name and
check:

```sh
file sprite.png
wc -c sprite.png
```

### 3. Deploy Contracts To Target Chain

For true mainnet INFTs, deploy the MUD world and `PantheonAgentINFT` to the
target chain. Do not use the local Anvil address.

Required production decisions:

- Replace `MockERC7857Verifier` with the real verifier when available.
- Use a secure admin/multisig for the INFT owner.
- Keep deployment/private keys out of committed env files.
- Record deployed `WORLD_ADDRESS` and `AGENT_INFT_ADDRESS`.

After deploy, set env:

```sh
export AGENT_INFT_ADDRESS=0x...
export INFT_METADATA_MANIFEST=../generated/inft-metadata/inft-assets.json
```

### 4. Create Mainnet Mint Offers

Run the same offer script, but against mainnet RPC:

```sh
cd contracts

PRIVATE_KEY=0xADMIN_OR_DEPLOYER_KEY \
AGENT_INFT_ADDRESS=0xMAINNET_INFT \
INFT_METADATA_MANIFEST=../generated/inft-metadata/inft-assets.json \
forge script CreatePlayerAgentOffers --rpc-url https://evmrpc.0g.ai --broadcast -vv
```

This creates one offer per manifest agent. It does not mint directly to users.

### 5. Approve Users

Admin approves each wallet for the correct offer:

```solidity
approveMintOffer(offerId, userWallet)
```

Then users can claim:

```solidity
claimMintOffer(offerId)
```

### 6. Runtime Setup

After mint:

1. User owns the INFT with the custody wallet.
2. User creates/funds an executor hot wallet.
3. User authorizes the executor on the INFT with scoped permissions.
4. User configures Docker/player-agent with the executor private key.
5. Executor acts in MUD and appends memory.

The executor private key belongs in runtime env only, never in token metadata.

## Current Caveats

- `player5`'s sprite root has shown flaky gateway availability in current
  testing. Verify it before treating the manifest as production-ready.
- Existing mint offers cannot currently be edited. If metadata roots change
  before mint, create new offers after regenerating the manifest.
- Minted token owners can update their runtime pointer with
  `updateAgentRuntimePointer(...)`.
- The current local verifier is a mock and is not production security.
- 0G files may be available before finality, but finality is stronger.

## Useful Commands

Show manifest roots:

```sh
jq '.agents[] | {id, publicURI, spriteSheetHash, metadataHash}' \
  generated/inft-metadata/inft-assets.json
```

Create local offers:

```sh
cd contracts

PRIVATE_KEY=0x... \
AGENT_INFT_ADDRESS=0x... \
INFT_METADATA_MANIFEST=../generated/inft-metadata/inft-assets.json \
forge script CreatePlayerAgentOffers --rpc-url http://127.0.0.1:8545 --broadcast -vv
```

Read next offer ID:

```sh
cast call $AGENT_INFT_ADDRESS "nextMintOfferId()(uint256)" \
  --rpc-url http://127.0.0.1:8545
```

Read an offer:

```sh
cast call $AGENT_INFT_ADDRESS \
  "mintOfferOf(uint256)((uint256,address,uint256,string,string,string,bytes32,uint64,bool,bool,bool))" \
  1 \
  --rpc-url http://127.0.0.1:8545
```

Download from 0G gateway:

```sh
curl -L \
  "https://indexer-storage-turbo.0g.ai/file?root=0xROOT_HASH&name=file.png" \
  -o file.png
```

## References

- 0G Storage SDK: https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk
- 0G Storage client gateway shape:
  https://github.com/0gfoundation/0g-storage-client
- 0G StorageScan: https://storagescan.0g.ai/
