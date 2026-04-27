# Tree Generator

The tree generator uses the object sprite workflow with tree-specific defaults. It creates the same runtime row contract as crops, but tuned for taller rooted sprites: seed, growing, grown, and harvested/resource rows.

Generate one tree:

```bash
pnpm --filter @pantheon/assets generate-object-sprites -- \
  --tree-id "applewood" \
  --tree-name "Applewood" \
  --tree "round orchard tree with red apples and fresh green leaves"
```

Generate the curated set of 10 trees:

```bash
pnpm --filter @pantheon/assets generate-tree-sprites
```

Generate a single curated tree:

```bash
pnpm --filter @pantheon/assets generate-tree-sprites -- --tree-id starblossom
```

The curated set is defined in `src/tree-sprite-definitions.ts`:

| Tier            | Tree                                          |
| --------------- | --------------------------------------------- |
| Basic           | Applewood, Pinecrest, Mapleflare, Willowshade |
| Sturdy/resource | Ironbark, Honeyfig                            |
| Magical         | Frostpine, Emberoak, Moonwillow, Starblossom  |

Tree sprite sheets default to 4 rows by 4 columns with 256px cells. Mature tree prompts are composed for large runtime visuals: one logical interaction tile, but a grown tree image that reads around two terrain tiles tall. Publish them into the game the same way as crops:

```bash
pnpm publish:object-sprites
```
