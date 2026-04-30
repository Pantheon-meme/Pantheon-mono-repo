import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { InputState } from "../../player/components/InputState";
import { PlayerControlled } from "../../player/components/PlayerControlled";
import { hudColors } from "../HudTheme";
import { VirtualJoystick } from "../components/VirtualJoystick";

export class VirtualJoystickSystem implements System {
  update(world: World): void {
    const playerInput = world.query(PlayerControlled, InputState)[0]?.[2];

    for (const [, joystick] of world.query(VirtualJoystick)) {
      this.positionJoystick(joystick);
      this.updatePointer(joystick);

      if (playerInput && joystick.active) {
        playerInput.directionX = joystick.directionX;
        playerInput.directionY = joystick.directionY;
      }
    }
  }

  private updatePointer(joystick: VirtualJoystick): void {
    const pointer = this.getTrackedPointer(joystick);

    if (!joystick.active || !pointer?.isDown) {
      this.resetJoystick(joystick);
      return;
    }

    pointer.updateWorldPoint(joystick.container.scene.cameras.main);

    const scale = joystick.container.scaleX || 1;
    const dx = (pointer.worldX - joystick.container.x) / scale;
    const dy = (pointer.worldY - joystick.container.y) / scale;
    const distance = Math.hypot(dx, dy);
    const limitedDistance = Math.min(distance, joystick.radius);
    const angle = Math.atan2(dy, dx);
    const thumbX = Math.cos(angle) * limitedDistance;
    const thumbY = Math.sin(angle) * limitedDistance;

    joystick.thumb.setPosition(thumbX, thumbY);
    joystick.base.setStrokeStyle(2, hudColors.borderWarm, 0.72);
    joystick.thumb.setFillStyle(hudColors.borderWarm, 0.88);

    if (distance < joystick.radius * 0.28) {
      joystick.directionX = 0;
      joystick.directionY = 0;
      return;
    }

    joystick.directionX = Math.abs(dx) > joystick.radius * 0.28 ? Math.sign(dx) : 0;
    joystick.directionY = Math.abs(dy) > joystick.radius * 0.28 ? Math.sign(dy) : 0;
  }

  private getTrackedPointer(
    joystick: VirtualJoystick,
  ): Phaser.Input.Pointer | undefined {
    if (joystick.pointerId === undefined) {
      return joystick.container.scene.input.activePointer;
    }

    return joystick.container.scene.input.manager.pointers.find(
      (pointer) => pointer.id === joystick.pointerId,
    );
  }

  private resetJoystick(joystick: VirtualJoystick): void {
    joystick.active = false;
    joystick.pointerId = undefined;
    joystick.directionX = 0;
    joystick.directionY = 0;
    joystick.thumb.setPosition(0, 0);
    joystick.base.setStrokeStyle(2, hudColors.border, 0.32);
    joystick.thumb.setFillStyle(hudColors.borderWarm, 0.55);
  }

  private positionJoystick(joystick: VirtualJoystick): void {
    const camera = joystick.container.scene.cameras.main;
    const scale = 1 / camera.zoom;
    const worldX = camera.worldView.x + joystick.screenX * scale;
    const worldY =
      camera.worldView.y +
      (camera.height - joystick.screenYFromBottom) * scale;

    joystick.container.setPosition(worldX, worldY);
    joystick.container.setScale(scale);
  }
}
