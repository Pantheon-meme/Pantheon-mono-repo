import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type PlayerInftAsset = {
  id: string;
  name: string;
  description: string;
  spriteId: string;
  spritePath: string;
};

type UploadResult = {
  uri: string;
  rootHash: `0x${string}`;
  txHash?: `0x${string}`;
};

type ManifestAgent = {
  id: string;
  name: string;
  publicURI: string;
  encryptedStorageURI: string;
  spriteSheetHash: `0x${string}`;
  metadataHash: `0x${string}`;
  memoryRoot: `0x${string}`;
};

type PrepareOptions = {
  upload: boolean;
  metadataDir: string;
  manifestPath: string;
  uriPrefix: string;
  encryptedBaseURI: string;
  finalityRequired: boolean;
};

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(packageRoot, "..", "..");
const defaultMetadataDir = path.join(repoRoot, "generated", "inft-metadata");
const defaultManifestPath = path.join(defaultMetadataDir, "inft-assets.json");
const defaultUriPrefix = process.env.OG_STORAGE_URI_PREFIX ?? "0g-storage://";
const defaultEncryptedBaseURI =
  process.env.AGENT_ENCRYPTED_BASE_URI ??
  "0g-storage://local-dev/agents/encrypted";

const playerAssets: PlayerInftAsset[] = [
  {
    id: "player",
    name: "Pantheon Agent - Player 1",
    description: "Original field wanderer playable INFT agent.",
    spriteId: "player",
    spritePath:
      "apps/game/src/assets/object-sprites/player/player-sprite-sheet.png",
  },
  {
    id: "player2",
    name: "Pantheon Agent - Player 2",
    description: "Desert gardener-explorer playable INFT agent.",
    spriteId: "player2",
    spritePath:
      "apps/game/src/assets/object-sprites/player2/player2-sprite-sheet.png",
  },
  {
    id: "player3",
    name: "Pantheon Agent - Player 3",
    description: "Open-faced unicorn suit playable INFT agent.",
    spriteId: "player3",
    spritePath:
      "apps/game/src/assets/object-sprites/player3/player3-sprite-sheet.png",
  },
  {
    id: "player4",
    name: "Pantheon Agent - Player 4",
    description: "Cat-eared night heroine playable INFT agent.",
    spriteId: "player4",
    spritePath:
      "apps/game/src/assets/object-sprites/player4/player4-sprite-sheet.png",
  },
  {
    id: "player5",
    name: "Pantheon Agent - Player 5",
    description: "Rose-gold mythic gardener playable INFT agent.",
    spriteId: "player5",
    spritePath:
      "apps/game/src/assets/object-sprites/player5/player5-sprite-sheet.png",
  },
];

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const uploader = options.upload ? await createUploader(options) : undefined;
  const agents: ManifestAgent[] = [];

  await mkdir(options.metadataDir, { recursive: true });

  for (const asset of playerAssets) {
    const spritePath = path.join(repoRoot, asset.spritePath);
    const spriteBuffer = await readFile(spritePath);
    const spriteHash = hashBytes(spriteBuffer);
    const spriteUpload = uploader
      ? await uploader(spritePath)
      : localUpload(asset.id, "sprite-sheet.png", spriteHash, options);
    const metadata = createTokenMetadata(asset, spriteUpload.uri);
    const metadataPath = path.join(options.metadataDir, `${asset.id}.json`);

    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

    const metadataBuffer = await readFile(metadataPath);
    const metadataHash = hashBytes(metadataBuffer);
    const metadataUpload = uploader
      ? await uploader(metadataPath)
      : localUpload(asset.id, "metadata.json", metadataHash, options);
    const memoryRoot = placeholderMemoryRoot(asset.id);

    agents.push({
      id: asset.id,
      name: asset.name,
      publicURI: metadataUpload.uri,
      encryptedStorageURI: `${options.encryptedBaseURI}/${asset.id}`,
      spriteSheetHash: spriteUpload.rootHash,
      metadataHash: metadataUpload.rootHash,
      memoryRoot,
    });

    console.log(
      `${asset.id}: sprite=${spriteUpload.uri} metadata=${metadataUpload.uri}`,
    );
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    uploaded: options.upload,
    agents,
    ids: agents.map((agent) => agent.id),
    names: agents.map((agent) => agent.name),
    publicURIs: agents.map((agent) => agent.publicURI),
    encryptedStorageURIs: agents.map((agent) => agent.encryptedStorageURI),
    spriteSheetHashes: agents.map((agent) => agent.spriteSheetHash),
    metadataHashes: agents.map((agent) => agent.metadataHash),
    memoryRoots: agents.map((agent) => agent.memoryRoot),
  };

  await mkdir(path.dirname(options.manifestPath), { recursive: true });
  await writeFile(
    options.manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`Wrote INFT metadata manifest to ${options.manifestPath}`);
}

function createTokenMetadata(
  asset: PlayerInftAsset,
  spriteURI: string,
): unknown {
  return {
    name: asset.name,
    description: asset.description,
    image: spriteURI,
    animation_url: spriteURI,
    attributes: [
      { trait_type: "Sprite ID", value: asset.spriteId },
      { trait_type: "Rows", value: 4 },
      { trait_type: "Columns", value: 4 },
      { trait_type: "Cell Size", value: 128 },
      { trait_type: "Agent Runtime", value: "executor-authorized" },
    ],
    pantheon: {
      spriteId: asset.spriteId,
      spriteSheet: spriteURI,
      manifest: {
        rows: 4,
        columns: 4,
        cellSize: 128,
        atlasWidth: 512,
        atlasHeight: 512,
      },
    },
  };
}

async function createUploader(
  options: PrepareOptions,
): Promise<(filePath: string) => Promise<UploadResult>> {
  const privateKey = process.env.OG_PRIVATE_KEY;
  const rpcURL = process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai";
  const indexerURL =
    process.env.OG_STORAGE_INDEXER_RPC ??
    process.env.OG_STORAGE_ENDPOINT ??
    "https://indexer-storage-testnet-turbo.0g.ai";

  if (!privateKey) {
    throw new Error("Missing OG_PRIVATE_KEY for --upload");
  }

  console.log(
    `0G upload finality required: ${options.finalityRequired ? "yes" : "no"}`,
  );

  const [{ Indexer, ZgFile }, { ethers }] = await Promise.all([
    import("@0gfoundation/0g-storage-ts-sdk"),
    import("ethers"),
  ]);
  const provider = new ethers.JsonRpcProvider(rpcURL);
  const signer = new ethers.Wallet(privateKey, provider);
  const indexer = new Indexer(indexerURL);

  return async (filePath: string): Promise<UploadResult> => {
    const file = await ZgFile.fromFilePath(filePath);

    try {
      const [tree, treeError] = await file.merkleTree();

      if (treeError !== null) {
        throw new Error(`Merkle tree error for ${filePath}: ${treeError}`);
      }

      const [tx, uploadError] = await indexer.upload(
        file,
        rpcURL,
        signer as never,
        {
          finalityRequired: options.finalityRequired,
          skipIfFinalized: true,
          skipTx: true,
        },
      );

      if (uploadError !== null) {
        throw new Error(`Upload error for ${filePath}: ${uploadError}`);
      }

      const rootHash = normalizeHash(readRootHash(tx, tree));
      const txHash = readTxHash(tx);

      return {
        uri: `${options.uriPrefix}${rootHash}`,
        rootHash,
        txHash,
      };
    } finally {
      await file.close();
    }
  };
}

function localUpload(
  assetId: string,
  fileName: string,
  rootHash: `0x${string}`,
  options: PrepareOptions,
): UploadResult {
  return {
    uri: `${options.uriPrefix}local-dev/inft/${assetId}/${fileName}`,
    rootHash,
  };
}

function readRootHash(tx: unknown, tree: unknown): unknown {
  if (isRecord(tx) && typeof tx.rootHash === "string") {
    return tx.rootHash;
  }

  if (
    isRecord(tx) &&
    Array.isArray(tx.rootHashes) &&
    typeof tx.rootHashes[0] === "string"
  ) {
    return tx.rootHashes[0];
  }

  if (
    isRecord(tree) &&
    typeof tree.rootHash === "function" &&
    typeof tree.rootHash() === "string"
  ) {
    return tree.rootHash();
  }

  throw new Error("0G upload did not return a root hash");
}

function readTxHash(tx: unknown): `0x${string}` | undefined {
  if (isRecord(tx) && isBytes32Hex(tx.txHash)) {
    return normalizeHash(tx.txHash);
  }

  if (
    isRecord(tx) &&
    Array.isArray(tx.txHashes) &&
    isBytes32Hex(tx.txHashes[0])
  ) {
    return normalizeHash(tx.txHashes[0]);
  }

  return undefined;
}

function hashBytes(bytes: Buffer): `0x${string}` {
  return normalizeHash(createHash("sha256").update(bytes).digest("hex"));
}

function placeholderMemoryRoot(assetId: string): `0x${string}` {
  return normalizeHash(
    createHash("sha256")
      .update(`pantheon:${assetId}:initial-memory-root`)
      .digest("hex"),
  );
}

function normalizeHash(value: unknown): `0x${string}` {
  if (typeof value !== "string") {
    throw new Error(`Expected hex string, received ${typeof value}`);
  }

  const normalized = value.startsWith("0x") ? value : `0x${value}`;

  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(`Expected bytes32 hex string, received ${value}`);
  }

  return normalized as `0x${string}`;
}

function isBytes32Hex(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.startsWith("0x") ? value : `0x${value}`;
  return /^0x[0-9a-fA-F]{64}$/.test(normalized);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseArgs(args: string[]): PrepareOptions {
  const parsed: PrepareOptions = {
    upload: false,
    metadataDir: defaultMetadataDir,
    manifestPath: defaultManifestPath,
    uriPrefix: defaultUriPrefix,
    encryptedBaseURI: defaultEncryptedBaseURI,
    finalityRequired: process.env.OG_STORAGE_FINALITY_REQUIRED === "true",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    switch (arg) {
      case "--":
        break;
      case "--upload":
        parsed.upload = true;
        break;
      case "--metadata-dir":
        parsed.metadataDir = path.resolve(readValue(arg, next));
        index += 1;
        break;
      case "--manifest":
        parsed.manifestPath = path.resolve(readValue(arg, next));
        index += 1;
        break;
      case "--uri-prefix":
        parsed.uriPrefix = readValue(arg, next);
        index += 1;
        break;
      case "--encrypted-base-uri":
        parsed.encryptedBaseURI = readValue(arg, next);
        index += 1;
        break;
      case "--require-finality":
        parsed.finalityRequired = true;
        break;
      case "--no-require-finality":
        parsed.finalityRequired = false;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

function readValue(flag: string, value: string | undefined): string {
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
