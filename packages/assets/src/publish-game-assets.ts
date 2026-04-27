import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const gameAutotileAtlases = ["dirt", "vibrant-grass", "water"] as const;
const atlasFileName = "autotile-blob-7x7.png";

const currentFilePath = fileURLToPath(import.meta.url);
const packageRoot = path.resolve(path.dirname(currentFilePath), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const generatedAutotileRoot = path.join(packageRoot, "generated/autotiles");
const gameAutotileRoot = path.join(repoRoot, "apps/game/src/assets/autotiles");

async function publishGameAssets(): Promise<void> {
  const copiedAssets: string[] = [];

  for (const atlasName of gameAutotileAtlases) {
    const sourcePath = path.join(generatedAutotileRoot, atlasName, atlasFileName);
    const destinationPath = path.join(gameAutotileRoot, atlasName, atlasFileName);

    await assertFileExists(sourcePath);
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.copyFile(sourcePath, destinationPath);
    copiedAssets.push(path.relative(repoRoot, destinationPath));
  }

  console.log(`Published ${copiedAssets.length} game asset(s):`);
  for (const copiedAsset of copiedAssets) {
    console.log(`- ${copiedAsset}`);
  }
}

async function assertFileExists(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.isFile()) {
      return;
    }
  } catch {
    // The error below includes the expected generator output location.
  }

  throw new Error(
    `Missing generated asset: ${path.relative(repoRoot, filePath)}. Run the asset generator before publishing game assets.`,
  );
}

publishGameAssets().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[publish-game-assets] ${message}`);
  process.exitCode = 1;
});
