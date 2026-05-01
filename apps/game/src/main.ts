import Phaser from "phaser";
import { AutogridPlaygroundScene } from "./scenes/AutogridPlaygroundScene";
import { InitialLoadingScene } from "./scenes/InitialLoadingScene";
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
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: 1240,
    height: 720,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [InitialLoadingScene, MainGameScene, AutogridPlaygroundScene, WorldScene],
};

new Phaser.Game(config);
