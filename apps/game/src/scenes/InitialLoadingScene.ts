import Phaser from "phaser";
import { MudWorldBridge } from "../game/mud/MudWorldBridge";
import {
  gridHeight,
  gridWidth,
  initialWorldStateHydrationRadius,
} from "./MainGameScene";

export class InitialLoadingScene extends Phaser.Scene {
  private statusText?: Phaser.GameObjects.Text;
  private detailText?: Phaser.GameObjects.Text;

  constructor() {
    super("initial-loading");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#101821");

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add
      .text(centerX, centerY - 34, "Loading onchain world", {
        align: "center",
        color: "#f6efd7",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "28px",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(centerX, centerY + 12, "Reading player state...", {
        align: "center",
        color: "#dce8e2",
        fixedWidth: Math.min(this.scale.width - 48, 560),
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "16px",
        wordWrap: { width: Math.min(this.scale.width - 48, 560) },
      })
      .setOrigin(0.5);

    this.detailText = this.add
      .text(centerX, centerY + 48, "", {
        align: "center",
        color: "#8bd6a0",
        fixedWidth: Math.min(this.scale.width - 48, 560),
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px",
        wordWrap: { width: Math.min(this.scale.width - 48, 560) },
      })
      .setOrigin(0.5);

    if (isFreeExploreMode()) {
      this.statusText.setText("Starting local exploration...");
      this.scene.start("main-game");
      return;
    }

    void this.loadInitialOnchainState();
  }

  private async loadInitialOnchainState(): Promise<void> {
    const mudBridge = MudWorldBridge.fromEnv();

    this.detailText?.setText("Waiting for confirmed tables...");
    const initialMudSnapshot = await mudBridge.readPlayerSnapshot({
      width: gridWidth,
      height: gridHeight,
      radius: initialWorldStateHydrationRadius,
    });

    if (initialMudSnapshot) {
      this.statusText?.setText("Onchain state loaded");
      this.detailText?.setText(
        `Player ${initialMudSnapshot.x},${initialMudSnapshot.y}`,
      );
    } else {
      this.statusText?.setText("No spawned onchain player found");
      this.detailText?.setText("Opening the world with local defaults...");
    }

    this.scene.start("main-game", {
      mudBridge,
      initialMudSnapshot,
    });
  }
}

function isFreeExploreMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const value =
    params.get("freeExplore") ??
    params.get("freePlayer") ??
    params.get("explore");

  return value === "1" || value === "true" || value === "on";
}
