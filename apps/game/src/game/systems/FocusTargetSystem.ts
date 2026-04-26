import type { Entity } from "../../ecs/World";
import type { System } from "../../ecs/System";
import type { World } from "../../ecs/World";
import { FacingDirection } from "../components/FacingDirection";
import { FocusTarget } from "../components/FocusTarget";
import { Footprint } from "../components/Footprint";
import { PlayerControlled } from "../components/PlayerControlled";
import { Position } from "../components/Position";
import { TerrainGrid } from "../components/TerrainGrid";
import { WeightInspectable } from "../components/WeightInspectable";
import { getFacingTargetCell } from "../terrain/GridTargeting";

export class FocusTargetSystem implements System {
  update(world: World): void {
    const grid = world.query(TerrainGrid)[0]?.[1];

    if (!grid) {
      return;
    }

    for (const [, , position, facing, focus] of world.query(
      PlayerControlled,
      Position,
      FacingDirection,
      FocusTarget,
    )) {
      const targetCell = getFacingTargetCell(grid, position, facing);
      const objects = this.getObjectsInCell(
        world,
        grid,
        targetCell.x,
        targetCell.y,
      );
      const focusedObject = focus.selectTarget(
        objects.map(({ entity }) => entity),
      );

      focus.tileX = targetCell.x;
      focus.tileY = targetCell.y;

      if (!focusedObject) {
        focus.kind = "tile";
        focus.object = undefined;
        focus.objectLabel = "";
        return;
      }

      const object = objects.find(
        (candidate) => candidate.entity === focusedObject,
      );

      if (!object) {
        focus.kind = "tile";
        focus.object = undefined;
        focus.objectLabel = "";
        return;
      }

      focus.kind = "object";
      focus.object = object.entity;
      focus.objectLabel = object.label;
      focus.objectX = object.position.x;
      focus.objectY = object.position.y;
      focus.objectWidth = object.footprint.width;
      focus.objectHeight = object.footprint.height;
    }
  }

  private getObjectsInCell(
    world: World,
    grid: TerrainGrid,
    tileX: number,
    tileY: number,
  ): Array<{
    entity: Entity;
    position: Position;
    footprint: Footprint;
    label: string;
  }> {
    const left = tileX * grid.tileSize;
    const top = tileY * grid.tileSize;
    const right = left + grid.tileSize;
    const bottom = top + grid.tileSize;

    return world
      .query(Position, Footprint, WeightInspectable)
      .filter(([, position, footprint]) =>
        overlapsCell(position, footprint, left, top, right, bottom),
      )
      .map(([entity, position, footprint, inspectable]) => ({
        entity,
        position,
        footprint,
        label: inspectable.label,
      }))
      .sort((a, b) => a.entity - b.entity);
  }
}

function overlapsCell(
  position: Position,
  footprint: Footprint,
  left: number,
  top: number,
  right: number,
  bottom: number,
): boolean {
  const halfWidth = footprint.width / 2;
  const halfHeight = footprint.height / 2;

  return (
    position.x + halfWidth >= left &&
    position.x - halfWidth <= right &&
    position.y + halfHeight >= top &&
    position.y - halfHeight <= bottom
  );
}
