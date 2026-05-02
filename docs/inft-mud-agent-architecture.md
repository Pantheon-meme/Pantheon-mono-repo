# Pantheon INFT Agent Architecture

Pantheon agents should be modeled as 0G INFTs whose encrypted intelligence is
owned and transferred by ERC-7857, while MUD remains the authoritative state
layer for the playable world.

The practical split:

- The INFT is the agent soul: personality, private strategy, memory, and
  transferable intelligence.
- The MUD player is the agent body: position, energy, inventory, bank trades,
  plants, pending actions, and action logs.
- The executor key is the hot runtime key: it can play and append memory if the
  INFT owner authorized it.
- The owner key is the custody key: it can transfer the INFT, grant/revoke
  executors, and approve high-trust memory checkpoints.

## 0G / ERC-7857 Grounding

The 0G INFT docs define INFTs as ERC-7857-style NFTs for tokenizing AI agents
with encrypted metadata, secure re-encryption on transfer, oracle or TEE/ZKP
proof verification, and authorized usage by executors.

Relevant primitives from the docs:

- `transfer(from, to, tokenId, sealedKey, proof)` transfers token ownership
  together with re-encrypted metadata access.
- `clone(to, tokenId, sealedKey, proof)` can mint a derivative agent from the
  same protected metadata.
- `authorizeUsage(tokenId, executor, permissions)` lets the owner grant use of
  the INFT without transferring ownership.
- 0G Storage stores encrypted AI metadata.
- 0G Compute can execute private inference for authorized executors.

Sources:

- https://docs.0g.ai/concepts/inft
- https://docs.0g.ai/developer-hub/building-on-0g/inft/inft-overview
- https://docs.0g.ai/developer-hub/building-on-0g/inft/erc7857
- https://docs.0g.ai/developer-hub/building-on-0g/inft/integration

## System Shape

```txt
PantheonAgentINFT token
  ownerOf(tokenId)
  encryptedURI
  metadataHash
  authorizeUsage(tokenId, executor, permissions)
        |
        v
0G Storage
  encrypted base capsule
  encrypted memory deltas
  encrypted checkpoint snapshots
        |
        v
0G Compute / Agent Runtime
  decrypt/use capsule if owner or authorized executor
  plan actions
  append memory deltas
        |
        v
MUD World
  AgentIdentity
  AgentPermission
  AgentMemory
  PlayerState, ObjectState, Bank, Farming, Terrain
        |
        v
Phaser Client
  renders agent as another player with public identity and action trail
```

## Contract Surfaces

### `PantheonAgentINFT`

ERC-7857-compatible token contract.

Responsibilities:

- Mint an agent token with `encryptedURI` and `metadataHash`.
- Expose encrypted metadata pointer for authorized retrieval.
- Transfer with re-encryption proof.
- Authorize executor usage with Pantheon permission bytes.
- Emit events when usage is authorized, revoked, or metadata checkpoints change.

This contract should not own normal gameplay rules. It owns AI custody and
encrypted intelligence access.

### `AgentRegistrySystem`

MUD system and tables that bind an INFT to the MUD world.

Suggested tables:

```ts
AgentIdentity: {
  tokenId: "uint256",
  player: "address",
  owner: "address",
  executor: "address",
  active: "bool",
  publicName: "string",
  publicURI: "string"
}

AgentPermission: {
  tokenId: "uint256",
  executor: "address",
  permissionBits: "uint256",
  expiresAt: "uint64",
  maxActionsPerEpoch: "uint32",
  maxCucSpendPerEpoch: "uint256",
  usedActions: "uint32",
  usedCucSpend: "uint256",
  epoch: "uint32",
  exists: "bool"
}
```

Core functions:

```solidity
registerAgent(uint256 tokenId, address player, string publicName, string publicURI)
setAgentExecutor(uint256 tokenId, address executor, uint256 permissionBits, uint64 expiresAt)
revokeAgentExecutor(uint256 tokenId, address executor)
isAuthorized(uint256 tokenId, address executor, uint256 requiredBits) returns (bool)
```

The registry should verify the caller is the INFT owner or is explicitly
authorized by `PantheonAgentINFT`.

### `AgentMemorySystem`

MUD system for append-only memory pointers.

Suggested tables:

```ts
AgentMemoryCount: {
  tokenId: "uint256",
  count: "uint32",
  exists: "bool"
}

AgentMemoryDelta: {
  tokenId: "uint256",
  sequence: "uint32",
  executor: "address",
  encryptedDeltaURI: "string",
  deltaHash: "bytes32",
  action: "bytes32",
  createdAt: "uint64",
  exists: "bool"
}

AgentMemoryCheckpoint: {
  tokenId: "uint256",
  encryptedCheckpointURI: "string",
  checkpointHash: "bytes32",
  memoryRoot: "bytes32",
  updatedBy: "address",
  updatedAt: "uint64",
  exists: "bool"
}
```

Core functions:

```solidity
appendMemory(uint256 tokenId, string encryptedDeltaURI, bytes32 deltaHash, bytes32 action)
updateMemoryCheckpoint(uint256 tokenId, string encryptedCheckpointURI, bytes32 checkpointHash, bytes32 memoryRoot)
```

`appendMemory` requires `CAN_APPEND_MEMORY`.

`updateMemoryCheckpoint` requires `CAN_CHECKPOINT_MEMORY` or owner authority.

This protects the agent from a compromised executor: a bad executor can append
untrusted deltas until revoked, but cannot transfer the INFT and does not need
blanket authority to rewrite the full intelligence capsule.

## Permission Bits

Use a single `uint256` bitset so ERC-7857 `permissions` bytes can be mirrored
into MUD efficiently.

```txt
bit 0  CAN_RUN_INFERENCE
bit 1  CAN_ACT_IN_WORLD
bit 2  CAN_MOVE
bit 3  CAN_FORAGE
bit 4  CAN_SLEEP
bit 5  CAN_PICKUP
bit 6  CAN_DROP
bit 7  CAN_PLANT
bit 8  CAN_HARVEST
bit 9  CAN_WATER
bit 10 CAN_TEND
bit 11 CAN_BANK_SELL
bit 12 CAN_BANK_BUY
bit 13 CAN_APPEND_MEMORY
bit 14 CAN_CHECKPOINT_MEMORY
bit 15 CAN_UPDATE_PUBLIC_PROFILE
bit 16 CAN_CLONE
```

Default player-agent runtime permission set:

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

Do not grant these to the routine executor by default:

```txt
CAN_BANK_BUY
CAN_CHECKPOINT_MEMORY
CAN_UPDATE_PUBLIC_PROFILE
CAN_CLONE
```

The executor never receives transfer authority. Transfer remains ERC-7857 owner
custody.

## Agent Capsule Schema

The encrypted 0G Storage capsule should contain the private intelligence that
travels with the token.

```json
{
  "schema": "pantheon.agent-capsule.v1",
  "tokenId": "1",
  "agent": {
    "name": "Mosswick",
    "archetype": "cautious swamp forager",
    "deity": "uniswap",
    "homeBiome": "meadow",
    "publicDescription": "A patient collector who trusts damp ground."
  },
  "personality": {
    "voice": "warm, odd, practical",
    "riskTolerance": "low",
    "economicStyle": "slow compounding",
    "taboos": ["wasting energy", "selling rare seeds too early"]
  },
  "strategy": {
    "preferredTerrain": ["swamp", "forest-floor", "grass"],
    "avoidTerrain": ["stone"],
    "sleepThreshold": 20,
    "sellWhenValueAtLeast": 48,
    "plantWhenSeedsAvailable": true
  },
  "memory": {
    "summary": "Long-running identity and lessons.",
    "terrainLearnings": [],
    "relationships": [],
    "recentGoals": []
  },
  "runtime": {
    "model": "configured-by-runtime",
    "toolProfile": "economic-cycle-v1",
    "maxToolCallsPerTurn": 3
  }
}
```

Memory deltas should be compact, append-only, and encrypted before upload:

```json
{
  "schema": "pantheon.agent-memory-delta.v1",
  "tokenId": "1",
  "executor": "0x...",
  "turnId": "2026-05-02T12:00:00.000Z:0x...",
  "action": "forage",
  "summary": "Foraged swamp at 101,97 and found oracle_silt.",
  "observations": [
    {
      "kind": "terrain-yield",
      "terrainId": "swamp",
      "itemId": "oracle_silt",
      "amount": 1,
      "x": 101,
      "y": 97
    }
  ]
}
```

## Execution Flow

1. Runtime starts with `AGENT_TOKEN_ID` and executor private key.
2. Runtime reads `PantheonAgentINFT.ownerOf(tokenId)`.
3. Runtime checks `authorizeUsage` / MUD `AgentPermission`.
4. Runtime fetches encrypted capsule and latest checkpoint from 0G Storage.
5. 0G Compute or local development fallback produces a plan.
6. Runtime validates planned action against permission bits and budget caps.
7. Runtime submits the MUD transaction with the executor/player key.
8. MUD enforces normal world rules.
9. Runtime creates encrypted memory delta and stores it on 0G Storage.
10. Runtime calls `appendMemory` with the URI/hash.
11. Periodically, an owner or high-trust executor compacts deltas into a new
    checkpoint and calls `updateMemoryCheckpoint`.

## MUD Action Authority

Current gameplay systems use `_msgSender()` as the player address. The first
integration can keep that rule:

- The executor key is also the MUD player key.
- `AgentIdentity.player == executor`.
- INFT permission decides whether that executor is a valid agent runtime.

Later, if we want one executor service to operate many player bodies, introduce
meta-action entrypoints:

```solidity
agentMove(uint256 tokenId, address player, int32 x, int32 y)
agentForage(uint256 tokenId, address player, int32 x, int32 y)
agentSleep(uint256 tokenId, address player)
```

Those entrypoints verify `AgentPermission`, then apply rules against `player`.
That is more flexible but touches every action surface, so it is a second
milestone.

## First Milestone

Build the minimal playable INFT loop:

1. Add local `PantheonAgentINFT` interface and `AgentPermission` constants.
2. Add agent capsule and memory delta schemas to `packages/player-agent`.
3. Add dev-only encrypted capsule files or 0G Storage adapter stubs.
4. Run one existing `run-economic-cycle` using `AGENT_TOKEN_ID`.
5. After the cycle, create a memory delta and append/store it.
6. Show public agent identity in Phaser for remote agent players.

This milestone does not need full secure transfer yet. It proves that an INFT
can authorize a hot executor, play Pantheon through MUD, and accumulate
transferable encrypted memory.

## Open Questions

- Should the canonical `AgentPermission` state live only in the ERC-7857
  authorization bytes, only in MUD, or mirrored in both?
- What oracle/TEE service will produce transfer and checkpoint proofs for the
  first hackathon build?
- Should checkpoint updates require owner signatures, or can a high-trust
  executor update them under spend/action caps?
- Should public agent profile changes be on the INFT contract, in MUD, or both?
