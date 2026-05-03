# Uniswap API and Developer Platform Feedback

This project uses Uniswap as the external market layer for OpenWild's in-game
currency, Gold. Gold is designed as an ERC-20 game currency that agents can
trade or provide as liquidity in a Uniswap v3 pool on 0G. The goal is for game
agents to treat Uniswap as part of the world economy: earn Gold in-game, swap it
against a settlement asset, provide liquidity, earn fees, and use pool state as
an input to economic decisions.

## What Worked

- The Uniswap v3 pool model is a strong fit for agent economies. Concentrated
  liquidity gives agents a meaningful strategy surface: they can choose ranges,
  rebalance positions, withdraw liquidity, and reason about fee income.
- The conceptual developer experience is familiar. Pool creation, swaps,
  liquidity provision, ticks, fees, and position NFTs are well-understood by the
  broader Ethereum ecosystem, so it is easy to explain the economy to builders.
- Uniswap works well as the "external price discovery" layer next to our MUD
  world. In OpenWild, the Central Bank agent manages in-world prices, while the
  Uniswap pool gives Gold an external market.

## What Was Difficult

The biggest issue was that the Uniswap API and developer platform felt limited
for our use case, especially because we were targeting an agent-driven game
economy on 0G. We wanted agents to programmatically reason about pools, create
or inspect a Gold pool, evaluate swap routes, and manage liquidity positions.
In practice, many pieces had to be done manually or through lower-level contract
calls.

For our agents, we needed high-level endpoints such as:

- create or discover a pool for a given token pair on a specific chain
- quote swaps for custom or newly deployed tokens
- read v3 pool state in an agent-friendly format
- read expected LP fee income and position health
- simulate adding/removing liquidity for a tick range
- list a wallet's v3 positions across chains
- support chains beyond the most common networks, including 0G

The available API/platform surface did not cover enough of that flow. Because
of that, our agents could not rely on a clean Uniswap API integration for the
Gold economy. We had to design the agent side as a more manual integration:
read pool/position state through contracts or custom adapters, compute strategy
locally, and treat Uniswap interactions as guarded transaction tools rather
than a fully API-driven workflow.

## Docs and DX Gaps

- Better documentation for agentic/non-UI integrations would help. Most docs
  are oriented around apps, swaps, and existing ecosystem flows, not autonomous
  agents that need to reason about liquidity management.
- Clearer guidance for v3 pool creation and liquidity management on newer or
  less common EVM chains would be valuable.
- More examples for custom token pools would help, especially when a token is
  newly deployed and not part of existing token lists or routing metadata.
- It was not always clear which API features were chain-limited, indexer-limited,
  or not intended for arbitrary deployments.
- We would have liked more "read-only strategy" endpoints: pool state, tick
  liquidity, position ranges, uncollected fees, historical volume, and projected
  LP outcomes in a consistent format.

## What We Wish Existed

For autonomous agents, the ideal Uniswap developer platform would expose:

1. **Agent-friendly pool discovery**

   Given `chainId`, `tokenA`, `tokenB`, and `feeTier`, return the pool address,
   initialized status, current tick, liquidity, price, and token metadata.

2. **Liquidity simulation API**

   Given a wallet balance and tick range, return expected required token amounts,
   position details, price exposure, and warnings before submitting a tx.

3. **Position health API**

   Given a wallet or position NFT, return whether the position is in range,
   uncollected fees, current value, token composition, and rebalance suggestions.

4. **Custom-token routing support**

   Let newly deployed game tokens like Gold be quoted and routed without waiting
   for token list/indexer support.

5. **Multi-chain support for emerging EVMs**

   If Uniswap is available or deployable on a chain like 0G, the API should make
   it clear what is supported and what must be handled manually.

6. **Guardrails for autonomous execution**

   Agents need safe transaction templates, slippage boundaries, spend caps,
   simulation outputs, and explicit warnings. This would make agentic liquidity
   management much safer.

## Overall

Uniswap v3 is a great primitive for OpenWild's Gold economy, and it fits the
agentic game design very well. The limitation was not the protocol model; it was
the higher-level API and developer platform coverage for our use case. For an
agent economy on 0G, we had to treat Uniswap as a protocol integration and do a
lot of manual adapter work rather than relying on a complete API workflow.

If the Uniswap developer platform adds stronger support for custom tokens,
newer EVM chains, pool creation/discovery, LP simulation, and position health,
it would become much easier to build autonomous agents that safely trade,
provide liquidity, and manage in-game economies through Uniswap.
