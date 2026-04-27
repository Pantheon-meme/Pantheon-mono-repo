# @pantheon/assets

Mastra workflow package for generating first-pass Pantheon world assets with OpenRouter.

It can generate:

- Structured world text assets with one OpenRouter text model.
- Image assets with a separate OpenRouter image-capable model.
- A local manifest plus image files under an output directory.

## Setup

Add your OpenRouter key to `.env` or export it in your shell:

```sh
OPENROUTER_API_KEY=...
```

Optional defaults:

```sh
OPENROUTER_TEXT_MODEL=openai/gpt-4o-mini
OPENROUTER_IMAGE_MODEL=google/gemini-2.5-flash-image
OPENROUTER_SITE_URL=http://localhost
OPENROUTER_APP_NAME=Pantheon
PHOTOROOM_API_KEY=...
```

## Run

World asset smoke test:

```sh
pnpm --filter @pantheon/assets generate -- \
  --world "A volcanic forge realm ruled by a solar smith deity" \
  --text-model "openai/gpt-4o-mini" \
  --image-model "google/gemini-2.5-flash-image" \
  --out "generated/world-assets"
```

The command writes:

- `manifest.json` with the generated text assets, prompts, model ids, and image file paths.
- Image files decoded from OpenRouter data URLs when the image model returns them.

Use OpenRouter models with image output modalities for `--image-model`.

## Generate 47 Dual-Grid Autotiles From Masks

Provide a texture reference image. The workflow uses the PNG masks in `packages/assets/masks`, sends the texture plus one mask to the OpenRouter image model for each request, and generates the full 47-tile set as mask sheets.

```sh
pnpm --filter @pantheon/assets generate-autotiles -- \
  --texture "/absolute/path/to/grass-texture.png" \
  --material "leafy grass with small purple flowers" \
  --image-model "openai/gpt-5.4-image-2" \
  --reasoning-effort high \
  --concurrency 4 \
  --out "generated/autotiles/grass"
```

The command writes:

- `autotile-manifest.json` with the prompt, mask path, model id, and output image path for each generated sheet.
- Generated mask-sheet images corresponding to:
  - `Land Grid Map_Left Top.png`
  - `Land Grid Map_Right Top A.png`
  - `Land Grid Map_Right Top B.png`
  - `Land Grid Map_Left Bottom.png`
  - `Land Grid Map_Right Bottom.png`

The prompt for each mask asks the image model to replace the red mask regions with the provided texture, preserve the macro silhouette, and make only small texture-aware edge deviations so the border blends naturally.

To test one mask without regenerating every sheet:

```sh
pnpm --filter @pantheon/assets generate-autotiles -- \
  --texture "/absolute/path/to/grass-texture.png" \
  --material "leafy grass with small purple flowers" \
  --image-model "openai/gpt-5.4-image-2" \
  --reasoning-effort high \
  --mask left-bottom \
  --concurrency 1 \
  --out "generated/autotiles/grass-left-bottom-test"
```

Valid mask IDs are `left-top`, `right-top-a`, `right-top-b`, `left-bottom`, and `right-bottom`.

Environment defaults:

```sh
PANTHEON_AUTOTILE_MATERIAL="leafy grass"
PANTHEON_AUTOTILE_MASK_DIR=masks
PANTHEON_AUTOTILE_CONCURRENCY=4
OPENROUTER_REASONING_EFFORT=high
```

## Generate Object Sprite Sheets

Use this for flexible object atlases such as plants, trees, tools, resources, pickups, or world props. Each state is one row. For plants and trees, seed column 1 is the isolated seed pickup, seed columns 2-4 and growing columns are gradual growth steps, grown columns are stable harvest-ready variants, and the harvested row is split between rooted remnants and resource pickups.

The workflow automatically writes and sends the image model a checkerboard layout guide matching your requested rows and columns. The guide uses only alternating white and gray square cells, with no borders, labels, dots, or center marks, so the model has a visible composition template instead of only text instructions. The raw generated sprite sheet is prompted to keep that checkerboard visible for verification; the game publisher can strip the neutral grid/background for runtime use. You can also provide either a detailed text style guide, a style reference image, or one cropped tile from an existing atlas. The game autotile atlases use `256` pixel cells, so `--style-reference-cell 1,1,256` uses the center-ish grass tile from a 7x7 atlas as inspiration.

For plants, use the shortcut form when the current defaults are enough:

```sh
pnpm --filter @pantheon/assets generate-object-sprites -- \
  --plant-id "sungrain" \
  --plant-name "Sungrain" \
  --plant "a warm golden grain plant grown from a tiny amber seed, with sunlit wheat heads and soft green leaves"
```

That expands to the current plant grid, state rows, column labels, style guide, vibrant-grass style reference tile, cell size, and `generated/object-sprites/<plant-id>` output path. Use the full object form below when you need to override individual rows or style.

For trees, use the tree shortcut or the curated batch generator:

```sh
pnpm --filter @pantheon/assets generate-object-sprites -- \
  --tree-id "applewood" \
  --tree-name "Applewood" \
  --tree "round orchard tree with red apples and fresh green leaves"

pnpm --filter @pantheon/assets generate-tree-sprites
```

Tree sheets use the same row contract as plants, but default to taller 192px rooted cells and tree-specific prompts for saplings, mature variants, and harvested fruit/cone/branch/resource pickups.

```sh
pnpm --filter @pantheon/assets generate-object-sprites -- \
  --object-id "sungrain" \
  --object-name "Sungrain" \
  --object "a warm golden grain plant grown from a tiny amber seed, with sunlit wheat heads and soft green leaves; readable as a small top-down farming game crop" \
  --style "cozy hand-painted 2D game sprite, three-quarter top-down view, crisp readable silhouette, soft natural edges, warm highlights, no outlines heavier than the terrain art, transparent background" \
  --style-reference "apps/game/src/assets/autotiles/vibrant-grass/autotile-blob-7x7.png" \
  --style-reference-cell "1,1,256" \
  --state "seed:Seed:column 1 is an isolated collectible amber Sungrain seed pickup with no soil; columns 2-4 are planted early growth steps from seed in soil to tiny sprout" \
  --state "growing:Growing:four gradual growth steps from young green shoots to almost mature golden blades" \
  --state "grown:Grown:four different stable harvest-ready variants with full golden grain heads" \
  --state "harvested:Harvested:columns 1-2 are short cut stalk remnants left in the ground; columns 3-4 are isolated harvested Sungrain crop resource pickups, small bundles of golden grain heads" \
  --columns 4 \
  --column-labels "step 1,step 2,step 3,step 4" \
  --cell-size 128 \
  --out "generated/object-sprites/sungrain"
```

The command writes:

- `object-sprite-layout-guide.png` with the raw checkerboard grid sent to the image generator.
- `object-sprite-manifest.json` with the atlas dimensions, row/column labels, prompts, model id, and per-cell coordinates.
- A generated sprite sheet PNG decoded from the OpenRouter image response.

Player character sheets use the same command and publishing flow. Use the `--player` shortcut to generate the default movement grid:

```sh
pnpm --filter @pantheon/assets generate-object-sprites -- \
  --player-id "player" \
  --player-name "Player" \
  --player "a wandering farmer with a simple tunic, boots, small pack, and practical field tools"
```

The default player sheet is one square `4 x 4` atlas. Rows are `idle_1`, `idle_2`, `move_1`, and `move_2`; columns are `down`, `side`, `up`, and `action`. The first three columns drive normal movement. The action column contains generic reusable action/interact poses for down, side, and up, plus a side sleeping/resting pose. Side-facing cells face right and the game mirrors them for left movement.

More detail: [Plant Generator](./PLANT_GENERATOR.md) and [Tree Generator](./TREE_GENERATOR.md).

Publish generated object sprites into the game after reviewing the image:

```sh
pnpm publish:object-sprites
```

This sends every generated object sprite sheet through PhotoRoom background removal, copies the result into `apps/game/src/assets/object-sprites`, and regenerates `ObjectSpriteAssets.ts`, which the game uses to preload and crop sprite frames. Publishing requires `PHOTOROOM_API_KEY`.

## Publish Game Assets

Generated assets stay ignored under `packages/assets/generated`. To update the checked-in copies consumed by the game, publish the required autotile atlases after generation:

```sh
pnpm publish:game-assets
```

This copies the current `dirt`, `vibrant-grass`, and `water` `autotile-blob-7x7.png` files into `apps/game/src/assets/autotiles`.
