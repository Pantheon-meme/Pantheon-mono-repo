import Phaser from "phaser";
import { World } from "../ecs/World";
import { Footprint } from "../game/shared/components/Footprint";
import { InputState } from "../game/player/components/InputState";
import { PlayerControlled } from "../game/player/components/PlayerControlled";
import { Position } from "../game/shared/components/Position";
import { Renderable } from "../game/shared/components/Renderable";
import { Velocity } from "../game/shared/components/Velocity";
import { WeightInspectable } from "../game/shared/components/WeightInspectable";
import { WeightedObject } from "../game/shared/components/WeightedObject";
import { BoundsSystem } from "../game/shared/systems/BoundsSystem";
import { InputSystem } from "../game/player/systems/InputSystem";
import { MovementSystem } from "../game/player/systems/MovementSystem";
import { RenderSystem } from "../game/shared/systems/RenderSystem";
import { WeightDisplaySystem } from "../game/ui/systems/WeightDisplaySystem";

export class WorldScene extends Phaser.Scene {
  private world?: World;

  constructor() {
    super("world");
  }

  create(): void {
    const world = new World();
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    const cursors = keyboard.createCursorKeys();
    const wasd = keyboard.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;

    this.createArena();
    this.createStones(world);
    this.createPlayer(world);
    const weightLabel = this.createWeightLabel();

    world.addSystem(new InputSystem(cursors, wasd));
    world.addSystem(new MovementSystem());
    world.addSystem(
      new BoundsSystem(
        new Phaser.Geom.Rectangle(
          24,
          24,
          this.scale.width - 48,
          this.scale.height - 48,
        ),
      ),
    );
    world.addSystem(new WeightDisplaySystem(weightLabel));
    world.addSystem(new RenderSystem());

    this.world = world;
  }

  update(_time: number, delta: number): void {
    this.world?.update(delta / 1000);
  }

  private createArena(): void {
    this.add.rectangle(480, 270, 960, 540, 0x121821);
    this.add.grid(480, 270, 960, 540, 48, 48, 0x000000, 0, 0x273241, 0.6);
    this.add.rectangle(480, 270, 912, 492).setStrokeStyle(2, 0x5b6f89, 0.85);

    this.add
      .text(24, 18, "Pantheon", {
        color: "#eef2f6",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "18px",
      })
      .setAlpha(0.9);
  }

  private createStones(world: World): void {
    this.createStone(world, "River stone", 18, 260, 180, 54, 38, 0x6c7a89);
    this.createStone(world, "Granite stone", 45, 700, 170, 76, 48, 0x88929b);
    this.createStone(world, "Obsidian stone", 82, 580, 380, 92, 58, 0x2f3944);
  }

  private createStone(
    world: World,
    name: string,
    weight: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
  ): void {
    const stone = world.createEntity();
    const stoneSprite = this.add.rectangle(x, y, width, height, color);

    stoneSprite.setStrokeStyle(2, 0xd7dee8, 0.45);

    world.addComponent(stone, Position, new Position(x, y));
    world.addComponent(stone, Footprint, new Footprint(width, height));
    world.addComponent(stone, WeightInspectable, new WeightInspectable(name));
    world.addComponent(stone, WeightedObject, new WeightedObject(weight));
    world.addComponent(stone, Renderable, new Renderable(stoneSprite));
  }

  private createPlayer(world: World): void {
    const player = world.createEntity();
    const playerSprite = this.add.rectangle(480, 270, 28, 28, 0xe4b44c);

    playerSprite.setStrokeStyle(2, 0xffefd1, 0.95);
    playerSprite.setDepth(1);

    world.addComponent(player, PlayerControlled, new PlayerControlled());
    world.addComponent(player, InputState, new InputState());
    world.addComponent(player, Position, new Position(480, 270));
    world.addComponent(player, Velocity, new Velocity());
    world.addComponent(player, Renderable, new Renderable(playerSprite));
  }

  private createWeightLabel(): Phaser.GameObjects.Text {
    return this.add
      .text(24, 492, "Stand on a stone to read its weight", {
        backgroundColor: "#1f2935",
        color: "#eef2f6",
        fixedWidth: 320,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "16px",
        padding: { x: 12, y: 8 },
      })
      .setDepth(2);
  }
}
