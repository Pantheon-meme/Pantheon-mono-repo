import {
  createPublicClient,
  createWalletClient,
  http,
  stringToHex,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { getActiveBiome, biomeDefinitions } from "../src/game/biome/BiomeDefinitions";
import { generateTerrainSeedRecords } from "../src/game/terrain/TerrainSeedRecords";

type TerrainTypeSeed = {
  terrainId: string;
  label: string;
  walkable: boolean;
  diggable: boolean;
  plantable: boolean;
  sleepModifier: number;
  moveCost: number;
};

type SeedTerrainOptions = {
  biomeId?: string;
  gridWidth?: number;
  gridHeight?: number;
  tileSize?: number;
  spawnTileX?: number;
  spawnTileY?: number;
  batchSize?: number;
  rpcUrl?: string;
  worldAddress?: Hex;
  privateKey?: Hex;
  dryRun?: boolean;
};

const defaultRpcUrl = "http://127.0.0.1:8545";
const defaultWorldAddress = "0xfDf868Ea710FfD8cd33b829c5AFf79eDd15EcD5f";
const defaultPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const defaultGridWidth = 200;
const defaultGridHeight = 200;
const defaultTileSize = 256;
const defaultBatchSize = 500;

const terrainSystemAbi = [
  {
    type: "function",
    name: "pantheon__initTerrainAdmin",
    stateMutability: "nonpayable",
    inputs: [{ name: "admin", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "pantheon__registerTerrainType",
    stateMutability: "nonpayable",
    inputs: [
      { name: "terrainId", type: "bytes32" },
      { name: "label", type: "string" },
      { name: "walkable", type: "bool" },
      { name: "diggable", type: "bool" },
      { name: "plantable", type: "bool" },
      { name: "sleepModifier", type: "uint32" },
      { name: "moveCost", type: "uint32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "pantheon__seedTerrainTiles",
    stateMutability: "nonpayable",
    inputs: [
      { name: "xs", type: "int32[]" },
      { name: "ys", type: "int32[]" },
      { name: "terrainIds", type: "bytes32[]" },
      { name: "biomeIds", type: "bytes32[]" },
    ],
    outputs: [],
  },
] as const;

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const biome = options.biomeId
    ? biomeDefinitions[options.biomeId]
    : getActiveBiome();

  if (!biome) {
    throw new Error(`Unknown biome: ${options.biomeId ?? "active"}`);
  }

  const gridWidth = options.gridWidth ?? defaultGridWidth;
  const gridHeight = options.gridHeight ?? defaultGridHeight;
  const tileSize = options.tileSize ?? defaultTileSize;
  const spawnTileX = options.spawnTileX ?? Math.floor(gridWidth / 2);
  const spawnTileY = options.spawnTileY ?? Math.floor(gridHeight / 2);
  const batchSize = options.batchSize ?? defaultBatchSize;
  const terrainTypes = getTerrainTypeSeeds(biome);
  const records = generateTerrainSeedRecords({
    biome,
    gridWidth,
    gridHeight,
    tileSize,
    spawnTileX,
    spawnTileY,
  });

  console.log(
    `Prepared ${records.length} ${biome.id} terrain tiles and ${terrainTypes.length} terrain types`,
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

  await submitOptionalTx(
    "init terrain admin",
    async () =>
      walletClient.writeContract({
        address: worldAddress,
        abi: terrainSystemAbi,
        functionName: "pantheon__initTerrainAdmin",
        args: [account.address],
      }),
    publicClient,
  );

  for (const terrainType of terrainTypes) {
    const hash = await walletClient.writeContract({
      address: worldAddress,
      abi: terrainSystemAbi,
      functionName: "pantheon__registerTerrainType",
      args: [
        toBytes32(terrainType.terrainId),
        terrainType.label,
        terrainType.walkable,
        terrainType.diggable,
        terrainType.plantable,
        terrainType.sleepModifier,
        terrainType.moveCost,
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Registered terrain type ${terrainType.terrainId}`);
  }

  for (let index = 0; index < records.length; index += batchSize) {
    const batch = records.slice(index, index + batchSize);
    const hash = await walletClient.writeContract({
      address: worldAddress,
      abi: terrainSystemAbi,
      functionName: "pantheon__seedTerrainTiles",
      args: [
        batch.map((record) => record.x),
        batch.map((record) => record.y),
        batch.map((record) => toBytes32(record.terrainId)),
        batch.map((record) => toBytes32(record.biomeId)),
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Seeded terrain tiles ${index + 1}-${index + batch.length}`);
  }
}

async function submitOptionalTx(
  label: string,
  submit: () => Promise<Hex>,
  publicClient: ReturnType<typeof createPublicClient>,
): Promise<void> {
  try {
    const hash = await submit();
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Submitted ${label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("admin exists")) {
      console.log(`Skipped ${label}: already initialized`);
      return;
    }

    throw error;
  }
}

function getTerrainTypeSeeds(
  biome: ReturnType<typeof getActiveBiome>,
): TerrainTypeSeed[] {
  return biome.terrains.map((terrain) => {
    const properties = terrainProperties(terrain.id);

    return {
      terrainId: terrain.id,
      label: terrain.label,
      ...properties,
    };
  });
}

function terrainProperties(
  terrainId: string,
): Omit<TerrainTypeSeed, "terrainId" | "label"> {
  switch (terrainId) {
    case "water":
      return {
        walkable: false,
        diggable: false,
        plantable: false,
        sleepModifier: 0,
        moveCost: 1,
      };
    case "stone":
    case "path":
      return {
        walkable: true,
        diggable: false,
        plantable: false,
        sleepModifier: 2,
        moveCost: 1,
      };
    case "swamp":
      return {
        walkable: true,
        diggable: false,
        plantable: true,
        sleepModifier: 2,
        moveCost: 2,
      };
    case "dirt":
    case "sand":
      return {
        walkable: true,
        diggable: true,
        plantable: true,
        sleepModifier: 7,
        moveCost: 1,
      };
    default:
      return {
        walkable: true,
        diggable: true,
        plantable: true,
        sleepModifier: 4,
        moveCost: 1,
      };
  }
}

function toBytes32(value: string): Hex {
  return stringToHex(value, { size: 32 });
}

function parseArgs(args: string[]): SeedTerrainOptions {
  const parsed: SeedTerrainOptions = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--":
        break;
      case "--biome":
        parsed.biomeId = readValue(arg, next);
        index += 1;
        break;
      case "--width":
        parsed.gridWidth = readNumber(arg, next);
        index += 1;
        break;
      case "--height":
        parsed.gridHeight = readNumber(arg, next);
        index += 1;
        break;
      case "--tile-size":
        parsed.tileSize = readNumber(arg, next);
        index += 1;
        break;
      case "--spawn-x":
        parsed.spawnTileX = readNumber(arg, next);
        index += 1;
        break;
      case "--spawn-y":
        parsed.spawnTileY = readNumber(arg, next);
        index += 1;
        break;
      case "--batch-size":
        parsed.batchSize = readNumber(arg, next);
        index += 1;
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

function readNumber(flag: string, value: string | undefined): number {
  const parsed = Number(readValue(flag, value));

  if (!Number.isFinite(parsed)) {
    throw new Error(`${flag} must be a number`);
  }

  return parsed;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
