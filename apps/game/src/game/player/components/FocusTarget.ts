import type { Entity } from "../../../ecs/World";

export type FocusTargetKind = "tile" | "object";

export class FocusTarget {
  kind: FocusTargetKind = "tile";
  tileX = 0;
  tileY = 0;
  object?: Entity;
  objectLabel = "";
  objectX = 0;
  objectY = 0;
  objectWidth = 0;
  objectHeight = 0;
  cycleRequest = 0;
  private targetIndex = 0;
  private targetSignature = "";

  requestCycle(): void {
    this.cycleRequest += 1;
  }

  selectTarget(objects: Entity[]): Entity | undefined {
    const signature = objects.join(",");

    if (signature !== this.targetSignature) {
      this.targetSignature = signature;
      this.targetIndex = 0;
    }

    const targetCount = objects.length + 1;

    if (this.cycleRequest > 0) {
      this.targetIndex = (this.targetIndex + this.cycleRequest) % targetCount;
      this.cycleRequest = 0;
    }

    if (this.targetIndex >= targetCount) {
      this.targetIndex = 0;
    }

    return objects[this.targetIndex];
  }
}
