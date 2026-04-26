import Phaser from "phaser";
import dirtAtlasUrl from "../../../../packages/assets/generated/autotiles/dirt/autotile-blob-7x7.png?url";
import grassAtlasUrl from "../../../../packages/assets/generated/autotiles/vibrant-grass/autotile-blob-7x7.png?url";
import { World } from "../ecs/World";
import { blobAtlasCellSize } from "../game/autotile/BlobAutotile";
import { ActionBindings } from "../game/components/ActionBindings";
import { ActionLog } from "../game/components/ActionLog";
import { ActionQueue } from "../game/components/ActionQueue";
import { AutotileLayer } from "../game/components/AutotileLayer";
import { DayNightOverlay } from "../game/components/DayNightOverlay";
import { Energy } from "../game/components/Energy";
import { EnergyBar } from "../game/components/EnergyBar";
import { FacingDirection } from "../game/components/FacingDirection";
import { FocusTarget } from "../game/components/FocusTarget";
import { GameClock } from "../game/components/GameClock";
import { HandHud } from "../game/components/HandHud";
import { Hands } from "../game/components/Hands";
import { IdeaState } from "../game/components/IdeaState";
import { GridTargetHighlight } from "../game/components/GridTargetHighlight";
import { InputState } from "../game/components/InputState";
import { JournalPanel } from "../game/components/JournalPanel";
import { KnowledgeState } from "../game/components/KnowledgeState";
import { NeedState } from "../game/components/NeedState";
import { PlayerControlled } from "../game/components/PlayerControlled";
import { Position } from "../game/components/Position";
import { Renderable } from "../game/components/Renderable";
import { SeedHud } from "../game/components/SeedHud";
import { SeedPouch } from "../game/components/SeedPouch";
import { SkillSet } from "../game/components/SkillSet";
import { SleepProgressBar } from "../game/components/SleepProgressBar";
import { SleepState } from "../game/components/SleepState";
import { SleepVisual } from "../game/components/SleepVisual";
import { TerrainBackground } from "../game/components/TerrainBackground";
import { TerrainBaseLayer } from "../game/components/TerrainBaseLayer";
import { TerrainGrid } from "../game/components/TerrainGrid";
import { TerrainLayer } from "../game/components/TerrainLayer";
import { Velocity } from "../game/components/Velocity";
import { AutotileRenderSystem } from "../game/systems/AutotileRenderSystem";
import { ActionInputSystem } from "../game/systems/ActionInputSystem";
import { ActionSystem } from "../game/systems/ActionSystem";
import { BoundsSystem } from "../game/systems/BoundsSystem";
import { DayNightRenderSystem } from "../game/systems/DayNightRenderSystem";
import { EnergyBarSystem } from "../game/systems/EnergyBarSystem";
import { EnergySystem } from "../game/systems/EnergySystem";
import { FacingDirectionSystem } from "../game/systems/FacingDirectionSystem";
import { FocusInputSystem } from "../game/systems/FocusInputSystem";
import { FocusTargetSystem } from "../game/systems/FocusTargetSystem";
import { GameClockSystem } from "../game/systems/GameClockSystem";
import { GridTargetHighlightSystem } from "../game/systems/GridTargetHighlightSystem";
import { HandHudSystem } from "../game/systems/HandHudSystem";
import { HeldItemPositionSystem } from "../game/systems/HeldItemPositionSystem";
import { InputSystem } from "../game/systems/InputSystem";
import { JournalSystem } from "../game/systems/JournalSystem";
import { MovementSystem } from "../game/systems/MovementSystem";
import { PlantGrowthSystem } from "../game/systems/PlantGrowthSystem";
import { PlantRenderSystem } from "../game/systems/PlantRenderSystem";
import { RenderSystem } from "../game/systems/RenderSystem";
import { SeedDropRenderSystem } from "../game/systems/SeedDropRenderSystem";
import { SeedHudSystem } from "../game/systems/SeedHudSystem";
import { SleepProgressBarSystem } from "../game/systems/SleepProgressBarSystem";
import { SleepSystem } from "../game/systems/SleepSystem";
import { SleepVisualSystem } from "../game/systems/SleepVisualSystem";
import { TerrainBackgroundSystem } from "../game/systems/TerrainBackgroundSystem";
import { TerrainBaseRenderSystem } from "../game/systems/TerrainBaseRenderSystem";
import { WeightDisplaySystem } from "../game/systems/WeightDisplaySystem";

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
  }

  create(): void {
    const world = new World();
    const baseTerrain = world.createEntity();
    const backgroundTerrain = world.createEntity();
    const atlasWarmupTerrain = world.createEntity();
    const dirtTerrain = world.createEntity();
    const time = world.createEntity();
    const dayNight = world.createEntity();
    const sleepHud = world.createEntity();
    const journal = world.createEntity();
    const seedHud = world.createEntity();
    const handHud = world.createEntity();
    const player = world.createEntity();
    const baseGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const warmupGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const dirtGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const spawnX = worldWidth / 2;
    const spawnY = worldHeight / 2;
    const playerSprite = this.add
      .circle(spawnX, spawnY, 34, 0xf2c15f)
      .setDepth(10);
    const energyBar = this.createEnergyBar();
    const dayNightOverlay = this.createDayNightOverlay();
    const sleepProgressBar = this.createSleepProgressBar();
    const sleepVisual = this.createSleepVisual();
    const journalPanel = this.createJournalPanel();
    const seedHudDisplay = this.createSeedHud();
    const handHudDisplay = this.createHandHud();
    const weightLabel = this.createWeightLabel();
    const needs = new NeedState();

    needs.addNeed({
      id: "carry_more",
      label: "Carry more things",
      description:
        "Two hands are not enough. Something wearable or tied together might help.",
      urgency: 65,
      active: true,
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

    world.addComponent(time, GameClock, new GameClock());
    world.addComponent(dayNight, DayNightOverlay, dayNightOverlay);
    world.addComponent(sleepHud, SleepProgressBar, sleepProgressBar);
    world.addComponent(journal, JournalPanel, journalPanel);
    world.addComponent(seedHud, SeedHud, seedHudDisplay);
    world.addComponent(handHud, HandHud, handHudDisplay);

    world.addComponent(player, PlayerControlled, new PlayerControlled());
    world.addComponent(player, InputState, new InputState());
    world.addComponent(player, FacingDirection, new FacingDirection(0, 1));
    world.addComponent(player, FocusTarget, new FocusTarget());
    world.addComponent(player, Position, new Position(spawnX, spawnY));
    world.addComponent(player, Velocity, new Velocity(0, 0, 620));
    world.addComponent(player, Energy, new Energy(100, 100, 0));
    world.addComponent(player, Hands, new Hands());
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

    world.addSystem(new TerrainBaseRenderSystem());
    world.addSystem(new AutotileRenderSystem(this));
    world.addSystem(new TerrainBackgroundSystem(this));
    world.addSystem(new JournalSystem(this));
    world.addSystem(new FocusInputSystem(keyboard));
    world.addSystem(
      new InputSystem(
        keyboard.createCursorKeys(),
        keyboard.addKeys("W,A,S,D") as Record<
          "W" | "A" | "S" | "D",
          Phaser.Input.Keyboard.Key
        >,
      ),
    );
    world.addSystem(new ActionInputSystem(keyboard));
    world.addSystem(new GameClockSystem());
    world.addSystem(new EnergySystem());
    world.addSystem(new PlantGrowthSystem());
    world.addSystem(new FacingDirectionSystem());
    world.addSystem(new MovementSystem());
    world.addSystem(new HeldItemPositionSystem());
    world.addSystem(new FocusTargetSystem());
    world.addSystem(new ActionSystem());
    world.addSystem(new SleepSystem());
    world.addSystem(
      new BoundsSystem(
        new Phaser.Geom.Rectangle(34, 34, worldWidth - 68, worldHeight - 68),
      ),
    );
    world.addSystem(new GridTargetHighlightSystem());
    world.addSystem(new RenderSystem());
    world.addSystem(new PlantRenderSystem(this));
    world.addSystem(new SeedDropRenderSystem(this));
    world.addSystem(new SleepVisualSystem());
    world.addSystem(new DayNightRenderSystem());
    world.addSystem(new SleepProgressBarSystem());
    world.addSystem(new SeedHudSystem());
    world.addSystem(new HandHudSystem());
    world.addSystem(new EnergyBarSystem());
    world.addSystem(new WeightDisplaySystem(weightLabel));

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
