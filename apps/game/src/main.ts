import Phaser from "phaser";
import { AutogridPlaygroundScene } from "./scenes/AutogridPlaygroundScene";
import { MainGameScene } from "./scenes/MainGameScene";
import { WorldScene } from "./scenes/WorldScene";
import "./styles.css";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#151b23",
  antialias: true,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1240,
    height: 720,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [MainGameScene, AutogridPlaygroundScene, WorldScene],
};

new Phaser.Game(config);
