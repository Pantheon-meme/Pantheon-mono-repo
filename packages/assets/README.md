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

## Generate 47 Dual-Grid Autotile Segments

Provide a square texture reference image. The workflow asks a text model for a compact style plan, then generates the 10 required segment sheets in parallel with the reference image attached to every image request.

```sh
pnpm --filter @pantheon/assets generate-autotiles -- \
  --texture "/absolute/path/to/grass-texture.png" \
  --material "leafy grass with small purple flowers" \
  --tile-size 128 \
  --concurrency 10 \
  --out "generated/autotiles/grass"
```

The command writes:

- `autotile-manifest.json` with the text-model style plan, all prompts, tile counts, grid layouts, and image file paths.
- 10 segment images containing 47 total tiles:
  - Segment 1: 9 basic outer edge/center tiles.
  - Segments 2-6: 15 inner-corner cutout variants.
  - Segments 7-8: 16 mixed outer edge/corner plus inner cutout variants.
  - Segment 9: 6 strip and single-connection tiles.
  - Segment 10: 1 isolated island tile.

Environment defaults:

```sh
PANTHEON_AUTOTILE_MATERIAL="leafy grass"
PANTHEON_AUTOTILE_TILE_SIZE=128
PANTHEON_AUTOTILE_CONCURRENCY=10
```
