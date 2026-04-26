import Phaser from "phaser";
import { AutogridPlaygroundScene } from "./scenes/AutogridPlaygroundScene";
import { WorldScene } from "./scenes/WorldScene";
import "./styles.css";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#151b23",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [AutogridPlaygroundScene, WorldScene],
};

new Phaser.Game(config);
