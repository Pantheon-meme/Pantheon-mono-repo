# Pantheon Game

Phaser 3 + TypeScript client for the playable side of Pantheon.

## Run

```sh
pnpm --filter @pantheon/game dev
```

The game uses checked-in runtime assets from `src/assets`, so new devs do not need to run the asset generator before starting the client.

## Refresh Assets

After regenerating autotiles in `packages/assets/generated`, publish the atlases used by the game:

```sh
pnpm publish:game-assets
```

## Controls

- Arrow keys or WASD move the single player.

## Structure

- `src/ecs`: small ECS world, entity, component store, and system contracts.
- `src/game/components`: data-only components.
- `src/game/systems`: input, movement, bounds, and render systems.
- `src/scenes`: Phaser scenes that compose ECS entities and systems.
