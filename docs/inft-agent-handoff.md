# INFT Agent Implementation Handoff

This document is the working handoff for the next agent. It explains what has
been built, why it exists, and the next steps to make Pantheon agents run as
0G-style INFTs.

## Goal

Pantheon agents should be ownable and transferable as intelligent NFTs while
still acting inside the MUD world through normal authoritative game state.

The architecture is:

- `PantheonAgentINFT`: owns encrypted intelligence, verifier-backed transfer,
  cloning, authorized users, and Pantheon executor permissions.
- MUD `AgentRegistrySystem`: binds an INFT token to a MUD player/executor and
  stores append-only memory pointers.
- `packages/player-agent`: runs the hot executor key, checks permission, acts in
  MUD, and appends encrypted memory deltas.

## What Exists Now

### ERC-7857 Interface

File: `contracts/src/interfaces/IERC7857.sol`

This defines the ERC-7857-shaped surface used by Pantheon:

- `IntelligentData`
- `AccessProof`
- `OwnershipProof`
- `TransferValidityProof`
- `TransferValidityProofOutput`
- `IERC7857DataVerifier`
- `IERC7857`
- `IERC7857Metadata`
- `IPantheonAgentINFT`

The Pantheon extension adds:

```solidity
usageAuthorization(tokenId, executor)
```

which returns permission bytes, expiry, and existence. The permission bytes are
currently ABI-encoded `uint256` bitsets matching `AgentPermissionLib`.

### Pantheon Agent INFT

File: `contracts/src/tokens/PantheonAgentINFT.sol`

This contract implements the INFT token for agents:

- `mint(IntelligentData[], to, publicURI, encryptedStorageURI, memoryRoot)`
- `createMintOffer(displayName, IntelligentData[], publicURI, encryptedStorageURI, memoryRoot)`
- `approveMintOffer(offerId, wallet)`
- `revokeMintOfferApproval(offerId)`
- `claimMintOffer(offerId)`
- `mintOfferOf(offerId)`
- `mintOfferIntelligentDataOf(offerId)`
- `approvedMintOfferIdsOf(wallet)`
- `approvedMintOffersOf(wallet)`
- `update(tokenId, IntelligentData[])`
- `iTransfer` and `iTransferFrom`
- `iClone` and `iCloneFrom`
- `authorizeUsage`
- `authorizeUsageWithPermissions`
- `batchAuthorizeUsage`
- `revokeAuthorization`
- `delegateAccess`
- `approve`, `setApprovalForAll`, `transferFrom`
- `agentRuntimePointerOf(tokenId)`
- `usageAuthorization(tokenId, executor)`

Important distinction:

- Admin mint offers are preconfigured claimable agent slots. Users only mint
  offers approved for their wallet.
- ERC-7857 authorized users are the standard-level usage group.
- Pantheon permission bytes are game/runtime permissions for executor keys.
- The INFT owner remains the custody key.
- The executor key should be a hot wallet with scoped permissions.
- Executor private keys are runtime secrets only. Users configure them in
  Docker/runtime env; the INFT contract only stores executor addresses and
  permission bytes.

### Mock Verifier

File: `contracts/src/verifiers/MockERC7857Verifier.sol`

This is a local-dev verifier. It does not prove real TEE/ZKP correctness. It
returns `TransferValidityProofOutput[]` from the proof inputs so local
`iTransfer` / `iClone` flows can be tested.

For local transfers/clones with this mock:

- Set `accessProof.oldDataHash` to the current `IntelligentData.dataHash`.
- Set `accessProof.newDataHash` to the new encrypted data hash.
- Put the recipient or access assistant address in the first 20 bytes of
  `accessProof.proof`.
- Provide the recipient public key in `accessProof.encryptedPubKey`.
- Optionally provide `ownershipProof.sealedKey`.

Later, replace this verifier with the 0G verifier / TEE / ZKP verifier.

### MUD Agent Tables

File: `contracts/mud.config.ts`

Added tables:

- `AgentConfig`: stores the active INFT contract address.
- `AgentIdentity`: maps token ID to player/executor/public identity.
- `AgentPlayer`: reverse lookup from player address to token ID.
- `AgentPermission`: mirrored executor permission bitset and budgets.
- `AgentMemoryCount`: sequence counter for memory deltas.
- `AgentMemoryDelta`: append-only encrypted memory delta pointers.
- `AgentMemoryCheckpoint`: latest encrypted checkpoint pointer.

### MUD Agent Registry System

File: `contracts/src/systems/AgentRegistrySystem.sol`

Main functions:

- `setAgentINFTContract(address)`
- `registerAgent(tokenId, player, publicName, publicURI)`
- `setAgentExecutor(tokenId, executor, permissionBits, expiresAt, maxActionsPerEpoch, maxCucSpendPerEpoch)`
- `mirrorINFTAuthorization(tokenId, executor, expiresAt, maxActionsPerEpoch, maxCucSpendPerEpoch)`
- `revokeAgentExecutor(tokenId, executor)`
- `appendMemory(tokenId, encryptedDeltaURI, deltaHash, action)`
- `updateMemoryCheckpoint(tokenId, encryptedCheckpointURI, checkpointHash, memoryRoot)`
- `isAuthorized(tokenId, executor, requiredBits)`
- `consumeAgentAction(tokenId, requiredBits, cucSpend)`

`mirrorINFTAuthorization` reads the INFT's `usageAuthorization` and writes it
into MUD `AgentPermission`, so game systems and indexers can use MUD-native
state.

### Permission Bits

Files:

- `contracts/src/libraries/AgentPermissionLib.sol`
- `packages/player-agent/src/mastra/agent-capsules/agent-capsule.ts`

Bits are shared between Solidity and TypeScript:

```txt
CAN_RUN_INFERENCE
CAN_ACT_IN_WORLD
CAN_MOVE
CAN_FORAGE
CAN_SLEEP
CAN_PICKUP
CAN_DROP
CAN_PLANT
CAN_HARVEST
CAN_WATER
CAN_TEND
CAN_BANK_SELL
CAN_BANK_BUY
CAN_APPEND_MEMORY
CAN_CHECKPOINT_MEMORY
CAN_UPDATE_PUBLIC_PROFILE
CAN_CLONE
```

### Deploy Wiring

File: `contracts/script/PostDeploy.s.sol`

Post-deploy now:

1. Seeds world time.
2. Spawns the deployer at `100,100`.
3. Deploys `MockERC7857Verifier`.
4. Deploys `PantheonAgentINFT`.
5. Calls `pantheon__setAgentINFTContract(address(agentINFT))`.

This completes the first two implementation steps:

- local verifier exists
- INFT contract is deployed and connected to MUD

## Verification Completed

Commands run:

```sh
pnpm --filter @pantheon/contracts build
pnpm exec tsc --noEmit
```

The contracts build passes. The output includes existing generated-code lint
noise and a sandbox warning about Foundry being unable to write
`~/.foundry/cache/signatures`; compilation succeeds.

## Next Steps

### 0. Admin-Approved User Minting

Status: contract functions implemented in `PantheonAgentINFT`.

The intended product flow is:

1. Admin creates a claimable mint offer:

```solidity
createMintOffer(displayName, intelligentData, publicURI, encryptedStorageURI, memoryRoot)
```

2. Admin approves a user wallet:

```solidity
approveMintOffer(offerId, userWallet)
```

3. UI lists available offers for the connected wallet:

```solidity
approvedMintOffersOf(userWallet)
```

4. User claims the approved offer from their custody wallet:

```solidity
claimMintOffer(offerId)
```

This mints the INFT to the user wallet and marks the offer claimed. It does not
store any private key and does not automatically configure Docker.

5. User later configures the runtime executor:

- Docker/runtime receives `AGENT_EXECUTOR_PRIVATE_KEY`.
- The custody wallet authorizes the derived executor address with
  `authorizeUsageWithPermissions(...)`.
- MUD mirrors that authorization with `pantheon__mirrorINFTAuthorization(...)`.

### 1. Mint The First Local Agent

Status: implemented in `contracts/script/MintDevAgent.s.sol`.

Run it against a deployed local MUD world:

```sh
cd contracts
forge script script/MintDevAgent.s.sol \
  --rpc-url ${MUD_RPC_URL:-http://127.0.0.1:8545} \
  --broadcast
```

The script:

1. Reads the deployed `PantheonAgentINFT` address from the latest deploy output
   via MUD `AgentConfig`, or from `AGENT_INFT_ADDRESS`.
2. Builds `IntelligentData[]`:

```txt
agent-capsule        hash(encrypted capsule)
memory-checkpoint    hash(initial memory checkpoint)
strategy-profile     hash(private strategy config)
```

3. Calls `mint(...)`.
4. Calls `pantheon__registerAgent(tokenId, executor, name, publicURI)`.
5. Calls `authorizeUsageWithPermissions(...)`.
6. Calls `pantheon__mirrorINFTAuthorization(...)`.

By default the custody owner is `PRIVATE_KEY`, while the runtime executor is
`AGENT_EXECUTOR_PRIVATE_KEY` when provided. If no executor key or address is
provided, the script falls back to the owner address for local smoke tests.

If `AGENT_EXECUTOR_PRIVATE_KEY` is provided and that address has not spawned in
MUD yet, the script broadcasts a `pantheon__spawn(100, 100)` from the executor
before minting.

### 2. Authorize The Executor

Status: implemented as part of `MintDevAgent.s.sol`.

Owner calls:

```solidity
authorizeUsageWithPermissions(tokenId, executor, abi.encode(permissionBits), expiresAt)
```

Then mirror into MUD:

```solidity
pantheon__mirrorINFTAuthorization(tokenId, executor, expiresAt, maxActions, maxCucSpend)
```

For the first runtime, use:

```txt
CAN_RUN_INFERENCE
CAN_ACT_IN_WORLD
CAN_MOVE
CAN_FORAGE
CAN_SLEEP
CAN_PICKUP
CAN_PLANT
CAN_HARVEST
CAN_BANK_SELL
CAN_APPEND_MEMORY
```

### 3. Add Player-Agent INFT Client

Status: client helpers implemented.

Files:

```txt
packages/player-agent/src/mastra/inft/inft-client.ts
packages/player-agent/src/mastra/inft/memory-writer.ts
```

The client can:

- read `AGENT_INFT_ADDRESS`
- read `AGENT_TOKEN_ID`
- read `AGENT_EXECUTOR_PRIVATE_KEY`
- check `usageAuthorization`
- check `pantheon__isAuthorized`
- call `pantheon__appendMemory`

### 4. Append Memory After Economic Cycle

Status: helper exists, but not yet wired into `run-economic-cycle`.

After `run-economic-cycle`, create an encrypted memory delta.

Dev fallback can store local JSON first. Then call:

```solidity
pantheon__appendMemory(tokenId, encryptedDeltaURI, deltaHash, action)
```

Later replace local JSON with 0G Storage upload.

### 5. Add Agent-Aware Action Enforcement

Current first pass assumes:

```txt
executor address == MUD player address
```

That fits the existing `_msgSender()` gameplay systems.

Next stricter pass should consume permissions around gameplay actions. Options:

1. Runtime preflight only: call `pantheon__consumeAgentAction` before action.
2. Contract wrappers: add `agentMove`, `agentForage`, `agentSleep`, etc.
3. Refactor systems so player address and caller/executor can differ.

The safest long-term path is wrappers or shared internal action libraries.

### 6. Replace Mock Verifier

When 0G verifier details are final:

- Deploy real verifier.
- Call `PantheonAgentINFT.updateVerifier(realVerifier)`.
- Ensure proofs include real encrypted data hashes, sealed keys, receiver access
  proofs, and nonces.

### 7. Show Agents In Phaser

Read MUD `AgentIdentity` and `AgentPlayer` to display:

- agent public name
- public URI/avatar
- owner
- executor status
- latest action/memory headline

Good starting point:

```txt
apps/game/src/game/mud/systems/MudRemotePlayerHydrationSystem.ts
```

## Cautions

- Do not put owner private keys into the autonomous runtime.
- Executor keys may append memory but should not transfer the INFT.
- `MockERC7857Verifier` is only for local development.
- Memory deltas should be append-only; checkpoint updates need stricter
  permissions.
- MUD is still authoritative for game state. The INFT owns intelligence, not
  world truth.
