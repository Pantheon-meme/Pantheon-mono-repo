import Phaser from "phaser";
import dirtAtlasUrl from "../assets/autotiles/dirt/autotile-blob-7x7.png?url";
import grassAtlasUrl from "../assets/autotiles/vibrant-grass/autotile-blob-7x7.png?url";
import { objectSpriteAssets } from "../assets/object-sprites/ObjectSpriteAssets";
import { World } from "../ecs/World";
import { blobAtlasCellSize } from "../game/terrain/autotile/BlobAutotile";
import { registerSystems } from "../game/bootstrap/registerSystems";
import { ActionBindings } from "../game/actions/components/ActionBindings";
import { ActionLog } from "../game/actions/components/ActionLog";
import { ActionProgress } from "../game/actions/components/ActionProgress";
import { ActionQueue } from "../game/actions/components/ActionQueue";
import { AutotileLayer } from "../game/terrain/components/AutotileLayer";
import { DayNightOverlay } from "../game/ui/components/DayNightOverlay";
import { DiggingCapability } from "../game/player/components/DiggingCapability";
import { Energy } from "../game/energy/components/Energy";
import { EnergyBar } from "../game/ui/components/EnergyBar";
import { FacingDirection } from "../game/player/components/FacingDirection";
import { FocusTarget } from "../game/player/components/FocusTarget";
import { GameClock } from "../game/time/components/GameClock";
import { HandHud } from "../game/ui/components/HandHud";
import { Hands } from "../game/player/components/Hands";
import { IdeaState } from "../game/ideas/components/IdeaState";
import { GridTargetHighlight } from "../game/terrain/components/GridTargetHighlight";
import { InputState } from "../game/player/components/InputState";
import { JournalPanel } from "../game/ui/components/JournalPanel";
import { KnowledgeState } from "../game/ideas/components/KnowledgeState";
import { NeedState } from "../game/needs/components/NeedState";
import { PlayerControlled } from "../game/player/components/PlayerControlled";
import { Position } from "../game/shared/components/Position";
import { Renderable } from "../game/shared/components/Renderable";
import { ActionProgressBar } from "../game/ui/components/ActionProgressBar";
import { SeedHud } from "../game/ui/components/SeedHud";
import { SeedPouch } from "../game/plants/components/SeedPouch";
import { SkillSet } from "../game/ideas/components/SkillSet";
import { SleepProgressBar } from "../game/ui/components/SleepProgressBar";
import { SleepState } from "../game/sleep/components/SleepState";
import { SleepVisual } from "../game/ui/components/SleepVisual";
import { TargetActionMenu } from "../game/ui/components/TargetActionMenu";
import { TerrainBackground } from "../game/terrain/components/TerrainBackground";
import { TerrainBaseLayer } from "../game/terrain/components/TerrainBaseLayer";
import { TerrainDigDepth } from "../game/terrain/components/TerrainDigDepth";
import { TerrainGrid } from "../game/terrain/components/TerrainGrid";
import { TerrainHardness } from "../game/terrain/components/TerrainHardness";
import { TerrainLayer } from "../game/terrain/components/TerrainLayer";
import { Velocity } from "../game/shared/components/Velocity";
import { plantSpriteTextureKey } from "../game/plants/PlantSpriteAssets";

const grassAtlasKey = "main-vibrant-grass-blob-7x7";
const dirtAtlasKey = "main-dirt-blob-7x7";
const tileSize = 256;
const gridWidth = 200;
const gridHeight = 200;
const worldWidth = gridWidth * tileSize;
const worldHeight = gridHeight * tileSize;

export class MainGameScene extends Phaser.Scene {
  private world?: World;

  constructor() {
    super("main-game");
  }

  preload(): void {
    this.load.image(grassAtlasKey, grassAtlasUrl);
    this.load.image(dirtAtlasKey, dirtAtlasUrl);

    for (const [plantId, asset] of Object.entries(objectSpriteAssets)) {
      this.load.spritesheet(plantSpriteTextureKey(plantId), asset.imageUrl, {
        frameWidth: asset.manifest.cellSize,
        frameHeight: asset.manifest.cellSize,
      });
    }
  }

  create(): void {
    const world = new World();
    const baseTerrain = world.createEntity();
    const backgroundTerrain = world.createEntity();
    const atlasWarmupTerrain = world.createEntity();
    const dirtTerrain = world.createEntity();
    const diggingTerrain = world.createEntity();
    const time = world.createEntity();
    const dayNight = world.createEntity();
    const sleepHud = world.createEntity();
    const journal = world.createEntity();
    const seedHud = world.createEntity();
    const handHud = world.createEntity();
    const targetActionMenu = world.createEntity();
    const player = world.createEntity();
    const baseGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const warmupGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const dirtGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const spawnX = worldWidth / 2;
    const spawnY = worldHeight / 2;
    const playerSprite = this.add
      .circle(spawnX, spawnY, 34, 0xf2c15f)
      .setDepth(10);
    const actionProgressBar = this.createActionProgressBar();
    const energyBar = this.createEnergyBar();
    const dayNightOverlay = this.createDayNightOverlay();
    const sleepProgressBar = this.createSleepProgressBar();
    const sleepVisual = this.createSleepVisual();
    const journalPanel = this.createJournalPanel();
    const seedHudDisplay = this.createSeedHud();
    const handHudDisplay = this.createHandHud();
    const targetActionMenuDisplay = this.createTargetActionMenu();
    const weightLabel = this.createWeightLabel();
    const needs = new NeedState();

    needs.addNeed({
      id: "carry_more",
      label: "Carry more things",
      description:
        "Two hands are not enough. Something wearable or tied together might help.",
      urgency: 65,
      active: false,
    });

    playerSprite.setStrokeStyle(5, 0x3a2514, 0.95);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(0.7);
    this.cameras.main.startFollow(playerSprite, true, 0.12, 0.12);

    world.addComponent(baseTerrain, TerrainGrid, baseGrid);
    world.addComponent(
      baseTerrain,
      TerrainBaseLayer,
      new TerrainBaseLayer(
        this.add.graphics().setDepth(0),
        0x496f50,
        0x547a59,
        0x213d2a,
      ),
    );

    world.addComponent(backgroundTerrain, TerrainGrid, baseGrid);
    world.addComponent(
      backgroundTerrain,
      TerrainBackground,
      new TerrainBackground(
        this.add.container(0, 0).setDepth(1),
        ["vibrant-grass"],
        "vibrant-grass",
      ),
    );

    world.addComponent(atlasWarmupTerrain, TerrainGrid, warmupGrid);
    world.addComponent(
      atlasWarmupTerrain,
      AutotileLayer,
      new AutotileLayer(
        this.add.container(0, 0).setDepth(-1),
        grassAtlasKey,
        "vibrant-grass",
        blobAtlasCellSize,
      ),
    );

    world.addComponent(dirtTerrain, TerrainGrid, dirtGrid);
    world.addComponent(dirtTerrain, TerrainLayer, new TerrainLayer("dirt", 20));
    world.addComponent(
      dirtTerrain,
      AutotileLayer,
      new AutotileLayer(
        this.add.container(0, 0).setDepth(2),
        dirtAtlasKey,
        "main-dirt",
        blobAtlasCellSize,
      ),
    );
    world.addComponent(diggingTerrain, TerrainHardness, new TerrainHardness());
    world.addComponent(diggingTerrain, TerrainDigDepth, new TerrainDigDepth());

    world.addComponent(time, GameClock, new GameClock());
    world.addComponent(dayNight, DayNightOverlay, dayNightOverlay);
    world.addComponent(sleepHud, SleepProgressBar, sleepProgressBar);
    world.addComponent(journal, JournalPanel, journalPanel);
    world.addComponent(seedHud, SeedHud, seedHudDisplay);
    world.addComponent(handHud, HandHud, handHudDisplay);
    world.addComponent(
      targetActionMenu,
      TargetActionMenu,
      targetActionMenuDisplay,
    );

    world.addComponent(player, PlayerControlled, new PlayerControlled());
    world.addComponent(player, InputState, new InputState());
    world.addComponent(player, FacingDirection, new FacingDirection(0, 1));
    world.addComponent(player, FocusTarget, new FocusTarget());
    world.addComponent(player, Position, new Position(spawnX, spawnY));
    world.addComponent(player, Velocity, new Velocity(0, 0, 620));
    world.addComponent(player, Energy, new Energy(100, 100, 0));
    world.addComponent(player, Hands, new Hands());
    world.addComponent(player, DiggingCapability, new DiggingCapability());
    world.addComponent(player, SeedPouch, new SeedPouch());
    world.addComponent(player, NeedState, needs);
    world.addComponent(player, IdeaState, new IdeaState());
    world.addComponent(
      player,
      KnowledgeState,
      new KnowledgeState(["fiber", "stick"]),
    );
    world.addComponent(
      player,
      SkillSet,
      new SkillSet({ foraging: 1, reflection: 1 }),
    );
    world.addComponent(player, SleepState, new SleepState());
    world.addComponent(player, ActionProgress, new ActionProgress());
    world.addComponent(player, ActionProgressBar, actionProgressBar);
    world.addComponent(player, ActionQueue, new ActionQueue());
    world.addComponent(
      player,
      ActionBindings,
      new ActionBindings({
        [Phaser.Input.Keyboard.KeyCodes.SPACE]: "forage",
        [Phaser.Input.Keyboard.KeyCodes.P]: "plant",
        [Phaser.Input.Keyboard.KeyCodes.H]: "fetch",
        [Phaser.Input.Keyboard.KeyCodes.C]: "cycle-seed",
        [Phaser.Input.Keyboard.KeyCodes.F]: "dig",
        [Phaser.Input.Keyboard.KeyCodes.R]: "sleep",
        [Phaser.Input.Keyboard.KeyCodes.T]: "reflect",
        [Phaser.Input.Keyboard.KeyCodes.ONE]: "left-hand-toggle",
        [Phaser.Input.Keyboard.KeyCodes.TWO]: "left-hand-use",
        [Phaser.Input.Keyboard.KeyCodes.THREE]: "right-hand-toggle",
        [Phaser.Input.Keyboard.KeyCodes.FOUR]: "right-hand-use",
        [Phaser.Input.Keyboard.KeyCodes.FIVE]: "carry-more-need",
      }),
    );
    world.addComponent(player, ActionLog, new ActionLog());
    world.addComponent(player, EnergyBar, energyBar);
    world.addComponent(player, Renderable, new Renderable(playerSprite));
    world.addComponent(player, SleepVisual, sleepVisual);
    world.addComponent(
      player,
      GridTargetHighlight,
      new GridTargetHighlight(this.add.graphics().setDepth(9)),
    );

    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    registerSystems(
      world,
      this,
      keyboard,
      new Phaser.Geom.Rectangle(34, 34, worldWidth - 68, worldHeight - 68),
      weightLabel,
    );

    this.world = world;
  }

  update(_time: number, delta: number): void {
    this.world?.update(delta / 1000);
  }

  private createEnergyBar(): EnergyBar {
    const width = 360;
    const height = 24;
    const x = 18;
    const y = 18;
    const background = this.add
      .rectangle(x, y, width, height, 0x17222a, 0.92)
      .setOrigin(0)
      .setDepth(100);
    const fill = this.add
      .rectangle(x, y, width, height, 0x66d685, 1)
      .setOrigin(0)
      .setDepth(101);
    const label = this.add
      .text(x, y + height + 6, "", {
        color: "#eef7f4",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "18px",
      })
      .setDepth(101);

    background.setStrokeStyle(2, 0xe8f0e8, 0.55);

    return new EnergyBar(background, fill, label, width, height, x, y);
  }

  private createActionProgressBar(): ActionProgressBar {
    const width = 156;
    const height = 12;
    const container = this.add.container(0, 0).setDepth(106).setVisible(false);
    const background = this.add
      .rectangle(0, 0, width, height, 0x101821, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xf6efd7, 0.8);
    const fill = this.add
      .rectangle(-width / 2, -height / 2, 0, height, 0xf0c85a, 1)
      .setOrigin(0);
    const label = this.add
      .text(0, -24, "", {
        align: "center",
        color: "#f6efd7",
        fixedWidth: 220,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px",
        fontStyle: "700",
        shadow: {
          color: "#071018",
          blur: 4,
          fill: true,
          offsetX: 1,
          offsetY: 1,
        },
      })
      .setOrigin(0.5);

    container.add([background, fill, label]);

    return new ActionProgressBar(
      container,
      background,
      fill,
      label,
      width,
      height,
      -78,
    );
  }

  private createDayNightOverlay(): DayNightOverlay {
    const shade = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x07142a, 0)
      .setOrigin(0)
      .setDepth(90);
    const label = this.add
      .text(0, 0, "", {
        align: "right",
        color: "#eef7f4",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "18px",
        lineSpacing: 4,
        shadow: {
          color: "#071018",
          blur: 4,
          fill: true,
          offsetX: 1,
          offsetY: 1,
        },
      })
      .setOrigin(1, 0)
      .setDepth(101);

    return new DayNightOverlay(shade, label, 18, 18);
  }

  private createSleepProgressBar(): SleepProgressBar {
    const width = 360;
    const height = 18;
    const x = 18;
    const y = 96;
    const background = this.add
      .rectangle(x, y, width, height, 0x111821, 0.9)
      .setOrigin(0)
      .setDepth(101);
    const fill = this.add
      .rectangle(x, y, width, height, 0x7bd7ff, 1)
      .setOrigin(0)
      .setDepth(102);
    const label = this.add
      .text(x, y + height + 6, "", {
        color: "#eef7f4",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "16px",
      })
      .setDepth(102);

    background.setStrokeStyle(2, 0xe8f0e8, 0.45);
    background.setVisible(false);
    fill.setVisible(false);
    label.setVisible(false);

    return new SleepProgressBar(background, fill, label, width, height, x, y);
  }

  private createSeedHud(): SeedHud {
    const label = this.add
      .text(18, 128, "", {
        color: "#eef7f4",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "15px",
        lineSpacing: 4,
        shadow: {
          color: "#071018",
          blur: 4,
          fill: true,
          offsetX: 1,
          offsetY: 1,
        },
      })
      .setDepth(101);

    return new SeedHud(label, 18, 128);
  }

  private createHandHud(): HandHud {
    const label = this.add
      .text(18, 180, "", {
        color: "#eef7f4",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "15px",
        lineSpacing: 4,
        shadow: {
          color: "#071018",
          blur: 4,
          fill: true,
          offsetX: 1,
          offsetY: 1,
        },
      })
      .setDepth(101);

    return new HandHud(label, 18, 180);
  }

  private createWeightLabel(): Phaser.GameObjects.Text {
    return this.add
      .text(18, this.scale.height - 54, "", {
        color: "#eef7f4",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "16px",
        shadow: {
          color: "#071018",
          blur: 4,
          fill: true,
          offsetX: 1,
          offsetY: 1,
        },
      })
      .setScrollFactor(0)
      .setDepth(101);
  }

  private createTargetActionMenu(): TargetActionMenu {
    const container = this.add.container(0, 0).setDepth(104).setVisible(false);
    const background = this.add
      .rectangle(0, 0, 440, 112, 0x101821, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xf1d38b, 0.72);
    const title = this.add
      .text(0, -38, "", {
        align: "center",
        color: "#f6efd7",
        fixedWidth: 400,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "15px",
        fontStyle: "700",
      })
      .setOrigin(0.5);

    container.add([background, title]);

    return new TargetActionMenu(container, background, title, 440, 38);
  }

  private createSleepVisual(): SleepVisual {
    const shadow = this.add
      .ellipse(0, 0, 96, 28, 0x101018, 0.42)
      .setDepth(9)
      .setVisible(false);
    const marker = this.add
      .text(0, 0, "", {
        color: "#eef7f4",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "24px",
        fontStyle: "700",
        shadow: {
          color: "#071018",
          blur: 4,
          fill: true,
          offsetX: 1,
          offsetY: 1,
        },
      })
      .setOrigin(0.5)
      .setDepth(12)
      .setVisible(false);

    return new SleepVisual(shadow, marker);
  }

  private createJournalPanel(): JournalPanel {
    const width = 520;
    const height = 440;
    const x = 18;
    const y = 150;
    const background = this.add
      .rectangle(x, y, width, height, 0x111821, 0.92)
      .setOrigin(0)
      .setDepth(110)
      .setVisible(false);
    const title = this.add
      .text(x + 20, y + 18, "", {
        color: "#f6efd7",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "700",
      })
      .setDepth(111)
      .setVisible(false);
    const tabs = [
      this.createJournalTab("needs", "Needs"),
      this.createJournalTab("ideas", "Ideas"),
      this.createJournalTab("skills", "Skills"),
      this.createJournalTab("checks", "Checks"),
    ];
    const body = this.add
      .text(x + 20, y + 112, "", {
        color: "#dce8e2",
        fixedWidth: width - 40,
        fixedHeight: height - 130,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "16px",
        lineSpacing: 6,
        wordWrap: { width: width - 40 },
      })
      .setDepth(111)
      .setVisible(false);

    background.setStrokeStyle(2, 0xe8f0e8, 0.5);

    const panel = new JournalPanel(
      background,
      title,
      tabs,
      body,
      x,
      y,
      width,
      height,
    );

    for (const tab of tabs) {
      tab.background.on("pointerdown", () => {
        panel.setSection(tab.section);
      });
    }

    return panel;
  }

  private createJournalTab(
    section: "needs" | "ideas" | "skills" | "checks",
    label: string,
  ) {
    const background = this.add
      .rectangle(0, 0, 112, 34, 0x1b2a32, 0.9)
      .setOrigin(0)
      .setDepth(111)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    const text = this.add
      .text(0, 0, label, {
        align: "center",
        color: "#dce8e2",
        fixedWidth: 112,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "15px",
      })
      .setOrigin(0.5)
      .setDepth(112)
      .setVisible(false);

    return { section, background, label: text };
  }
}
