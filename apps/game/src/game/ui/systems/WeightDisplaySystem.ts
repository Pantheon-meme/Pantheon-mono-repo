import type Phaser from "phaser";
import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { FocusTarget } from "../../player/components/FocusTarget";
import { Footprint } from "../../shared/components/Footprint";
import { Grabbable } from "../../shared/components/Grabbable";
import { ItemUseConstraints } from "../../shared/components/ItemUseConstraints";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { Position } from "../../shared/components/Position";
import { WeightInspectable } from "../../shared/components/WeightInspectable";
import { WeightedObject } from "../../shared/components/WeightedObject";

export class WeightDisplaySystem implements System {
  constructor(private readonly label: Phaser.GameObjects.Text) {}

  update(world: World): void {
    const player = world.query(PlayerControlled, Position)[0];

    if (!player) {
      this.label.setText("");
      return;
    }

    const [, , playerPosition] = player;
    const focus = world.query(FocusTarget)[0]?.[1];

    if (focus?.kind === "object" && focus.object) {
      const weight = world.getComponent(focus.object, WeightedObject);
      const inspectable = world.getComponent(focus.object, WeightInspectable);

      if (weight && inspectable) {
        this.label.setText(
          `Focus: ${inspectable.label}: ${formatObjectDetail(
            world,
            focus.object,
            weight,
          )}`,
        );
        return;
      }
    }

    const weightedObject = world
      .query(Position, WeightedObject, Footprint, WeightInspectable)
      .find(([, objectPosition, , footprint]) =>
        this.contains(objectPosition, footprint, playerPosition),
      );

    if (!weightedObject) {
      this.label.setText("Stand on an object to read its weight");
      return;
    }

    const [, , weight, , inspectable] = weightedObject;
    this.label.setText(
      `${inspectable.label}: ${formatObjectDetail(world, weightedObject[0], weight)}`,
    );
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

function formatObjectDetail(
  world: World,
  entity: number,
  weight: WeightedObject,
): string {
  const traits = [
    `${weight.weight} weight`,
    world.getComponent(entity, Grabbable) ? "grabbable" : "fixed",
  ];
  const constraints = world.getComponent(entity, ItemUseConstraints);

  if (constraints) {
    traits.push("usable");
  }

  return traits.join(" - ");
}
