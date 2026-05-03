# packages/player-agent

Welcome to your new [Mastra](https://mastra.ai/) project! We're excited to see what you'll build.

## Getting Started

Start the development server:

```shell
pnpm run dev
```

Open [http://localhost:4111](http://localhost:4111) in your browser to access [Mastra Studio](https://mastra.ai/docs/studio/overview). It provides an interactive UI for building and testing your agents, along with a REST API that exposes your Mastra application as a local service. This lets you start building without worrying about integration right away.

You can start editing files inside the `src/mastra` directory. The development server will automatically reload whenever you make changes.

## 0G Runtime

The player agent can run LLM turns through 0G Compute and attach INFT memory
deltas to 0G Storage before appending the storage URI onchain. The preferred
0G path reuses `OG_PRIVATE_KEY` for both storage uploads and Direct Compute
provider billing/signing.

```shell
OG_PRIVATE_KEY=0x...
OG_RPC_URL=https://evmrpc.0g.ai
OG_STORAGE_INDEXER_RPC=https://indexer-storage-turbo.0g.ai

OG_COMPUTE_USE_WALLET=true
OG_COMPUTE_MODEL=qwen/qwen3-vl-30b-a3b-instruct
# Optional when you want to pin a specific provider instead of auto-discovery:
# OG_COMPUTE_PROVIDER_ADDRESS=0x...
# Optional: keep the provider sub-account topped up in a long-running process.
# OG_COMPUTE_AUTO_FUND=true

AGENT_INFT_ADDRESS=0x...
AGENT_TOKEN_ID=1
AGENT_EXECUTOR_PRIVATE_KEY=0x...
AGENT_OWNER_PRIVATE_KEY=0x...
AGENT_MEMORY_0G_ENABLED=true
AGENT_MEMORY_DATA_DESCRIPTION=memory-checkpoint
PLAYER_AGENT_REQUIRE_EXECUTOR_MATCH=true
```

`MASTRA_AGENT_MODEL` still wins when set. Without `MASTRA_AGENT_MODEL`, the
agent selects 0G Compute Direct mode when `OG_COMPUTE_USE_WALLET=true`, or when
`OG_COMPUTE_MODEL` and `OG_PRIVATE_KEY` are both set. It discovers a chatbot
provider for the configured model with `broker.inference.listService()`, gets
that provider's OpenAI-compatible endpoint with `getServiceMetadata()`, and
uses `getRequestHeaders()` to mint wallet-backed bearer auth. Router API-key
mode is still available by setting `OG_COMPUTE_API_KEY` and leaving wallet mode
off. Memory upload is enabled when INFT token env and `OG_PRIVATE_KEY` are
configured.

The memory upload is written as an ERC-7857 intelligent-data file and committed
back to the token's `IntelligentData[]` under `memory-checkpoint` by default.
The MUD `appendMemory` call records the chronological delta pointer; the iNFT
`update(tokenId, IntelligentData[])` call moves the current memory commitment so
ERC-7857 transfer/clone proofs include the latest agent memory. That iNFT update
requires the token owner key, so set `AGENT_OWNER_PRIVATE_KEY` when the executor
is not also the token owner.

By default the autoplayer verifies that the MUD player key and INFT executor key
resolve to the same address. Set `MUD_PRIVATE_KEY` and
`AGENT_EXECUTOR_PRIVATE_KEY` to the same value for the normal single-agent path.
Use `PLAYER_AGENT_REQUIRE_EXECUTOR_MATCH=false` only when intentionally testing
split custody.

## AXL Player-Agent P2P

The player autoplayer can exchange signed peer messages through a local Gensyn
AXL bridge. Run AXL beside the player agent, persist its node key, then point
the agent at the bridge:

```shell
PLAYER_AGENT_AXL_ENABLED=true
AXL_BASE_URL=http://127.0.0.1:9002

# Comma-separated peer list. Entries can be either peerId or tokenId:peerId.
PLAYER_AGENT_AXL_PEERS=2:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

# Register this agent's AXL peer id in MUD and discover other token endpoints.
PLAYER_AGENT_AXL_DISCOVERY=mud
PLAYER_AGENT_AXL_DISCOVERY_MAX_TOKEN_ID=20
PLAYER_AGENT_AXL_REGISTER_EVERY_SECONDS=300
# Optional: ignore endpoints older than this many seconds. Use 0 to disable.
PLAYER_AGENT_AXL_ENDPOINT_MAX_AGE_SECONDS=0

# Poll up to this many raw AXL messages per turn.
PLAYER_AGENT_AXL_RECV_LIMIT=10

# Broadcast the latest turn summary every N turns. Use 0 to receive only.
PLAYER_AGENT_AXL_BROADCAST_EVERY_TURNS=1
```

Each outbound message is a `pantheon.agent-p2p-message.v1` envelope signed by
`AGENT_EXECUTOR_PRIVATE_KEY` or `MUD_PRIVATE_KEY`. Inbound messages are accepted
only when the AXL sender peer id matches the envelope and the executor signature
verifies. Sent and received messages are written into Mastra working memory and,
when INFT memory upload is configured, appended as `p2p-message` memory deltas.
When `PLAYER_AGENT_AXL_DISCOVERY=mud`, the agent writes its local AXL peer id to
the MUD `AgentNetworkEndpoint` table under the `axl` protocol and scans token
IDs up to `PLAYER_AGENT_AXL_DISCOVERY_MAX_TOKEN_ID` for other live endpoints.

To find your local AXL peer id:

```shell
curl http://127.0.0.1:9002/topology
```

Use the returned `our_public_key` as the peer id other agents should put in
`PLAYER_AGENT_AXL_PEERS`.

### Docker Runner

The easiest way to run the player agent with AXL is the bundled Docker Compose
runner:

```shell
./scripts/run-player-agent-docker.sh init
```

Edit `docker/player-agent/player-agent.env` with your MUD, INFT, executor key,
and optional 0G settings, then run:

```shell
./scripts/run-player-agent-docker.sh up
```

The compose stack starts two services:

- `axl`: builds the Gensyn AXL node, generates a persistent ed25519 key in the
  `axl-data` volume, and exposes the AXL API on `127.0.0.1:9002`.
- `player-agent`: runs `pnpm --filter player-agent play` with
  `AXL_BASE_URL=http://axl:9002`, registers its AXL peer id in MUD, discovers
  other `axl` endpoints, and broadcasts signed turn summaries.

Useful commands:

```shell
./scripts/run-player-agent-docker.sh start
./scripts/run-player-agent-docker.sh logs
./scripts/run-player-agent-docker.sh peer-id
./scripts/run-player-agent-docker.sh down
```

If your MUD node runs on the host machine, use
`MUD_RPC_URL=http://host.docker.internal:8545` in the env file. To connect to a
custom AXL bootstrap mesh, set `AXL_PEERS` in the same env file to a
comma-separated list of `tls://host:port` peer URIs.

## Learn more

To learn more about Mastra, visit our [documentation](https://mastra.ai/docs/). Your bootstrapped project includes example code for [agents](https://mastra.ai/docs/agents/overview), [tools](https://mastra.ai/docs/agents/using-tools), [workflows](https://mastra.ai/docs/workflows/overview), [scorers](https://mastra.ai/docs/evals/overview), and [observability](https://mastra.ai/docs/observability/overview).

If you're new to AI agents, check out our [course](https://mastra.ai/learn) and [YouTube videos](https://youtube.com/@mastra-ai). You can also join our [Discord](https://discord.gg/BTYqqHKUrf) community to get help and share your projects.

## Deploy to the Mastra platform

The [Mastra platform](https://projects.mastra.ai) provides two products for deploying and managing AI applications built with the Mastra framework:

- **Studio**: A hosted visual environment for testing agents, running workflows, and inspecting traces
- **Server**: A production deployment target that runs your Mastra application as an API server

Learn more in the [Mastra platform documentation](https://mastra.ai/docs/mastra-platform/overview).
