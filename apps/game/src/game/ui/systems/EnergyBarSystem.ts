import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { ActionLog } from "../../actions/components/ActionLog";
import { Energy } from "../../energy/components/Energy";
import { EnergyBar } from "../components/EnergyBar";

export class EnergyBarSystem implements System {
  update(world: World): void {
    const actionLog = world.query(ActionLog)[0]?.[1];

    for (const [, energy, bar] of world.query(Energy, EnergyBar)) {
      const ratio = energy.max === 0 ? 0 : energy.current / energy.max;
      const fillWidth = Math.max(0, bar.width * ratio);
      const camera = bar.background.scene.cameras.main;
      const scale = 1 / camera.zoom;
      const worldX = camera.worldView.x + bar.screenX * scale;
      const worldY = camera.worldView.y + bar.screenY * scale;

      bar.background.setPosition(worldX, worldY);
      bar.background.setScale(scale);
      bar.fill.setPosition(worldX, worldY);
      bar.fill.setScale(scale);
      bar.label.setPosition(worldX, worldY + (bar.height + 6) * scale);
      bar.label.setScale(scale);
      bar.fill.width = fillWidth;
      bar.label.setText(
        `Energy ${Math.round(energy.current)} / ${energy.max}\n${actionLog?.lastMessage ?? ""}`,
      );

      if (ratio > 0.55) {
        bar.fill.setFillStyle(0x66d685);
      } else if (ratio > 0.25) {
        bar.fill.setFillStyle(0xf0c85a);
      } else {
        bar.fill.setFillStyle(0xee6b5f);
      }

      bar.background.setVisible(true);
      bar.fill.setVisible(true);
      bar.label.setVisible(true);
    }
  }
}
