import {
  createPublicClient,
  createWalletClient,
  http,
  stringToHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { getActiveBiome } from "../src/game/biome/BiomeDefinitions";
import { terrainForageDefinitions } from "../src/game/forage/ForageLootDefinitions";
import { itemDefinitions } from "../src/game/items/ItemDefinitions";

type SeedForageOptions = {
  rpcUrl?: string;
  worldAddress?: Hex;
  privateKey?: Hex;
  dryRun?: boolean;
};

const defaultRpcUrl = "http://127.0.0.1:8545";
const defaultWorldAddress = "0xfDf868Ea710FfD8cd33b829c5AFf79eDd15EcD5f";
const defaultPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const forageAdminAbi = [
  {
    type: "function",
    name: "pantheon__registerItemType",
    stateMutability: "nonpayable",
    inputs: [
      { name: "itemId", type: "bytes32" },
      { name: "category", type: "bytes32" },
      { name: "label", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "pantheon__registerForageTable",
    stateMutability: "nonpayable",
    inputs: [
      { name: "terrainId", type: "bytes32" },
      { name: "tableId", type: "bytes32" },
      { name: "baseChance", type: "uint32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "pantheon__registerForageLootSlot",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tableId", type: "bytes32" },
      { name: "slot", type: "uint8" },
      { name: "itemId", type: "bytes32" },
      { name: "weight", type: "uint32" },
      { name: "minAmount", type: "uint32" },
      { name: "maxAmount", type: "uint32" },
      { name: "enabled", type: "bool" },
    ],
    outputs: [],
  },
] as const;

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const biome = getActiveBiome();
  const terrainIds = new Set(biome.terrains.map((terrain) => terrain.id));
  const forageDefinitions = terrainForageDefinitions.filter((definition) =>
    terrainIds.has(definition.terrainId),
  );
  const itemList = Object.values(itemDefinitions);
  const slotCount = forageDefinitions.reduce(
    (total, table) => total + table.loot.length,
    0,
  );

  console.log(
    `Prepared ${itemList.length} item types, ${forageDefinitions.length} forage tables, and ${slotCount} loot slots`,
  );

  if (options.dryRun) {
    return;
  }

  const account = privateKeyToAccount(options.privateKey ?? defaultPrivateKey);
  const rpcUrl = options.rpcUrl ?? process.env.MUD_RPC_URL ?? defaultRpcUrl;
  const worldAddress =
    options.worldAddress ??
    (process.env.MUD_WORLD_ADDRESS as Hex | undefined) ??
    defaultWorldAddress;
  const publicClient = createPublicClient({
    chain: foundry,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain: foundry,
    transport: http(rpcUrl),
  });

  for (const item of itemList) {
    const hash = await walletClient.writeContract({
      address: worldAddress,
      abi: forageAdminAbi,
      functionName: "pantheon__registerItemType",
      args: [toBytes32(item.id), toBytes32(item.category), item.label],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Registered item ${item.id}`);
  }

  for (const definition of forageDefinitions) {
    const tableHash = await walletClient.writeContract({
      address: worldAddress,
      abi: forageAdminAbi,
      functionName: "pantheon__registerForageTable",
      args: [
        toBytes32(definition.terrainId),
        toBytes32(definition.tableId),
        definition.baseChance,
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash: tableHash });
    console.log(`Registered forage table ${definition.tableId}`);

    for (const [slot, loot] of definition.loot.entries()) {
      const slotHash = await walletClient.writeContract({
        address: worldAddress,
        abi: forageAdminAbi,
        functionName: "pantheon__registerForageLootSlot",
        args: [
          toBytes32(definition.tableId),
          slot,
          toBytes32(loot.itemId),
          loot.weight,
          loot.minAmount ?? 1,
          loot.maxAmount ?? 1,
          true,
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash: slotHash });
    }
  }
}

function toBytes32(value: string): Hex {
  return stringToHex(value, { size: 32 });
}

function parseArgs(args: string[]): SeedForageOptions {
  const parsed: SeedForageOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--":
        break;
      case "--rpc":
        parsed.rpcUrl = readValue(arg, next);
        index += 1;
        break;
      case "--world":
        parsed.worldAddress = readValue(arg, next) as Hex;
        index += 1;
        break;
      case "--private-key":
        parsed.privateKey = readValue(arg, next) as Hex;
        index += 1;
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

function readValue(flag: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
