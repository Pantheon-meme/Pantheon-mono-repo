import Phaser from "phaser";
import type { Hex } from "viem";
import type { System } from "../../../ecs/System";
import type { Entity, World } from "../../../ecs/World";
import { playableCharacters } from "../../player/PlayableCharacters";
import { FacingDirection } from "../../player/components/FacingDirection";
import { PlayerAvatar } from "../../player/components/PlayerAvatar";
import {
  getPlayerSpriteAsset,
  playerSpriteTextureKey,
} from "../../player/PlayerSpriteAssets";
import { Position } from "../../shared/components/Position";
import { Renderable } from "../../shared/components/Renderable";
import { Velocity } from "../../shared/components/Velocity";
import { TerrainGrid } from "../../terrain/components/TerrainGrid";
import { getMudActionDurationSeconds } from "../ActionDurations";
import { MudWorld } from "../components/MudWorld";
import { OnchainPresentation } from "../components/OnchainPresentation";
import { RemotePlayer } from "../components/RemotePlayer";
import { MudWorldBridge } from "../MudWorldBridge";
import type { PlayerPresenceSnapshot } from "../MudWorldTypes";

type RemotePlayerGameObject = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform &
  Partial<Phaser.GameObjects.Components.Visible>;

type RemotePlayerSource = {
  readonly label: string;
  readonly spriteId: string;
  readonly address: Hex;
  readonly bridge: MudWorldBridge;
  entity?: Entity;
  targetTileX?: number;
  targetTileY?: number;
  moveSpeedPixelsPerSecond?: number;
  lastPresentedActionAt: number;
  lastPresentedPendingActionReadyAt: number;
};

const moveSpeedScale = 1000;
const fallbackMoveTilesPerSecond = 2.5;
const snapDistancePixels = 2;

export class MudRemotePlayerHydrationSystem implements System {
  private requested = false;
  private pollInSeconds = 0;
  private retryInSeconds = 0;
  private readonly sources: RemotePlayerSource[];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly pollIntervalSeconds = 1,
  ) {
    const seenAddresses = new Set<string>();

    this.sources = playableCharacters.flatMap((character) => {
      const bridge = MudWorldBridge.fromPrivateKey(character.privateKey);
      const normalizedAddress = normalizeAddress(bridge.accountAddress);

      if (seenAddresses.has(normalizedAddress)) {
        return [];
      }

      seenAddresses.add(normalizedAddress);

      return [
        {
          label: character.name,
          spriteId: character.spriteId,
          address: bridge.accountAddress,
          bridge,
          lastPresentedActionAt: 0,
          lastPresentedPendingActionReadyAt: 0,
        },
      ];
    });
  }

  update(world: World, deltaSeconds: number): void {
    const grid = world.query(TerrainGrid)[0]?.[1];

    if (grid) {
      this.updateRemoteMovement(world, grid, deltaSeconds);
    }

    if (this.requested) {
      return;
    }

    this.retryInSeconds = Math.max(0, this.retryInSeconds - deltaSeconds);
    this.pollInSeconds = Math.max(0, this.pollInSeconds - deltaSeconds);

    if (this.retryInSeconds > 0 || this.pollInSeconds > 0) {
      return;
    }

    const mud = world.query(MudWorld)[0]?.[1];

    if (!mud || !grid) {
      return;
    }

    const activeAddress = normalizeAddress(mud.bridge.accountAddress);
    const remoteSources = this.sources.filter(
      (source) => normalizeAddress(source.address) !== activeAddress,
    );

    if (remoteSources.length === 0) {
      this.pollInSeconds = this.pollIntervalSeconds;
      return;
    }

    this.requested = true;

    void Promise.all(
      remoteSources.map(async (source) => ({
        source,
        snapshot: await source.bridge
          .readPlayerPresence()
          .catch(() => undefined),
      })),
    )
      .then((results) => {
        for (const { source, snapshot } of results) {
          if (!snapshot) {
            this.hideRemotePlayer(world, source);
            continue;
          }

          this.applyRemotePresence(world, grid, source, snapshot);
        }

        this.retryInSeconds = 0;
        this.pollInSeconds = this.pollIntervalSeconds;
      })
      .catch(() => {
        this.retryInSeconds = 2;
      })
      .finally(() => {
        this.requested = false;
      });
  }

  private updateRemoteMovement(
    world: World,
    grid: TerrainGrid,
    deltaSeconds: number,
  ): void {
    for (const source of this.sources) {
      if (
        source.entity === undefined ||
        source.targetTileX === undefined ||
        source.targetTileY === undefined
      ) {
        continue;
      }

      const position = world.getComponent(source.entity, Position);
      const velocity = world.getComponent(source.entity, Velocity);

      if (!position || !velocity) {
        continue;
      }

      const targetX = tileCenter(source.targetTileX, grid.tileSize);
      const targetY = tileCenter(source.targetTileY, grid.tileSize);
      const dx = targetX - position.x;
      const dy = targetY - position.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= snapDistancePixels) {
        position.x = targetX;
        position.y = targetY;
        velocity.x = 0;
        velocity.y = 0;
        continue;
      }

      const speed =
        source.moveSpeedPixelsPerSecond ??
        grid.tileSize * fallbackMoveTilesPerSecond;
      const step = Math.min(distance, speed * deltaSeconds);

      velocity.x = (dx / distance) * speed;
      velocity.y = (dy / distance) * speed;
      position.x += (dx / distance) * step;
      position.y += (dy / distance) * step;

      const facing = world.getComponent(source.entity, FacingDirection);

      if (facing) {
        updateFacing(facing, dx, dy);
      }
    }
  }

  private applyRemotePresence(
    world: World,
    grid: TerrainGrid,
    source: RemotePlayerSource,
    snapshot: PlayerPresenceSnapshot,
  ): void {
    const entity = this.ensureRemotePlayerEntity(world, grid, source, snapshot);
    const sprite = world.getComponent(entity, Renderable)?.sprite as
      | RemotePlayerGameObject
      | undefined;

    sprite?.setVisible?.(true);

    source.moveSpeedPixelsPerSecond =
      grid.tileSize *
      Math.max(
        0.1,
        snapshot.moveSpeed / moveSpeedScale || fallbackMoveTilesPerSecond,
      );

    const previousTargetTileX = source.targetTileX;
    const previousTargetTileY = source.targetTileY;

    source.targetTileX = snapshot.x;
    source.targetTileY = snapshot.y;

    const facing = world.getComponent(entity, FacingDirection);

    if (
      facing &&
      previousTargetTileX !== undefined &&
      previousTargetTileY !== undefined &&
      (previousTargetTileX !== snapshot.x || previousTargetTileY !== snapshot.y)
    ) {
      updateFacing(
        facing,
        snapshot.x - previousTargetTileX,
        snapshot.y - previousTargetTileY,
      );
    }

    this.applyOnchainPresentation(world, entity, source, snapshot);
  }

  private ensureRemotePlayerEntity(
    world: World,
    grid: TerrainGrid,
    source: RemotePlayerSource,
    snapshot: PlayerPresenceSnapshot,
  ): Entity {
    if (source.entity !== undefined) {
      return source.entity;
    }

    const entity = world.createEntity();
    const x = tileCenter(snapshot.x, grid.tileSize);
    const y = tileCenter(snapshot.y, grid.tileSize);
    const sprite = createRemotePlayerSprite(this.scene, x, y, source.spriteId);

    source.entity = entity;
    source.targetTileX = snapshot.x;
    source.targetTileY = snapshot.y;

    world.addComponent(
      entity,
      RemotePlayer,
      new RemotePlayer(source.address, source.label),
    );
    world.addComponent(entity, PlayerAvatar, new PlayerAvatar(source.spriteId));
    world.addComponent(entity, FacingDirection, new FacingDirection(0, 1));
    world.addComponent(entity, Position, new Position(x, y));
    world.addComponent(
      entity,
      Velocity,
      new Velocity(0, 0, grid.tileSize * fallbackMoveTilesPerSecond),
    );
    world.addComponent(entity, OnchainPresentation, new OnchainPresentation());
    world.addComponent(entity, Renderable, new Renderable(sprite));

    return entity;
  }

  private hideRemotePlayer(world: World, source: RemotePlayerSource): void {
    if (source.entity === undefined) {
      return;
    }

    const sprite = world.getComponent(source.entity, Renderable)?.sprite as
      | RemotePlayerGameObject
      | undefined;

    sprite?.setVisible?.(false);
  }

  private applyOnchainPresentation(
    world: World,
    entity: Entity,
    source: RemotePlayerSource,
    snapshot: PlayerPresenceSnapshot,
  ): void {
    const presentation = world.getComponent(entity, OnchainPresentation);

    if (!presentation) {
      return;
    }

    if (snapshot.pendingAction) {
      const pose =
        snapshot.pendingAction.action === "sleep" ? "sleep" : "action";
      const remainingSeconds =
        snapshot.pendingAction.readyAt - Date.now() / 1000;

      if (remainingSeconds <= 0) {
        presentation.clear();
        return;
      }

      if (
        snapshot.pendingAction.readyAt !==
          source.lastPresentedPendingActionReadyAt ||
        presentation.pose !== pose
      ) {
        source.lastPresentedPendingActionReadyAt = snapshot.pendingAction.readyAt;
        presentation.start(pose, remainingSeconds);
      }

      return;
    }

    if (source.lastPresentedPendingActionReadyAt !== 0) {
      source.lastPresentedPendingActionReadyAt = 0;
      presentation.clear();
    }

    const action = snapshot.actionLog?.action;
    const updatedAt = snapshot.actionLog?.updatedAt ?? 0;

    if (!action || updatedAt <= source.lastPresentedActionAt) {
      return;
    }

    source.lastPresentedActionAt = updatedAt;

    const pose = presentationPoseForAction(action);

    if (!pose) {
      return;
    }

    const durationSeconds = getMudActionDurationSeconds(action);
    const remainingSeconds =
      durationSeconds - Math.max(0, Date.now() / 1000 - updatedAt);

    if (remainingSeconds <= 0) {
      return;
    }

    presentation.clear();
    presentation.start(pose, remainingSeconds);
  }
}

function createRemotePlayerSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  spriteId: string,
): RemotePlayerGameObject {
  const spriteAsset = getPlayerSpriteAsset(spriteId);

  if (spriteAsset) {
    return scene.add
      .sprite(x, y, playerSpriteTextureKey(spriteId))
      .setOrigin(0.5, 1)
      .setDepth(10)
      .setAlpha(0.9)
      .setDisplaySize(
        spriteAsset.manifest.cellSize,
        spriteAsset.manifest.cellSize,
      );
  }

  return scene.add
    .circle(x, y, 34, 0xd6a7ff, 0.9)
    .setDepth(10)
    .setStrokeStyle(5, 0x24133c, 0.95);
}

function presentationPoseForAction(
  action: string,
): "action" | "sleep" | undefined {
  if (action === "sleep") {
    return "sleep";
  }

  if (
    action === "forage" ||
    action === "dig" ||
    action === "plant" ||
    action === "harvest" ||
    action === "water" ||
    action === "tend"
  ) {
    return "action";
  }

  return undefined;
}

function updateFacing(
  facing: FacingDirection,
  directionX: number,
  directionY: number,
): void {
  if (Math.abs(directionX) > Math.abs(directionY)) {
    facing.x = Math.sign(directionX);
    facing.y = 0;
    return;
  }

  if (directionY !== 0) {
    facing.x = 0;
    facing.y = Math.sign(directionY);
  }
}

function tileCenter(tile: number, tileSize: number): number {
  return tile * tileSize + tileSize / 2;
}

function normalizeAddress(address: Hex): string {
  return address.toLowerCase();
}
