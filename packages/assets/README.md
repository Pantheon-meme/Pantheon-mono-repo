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

## Publish Game Assets

Generated assets stay ignored under `packages/assets/generated`. To update the checked-in copies consumed by the game, publish the required autotile atlases after generation:

```sh
pnpm publish:game-assets
```

This copies the current `dirt`, `vibrant-grass`, and `water` `autotile-blob-7x7.png` files into `apps/game/src/assets/autotiles`.
