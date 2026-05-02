import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import {
  biomeDefinitions,
  getActiveBiome,
} from "../src/game/biome/BiomeDefinitions";
import { generateTerrainSeedRecords } from "../src/game/terrain/TerrainSeedRecords";

type ResetMudRuntimeOptions = {
  biomeId?: string;
  gridWidth?: number;
  gridHeight?: number;
  tileSize?: number;
  spawnTileX?: number;
  spawnTileY?: number;
  radius?: number;
  batchSize?: number;
  rpcUrl?: string;
  worldAddress?: Hex;
  privateKey?: Hex;
  resetCells?: boolean;
  resetTerrainState?: boolean;
  dryRun?: boolean;
};

const defaultRpcUrl = "http://127.0.0.1:8545";
const defaultWorldAddress = "0xfDf868Ea710FfD8cd33b829c5AFf79eDd15EcD5f";
const defaultPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const defaultGridWidth = 200;
const defaultGridHeight = 200;
const defaultTileSize = 256;
const defaultBatchSize = 250;

const devResetAbi = [
  {
    type: "error",
    name: "World_FunctionSelectorNotFound",
    inputs: [{ name: "functionSelector", type: "bytes4" }],
  },
  {
    type: "function",
    name: "pantheon__resetCurrentPlayerAndWorldObjects",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "pantheon__resetRuntimeCells",
    stateMutability: "nonpayable",
    inputs: [
      { name: "xs", type: "int32[]" },
      { name: "ys", type: "int32[]" },
      { name: "resetTerrainState", type: "bool" },
    ],
    outputs: [],
  },
] as const;

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
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

  console.log(`Prepared runtime reset for ${account.address}`);

  const cellBatches = options.resetCells ? prepareCellBatches(options) : [];

  if (options.resetCells) {
    const cellCount = cellBatches.reduce(
      (total, batch) => total + batch.length,
      0,
    );

    console.log(
      `Prepared ${cellCount} runtime cells in ${cellBatches.length} batch(es)`,
    );
  }

  if (options.dryRun) {
    return;
  }

  const resetHash = await walletClient.writeContract({
    address: worldAddress,
    abi: devResetAbi,
    functionName: "pantheon__resetCurrentPlayerAndWorldObjects",
  });
  await publicClient.waitForTransactionReceipt({ hash: resetHash });
  console.log("Reset current player, inventory objects, and world objects");

  for (let index = 0; index < cellBatches.length; index += 1) {
    const batch = cellBatches[index];
    const hash = await walletClient.writeContract({
      address: worldAddress,
      abi: devResetAbi,
      functionName: "pantheon__resetRuntimeCells",
      args: [
        batch.map((record) => record.x),
        batch.map((record) => record.y),
        options.resetTerrainState ?? false,
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Reset runtime cell batch ${index + 1}/${cellBatches.length}`);
  }
}

function prepareCellBatches(
  options: ResetMudRuntimeOptions,
): Array<ReturnType<typeof generateTerrainSeedRecords>> {
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
  const allRecords = generateTerrainSeedRecords({
    biome,
    gridWidth,
    gridHeight,
    tileSize,
    spawnTileX,
    spawnTileY,
  });
  const records =
    options.radius === undefined
      ? allRecords
      : allRecords.filter(
          (record) =>
            Math.abs(record.x - spawnTileX) <= options.radius! &&
            Math.abs(record.y - spawnTileY) <= options.radius!,
        );
  const batches: Array<ReturnType<typeof generateTerrainSeedRecords>> = [];

  for (let index = 0; index < records.length; index += batchSize) {
    batches.push(records.slice(index, index + batchSize));
  }

  return batches;
}

function parseArgs(args: string[]): ResetMudRuntimeOptions {
  const parsed: ResetMudRuntimeOptions = {};

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
      case "--radius":
        parsed.radius = readNumber(arg, next);
        index += 1;
        break;
      case "--batch-size":
        parsed.batchSize = readPositiveInteger(arg, next);
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
      case "--cells":
        parsed.resetCells = true;
        break;
      case "--reset-terrain-state":
        parsed.resetTerrainState = true;
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

function readPositiveInteger(flag: string, value: string | undefined): number {
  const parsed = readNumber(flag, value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} must be a positive integer`);
  }

  return parsed;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("World_FunctionSelectorNotFound") ||
    message.includes("0xfdde54e2")
  ) {
    console.error(
      [
        "Dev reset system is not registered in the current MUD World.",
        "Deploy or restart the local MUD contracts after adding DevResetSystem, then run this command again.",
        "",
        "Try:",
        "  pnpm mud:deploy:local",
        "",
        "Or restart the contracts process if you are using:",
        "  pnpm mud:dev",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  console.error(message);
  process.exitCode = 1;
});
