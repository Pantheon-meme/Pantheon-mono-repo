import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const atlasFileName = "autotile-blob-7x7.png";
const centerVariantsFileName = "center-variants-4x4.png";

const currentFilePath = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(currentFilePath), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const generatedAutotileRoot = path.join(packageRoot, "generated/autotiles");
const gameAutotileRoot = path.join(repoRoot, "apps/game/src/assets/autotiles");
const terrainAtlasRegistryPath = path.join(gameAutotileRoot, "TerrainAtlasAssets.ts");

type PublishedTerrainAtlas = {
  id: string;
  importName: string;
  hasCenterVariants: boolean;
};

async function publishGameAssets(): Promise<void> {
  const generatedEntries = await fs.readdir(generatedAutotileRoot, {
    withFileTypes: true,
  });
  const copiedAssets: string[] = [];
  const publishedAtlases: PublishedTerrainAtlas[] = [];

  for (const entry of generatedEntries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) {
      continue;
    }

    const atlasName = entry.name;
    const sourcePath = path.join(generatedAutotileRoot, atlasName, atlasFileName);

    if (!(await fileExists(sourcePath))) {
      continue;
    }

    const destinationPath = path.join(gameAutotileRoot, atlasName, atlasFileName);

    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.copyFile(sourcePath, destinationPath);
    copiedAssets.push(path.relative(repoRoot, destinationPath));

    const centerVariantsSourcePath = path.join(
      generatedAutotileRoot,
      atlasName,
      centerVariantsFileName,
    );
    const centerVariantsDestinationPath = path.join(
      gameAutotileRoot,
      atlasName,
      centerVariantsFileName,
    );
    const hasCenterVariants = await fileExists(centerVariantsSourcePath);

    if (hasCenterVariants) {
      await fs.copyFile(centerVariantsSourcePath, centerVariantsDestinationPath);
      copiedAssets.push(path.relative(repoRoot, centerVariantsDestinationPath));
    }

    publishedAtlases.push({
      id: atlasName,
      importName: toImportName(atlasName),
      hasCenterVariants,
    });
  }

  if (publishedAtlases.length === 0) {
    throw new Error(
      `No generated autotile atlases found in ${path.relative(repoRoot, generatedAutotileRoot)}.`,
    );
  }

  await fs.writeFile(
    terrainAtlasRegistryPath,
    buildTerrainAtlasRegistryModule(publishedAtlases),
    "utf8",
  );

  console.log(`Published ${copiedAssets.length} game terrain asset(s):`);
  for (const copiedAsset of copiedAssets) {
    console.log(`- ${copiedAsset}`);
  }
  console.log(`- ${path.relative(repoRoot, terrainAtlasRegistryPath)}`);
}

function buildTerrainAtlasRegistryModule(atlases: PublishedTerrainAtlas[]): string {
  const imports = atlases
    .flatMap((atlas) => [
      `import ${atlas.importName}AtlasUrl from "./${atlas.id}/${atlasFileName}?url";`,
      ...(atlas.hasCenterVariants
        ? [
            `import ${atlas.importName}CenterVariantsUrl from "./${atlas.id}/${centerVariantsFileName}?url";`,
          ]
        : []),
    ])
    .join("\n");
  const entries = atlases
    .map(
      (atlas) => `  ${JSON.stringify(atlas.id)}: {
    id: ${JSON.stringify(atlas.id)},
    imageUrl: ${atlas.importName}AtlasUrl,${
      atlas.hasCenterVariants
        ? `\n    centerVariantsUrl: ${atlas.importName}CenterVariantsUrl,`
        : ""
    }
  },`,
    )
    .join("\n");

  return `${imports}

export type TerrainAtlasAssetId = string;

export type TerrainAtlasAsset = {
  id: TerrainAtlasAssetId;
  imageUrl: string;
  centerVariantsUrl?: string;
};

export const terrainAtlasAssets: Record<TerrainAtlasAssetId, TerrainAtlasAsset> = {
${entries}
};

export function getTerrainAtlasAsset(
  assetId: TerrainAtlasAssetId,
): TerrainAtlasAsset {
  return (
    terrainAtlasAssets[assetId] ??
    terrainAtlasAssets["uniswap-plain"] ??
    terrainAtlasAssets["vibrant-grass"]
  );
}

export function terrainAtlasTextureKey(assetId: TerrainAtlasAssetId): string {
  return \`terrain-atlas-\${assetId}\`;
}

export function terrainCenterVariantTextureKey(
  assetId: TerrainAtlasAssetId,
): string {
  return \`terrain-center-variants-\${assetId}\`;
}
`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

function toImportName(value: string): string {
  const words = value.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const name = words
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`,
    )
    .join("");

  return `${name || "terrain"}Terrain`;
}

publishGameAssets().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[publish-game-assets] ${message}`);
  process.exitCode = 1;
});
