import Phaser from "phaser";
import { World } from "../ecs/World";
import { InputState } from "../game/components/InputState";
import { PlayerControlled } from "../game/components/PlayerControlled";
import { Position } from "../game/components/Position";
import { Renderable } from "../game/components/Renderable";
import { Velocity } from "../game/components/Velocity";
import { BoundsSystem } from "../game/systems/BoundsSystem";
import { InputSystem } from "../game/systems/InputSystem";
import { MovementSystem } from "../game/systems/MovementSystem";
import { RenderSystem } from "../game/systems/RenderSystem";

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
    this.createPlayer(world);

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

  private createPlayer(world: World): void {
    const player = world.createEntity();
    const playerSprite = this.add.rectangle(480, 270, 28, 28, 0xe4b44c);

    playerSprite.setStrokeStyle(2, 0xffefd1, 0.95);

    world.addComponent(player, PlayerControlled, new PlayerControlled());
    world.addComponent(player, InputState, new InputState());
    world.addComponent(player, Position, new Position(480, 270));
    world.addComponent(player, Velocity, new Velocity());
    world.addComponent(player, Renderable, new Renderable(playerSprite));
  }
}
