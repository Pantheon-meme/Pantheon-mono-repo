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

Use this for flexible object atlases such as plants, tools, resources, pickups, or world props. Each state is one row. Columns are frames in that row, so the same command can make growth stages, idle loops, transition frames, or simple variants.

The workflow automatically writes and sends the image model a checkerboard layout guide matching your requested rows and columns. The guide uses equal square cells and center marks so the model has a visible composition template instead of only text instructions. The raw generated sprite sheet is prompted to keep that checkerboard visible for verification; the game publisher can strip the neutral grid/background for runtime use. You can also provide either a detailed text style guide, a style reference image, or one cropped tile from an existing atlas. The game autotile atlases use `256` pixel cells, so `--style-reference-cell 1,1,256` uses the center-ish grass tile from a 7x7 atlas as inspiration.

```sh
pnpm --filter @pantheon/assets generate-object-sprites -- \
  --object-id "sungrain" \
  --object-name "Sungrain" \
  --object "a warm golden grain plant grown from a tiny amber seed, with sunlit wheat heads and soft green leaves; readable as a small top-down farming game crop" \
  --style "cozy hand-painted 2D game sprite, three-quarter top-down view, crisp readable silhouette, soft natural edges, warm highlights, no outlines heavier than the terrain art, transparent background" \
  --style-reference "apps/game/src/assets/autotiles/vibrant-grass/autotile-blob-7x7.png" \
  --style-reference-cell "1,1,256" \
  --state "seed:Seed:small amber seed or first tiny sprout, low to the soil" \
  --state "growing:Growing:young green shoots with a few forming golden blades" \
  --state "grown:Grown:full harvest-ready golden grain heads, healthiest and tallest row" \
  --state "harvested:Harvested:short cut stalks or bundled remnant after harvest" \
  --columns 4 \
  --column-labels "idle 1,idle 2,transition 1,transition 2" \
  --cell-size 128 \
  --out "generated/object-sprites/sungrain"
```

```sh
pnpm --filter @pantheon/assets generate-object-sprites -- \
  --object-id "moonroot" \
  --object-name "Moonroot" \
  --object "a cool pale-blue root crop with moonlit leaves, silver-white bulb/root forms, and gentle nocturnal glow; readable as a small top-down farming game crop" \
  --style "cozy hand-painted 2D game sprite, three-quarter top-down view, crisp readable silhouette, soft natural edges, cool blue highlights, subtle magical sheen, transparent background" \
  --style-reference "apps/game/src/assets/autotiles/vibrant-grass/autotile-blob-7x7.png" \
  --style-reference-cell "1,1,256" \
  --state "seed:Seed:pale blue seed or tiny moonlit sprout close to the soil" \
  --state "growing:Growing:young teal leaves with the root just beginning to show" \
  --state "grown:Grown:full harvest-ready pale moon root with broad cool-toned leaves" \
  --state "harvested:Harvested:dug-up remnant, cut leaves, or small gathered root bundle" \
  --columns 4 \
  --column-labels "idle 1,idle 2,transition 1,transition 2" \
  --cell-size 128 \
  --out "generated/object-sprites/moonroot"
```

The command writes:

- `object-sprite-layout-guide.png` with the raw checkerboard grid sent to the image generator.
- `object-sprite-manifest.json` with the atlas dimensions, row/column labels, prompts, model id, and per-cell coordinates.
- A generated sprite sheet PNG decoded from the OpenRouter image response.

Publish generated object sprites into the game after reviewing the image:

```sh
pnpm publish:object-sprites
```

This copies every generated object sprite sheet into `apps/game/src/assets/object-sprites` and regenerates `ObjectSpriteAssets.ts`, which the game uses to preload and crop sprite frames.

## Publish Game Assets

Generated assets stay ignored under `packages/assets/generated`. To update the checked-in copies consumed by the game, publish the required autotile atlases after generation:

```sh
pnpm publish:game-assets
```

This copies the current `dirt`, `vibrant-grass`, and `water` `autotile-blob-7x7.png` files into `apps/game/src/assets/autotiles`.
