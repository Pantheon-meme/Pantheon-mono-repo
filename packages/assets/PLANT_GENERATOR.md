# Plant Generator

The plant generator is a shortcut on top of the generic object sprite-sheet workflow. It creates a structured sheet that the game knows how to interpret as seeds, planted growth, mature variants, harvested remnants, and harvested item pickups.

## Generate

Use the plant shortcut when the default grain-like setup is enough:

```sh
pnpm --filter @pantheon/assets generate-object-sprites -- \
  --plant-id "sungrain" \
  --plant-name "Sungrain" \
  --plant "a warm golden grain plant grown from a tiny amber seed, with sunlit wheat heads and soft green leaves"
```

That expands into a 4 row by 4 column sheet under `packages/assets/generated/object-sprites/<plant-id>`.

## Layout

Rows are states. Columns are frames or variants inside that state.

| Row | State | Runtime meaning |
| --- | --- | --- |
| 0 | `seed` | Column 0 is the isolated seed pickup. Columns 1-3 are planted seed growth steps. |
| 1 | `growing` | Columns 0-3 are gradual growth steps. |
| 2 | `grown` | Columns 0-3 are stable mature variants. The game picks a stable variant per plant. |
| 3 | `harvested` | Columns 0-1 are in-ground cut remnants. Columns 2-3 are harvested resource pickups. |

The generator writes `object-sprite-layout-guide.png` beside the generated sheet and sends that image to the image model. The guide is a clean checkerboard of alternating white and gray square cells. It intentionally has no borders, labels, dots, or center marks, because extra markings tend to leak into the generated art.

The raw generated sheet should keep the checkerboard visible. That makes it easy to verify alignment before publishing.

## Style

The shortcut uses the vibrant grass autotile as a style reference:

```txt
apps/game/src/assets/autotiles/vibrant-grass/autotile-blob-7x7.png
```

with `--style-reference-cell 1,1,256`.

You can override the style, states, columns, cell size, output path, and model with the generic `--object-*` options when a plant needs a different sheet contract.

## Publish

After reviewing the generated sheet, publish all generated object sprites into the game:

```sh
pnpm publish:object-sprites
```

Publishing:

- reads generated manifests under `packages/assets/generated/object-sprites`
- removes the neutral checkerboard/background with PhotoRoom
- writes PNG sheets under `apps/game/src/assets/object-sprites/<id>`
- regenerates `apps/game/src/assets/object-sprites/ObjectSpriteAssets.ts`

`PHOTOROOM_API_KEY` must be available in `.env` or the shell.

## Game Usage

The game preloads every published object sprite sheet from `ObjectSpriteAssets.ts`.

Plant runtime mapping lives in `apps/game/src/game/plants/PlantSpriteAssets.ts` and `apps/game/src/game/plants/systems/PlantRenderSystem.ts`.

- Planted sprites are rendered with a bottom origin, so taller growth expands upward from the ground point.
- Seed drops use `seed` column 0.
- Growing plants use `seed` columns 1-3 and `growing` columns 0-3.
- Mature plants use a stable random `grown` variant.
- Harvested ground remnants use the first half of the `harvested` row.
- Harvested item pickups use the second half of the `harvested` row.

## Player Shortcut

The player generator uses the same workflow and publisher, but with a compact movement grid instead of plant rows:

```sh
pnpm --filter @pantheon/assets generate-object-sprites -- \
  --player-id "player" \
  --player-name "Player" \
  --player "a wandering farmer with a simple tunic, boots, small pack, and practical field tools"
```

Default player sheets are generated as one square `4 x 4` atlas.

Columns:

| Column | Meaning |
| --- | --- |
| 0 | Facing down/camera |
| 1 | Facing side/right |
| 2 | Facing up/away |
| 3 | Generic action/interact pose |

Rows:

| Row | State | Runtime meaning |
| --- | --- | --- |
| 0 | `idle_1` | First idle transition for each direction; action cell is reusable down action. |
| 1 | `idle_2` | Second idle transition for each direction; action cell is reusable side action. |
| 2 | `move_1` | First walking contact pose for each direction; action cell is reusable up action. |
| 3 | `move_2` | Opposite walking contact pose for each direction; action cell is side sleeping/resting. |

After publishing a sheet with id `player`, the game automatically uses it for the controlled player. If no `player` sheet is published, the old circle placeholder remains as a fallback.
