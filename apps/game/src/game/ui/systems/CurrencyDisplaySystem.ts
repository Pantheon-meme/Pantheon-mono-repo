import type { System } from "../../../ecs/System";
import type { World } from "../../../ecs/World";
import { CucBalance } from "../../currency/components/CucBalance";
import { CurrencyDisplay } from "../components/CurrencyDisplay";

export class CurrencyDisplaySystem implements System {
  update(world: World): void {
    for (const [, balance, display] of world.query(CucBalance, CurrencyDisplay)) {
      const camera = display.background.scene.cameras.main;
      const scale = 1 / camera.zoom;
      const worldX = camera.worldView.x + display.screenX * scale;
      const worldY = camera.worldView.y + display.screenY * scale;

      display.background.setPosition(worldX, worldY);
      display.background.setScale(scale);
      display.label.setPosition(worldX + 14 * scale, worldY + 8 * scale);
      display.label.setScale(scale);
      display.label.setText(`${formatCuc(balance.balance)} CUC`);
      display.background.setVisible(true);
      display.label.setVisible(true);
    }
  }
}

function formatCuc(balance: bigint): string {
  return balance.toLocaleString("en-US");
}
