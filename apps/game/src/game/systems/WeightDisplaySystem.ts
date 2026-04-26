import type Phaser from "phaser";
import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { Footprint } from "../components/Footprint";
import { PlayerControlled } from "../components/PlayerControlled";
import { Position } from "../components/Position";
import { WeightInspectable } from "../components/WeightInspectable";
import { WeightedObject } from "../components/WeightedObject";

export class WeightDisplaySystem implements System {
  constructor(private readonly label: Phaser.GameObjects.Text) {}

  update(world: World): void {
    const player = world.query(PlayerControlled, Position)[0];

    if (!player) {
      this.label.setText("");
      return;
    }

    const [, , playerPosition] = player;
    const weightedObject = world
      .query(Position, WeightedObject, Footprint, WeightInspectable)
      .find(([, objectPosition, , footprint]) =>
        this.contains(objectPosition, footprint, playerPosition),
      );

    if (!weightedObject) {
      this.label.setText("Stand on a stone to read its weight");
      return;
    }

    const [, , weight, , inspectable] = weightedObject;
    this.label.setText(`${inspectable.label}: ${weight.weight} kg`);
  }

  private contains(
    objectPosition: Position,
    footprint: Footprint,
    playerPosition: Position,
  ): boolean {
    const halfWidth = footprint.width / 2;
    const halfHeight = footprint.height / 2;

    return (
      playerPosition.x >= objectPosition.x - halfWidth &&
      playerPosition.x <= objectPosition.x + halfWidth &&
      playerPosition.y >= objectPosition.y - halfHeight &&
      playerPosition.y <= objectPosition.y + halfHeight
    );
  }
}
