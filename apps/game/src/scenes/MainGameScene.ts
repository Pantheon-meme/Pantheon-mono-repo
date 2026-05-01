import Phaser from "phaser";
import {
  getTerrainAtlasAsset,
  terrainAtlasAssets,
  terrainCenterVariantTextureKey,
  terrainAtlasTextureKey,
} from "../assets/autotiles/TerrainAtlasAssets";
import { objectSpriteAssets } from "../assets/object-sprites/ObjectSpriteAssets";
import { World } from "../ecs/World";
import {
  getActiveBiome,
  getBiomeTerrain,
  type BiomeDefinition,
} from "../game/biome/BiomeDefinitions";
import { seedBiomeTerrainGrid } from "../game/biome/BiomeTerrainGeneration";
import {
  createBiomeSurfacePlan,
  type BiomeSurfacePlan,
} from "../game/biome/BiomeSurfacePlan";
import { seedBiomeObjects } from "../game/biome/BiomeObjectGeneration";
import { blobAtlasCellSize } from "../game/terrain/autotile/BlobAutotile";
import { registerSystems } from "../game/bootstrap/registerSystems";
import { ActionBindings } from "../game/actions/components/ActionBindings";
import { ActionLog } from "../game/actions/components/ActionLog";
import { ActionProgress } from "../game/actions/components/ActionProgress";
import { ActionQueue } from "../game/actions/components/ActionQueue";
import { AutotileLayer } from "../game/terrain/components/AutotileLayer";
import { DayNightOverlay } from "../game/ui/components/DayNightOverlay";
import { BankPanel } from "../game/ui/components/BankPanel";
import { CucBalance } from "../game/currency/components/CucBalance";
import { CurrencyDisplay } from "../game/ui/components/CurrencyDisplay";
import { DiggingCapability } from "../game/player/components/DiggingCapability";
import { Energy } from "../game/energy/components/Energy";
import { EnergyBar } from "../game/ui/components/EnergyBar";
import { BiomeMinimap } from "../game/ui/components/BiomeMinimap";
import { FacingDirection } from "../game/player/components/FacingDirection";
import { Footprint } from "../game/shared/components/Footprint";
import { FocusTarget } from "../game/player/components/FocusTarget";
import { FreeExploreMode } from "../game/player/components/FreeExploreMode";
import { GameClock } from "../game/time/components/GameClock";
import { Grabbable } from "../game/shared/components/Grabbable";
import { HandHud } from "../game/ui/components/HandHud";
import { Hands } from "../game/player/components/Hands";
import { IdeaState } from "../game/ideas/components/IdeaState";
import { InventoryHud } from "../game/ui/components/InventoryHud";
import { GridTargetHighlight } from "../game/terrain/components/GridTargetHighlight";
import { InputState } from "../game/player/components/InputState";
import { ItemUseConstraints } from "../game/shared/components/ItemUseConstraints";
import { JournalPanel } from "../game/ui/components/JournalPanel";
import { KnowledgeState } from "../game/ideas/components/KnowledgeState";
import { MudWorld } from "../game/mud/components/MudWorld";
import { MudWorldBridge } from "../game/mud/MudWorldBridge";
import type { PlayerSnapshot } from "../game/mud/MudWorldTypes";
import { NeedState } from "../game/needs/components/NeedState";
import { PlantStatusPanel } from "../game/ui/components/PlantStatusPanel";
import { MovementState } from "../game/player/components/MovementState";
import { PlayerInventory } from "../game/inventory/components/PlayerInventory";
import { PlayerControlled } from "../game/player/components/PlayerControlled";
import { plantDefinitions } from "../game/plants/PlantDefinitions";
import { seedWorldTrees } from "../game/plants/WorldTreeGeneration";
import { Position } from "../game/shared/components/Position";
import { Renderable } from "../game/shared/components/Renderable";
import { ActionProgressBar } from "../game/ui/components/ActionProgressBar";
import { SeedDrop } from "../game/plants/components/SeedDrop";
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
import { WeightInspectable } from "../game/shared/components/WeightInspectable";
import { WeightedObject } from "../game/shared/components/WeightedObject";
import { plantSpriteTextureKey } from "../game/plants/PlantSpriteAssets";
import {
  getPlayerSpriteAsset,
  playerSpriteTextureKey,
} from "../game/player/PlayerSpriteAssets";

export const tileSize = 256;
export const gridWidth = 200;
export const gridHeight = 200;
export const initialWorldStateHydrationRadius = 32;

const worldWidth = gridWidth * tileSize;
const worldHeight = gridHeight * tileSize;
const seedDropWeight = 0.02;
const terrainLayerDepthBase = 2;
const terrainLayerDepthStep = 0.1;

export class MainGameScene extends Phaser.Scene {
  private world?: World;
  private initialMudBridge?: MudWorldBridge;
  private initialMudSnapshot?: PlayerSnapshot;

  constructor() {
    super("main-game");
  }

  init(data: MainGameSceneData): void {
    this.initialMudBridge = data.mudBridge;
    this.initialMudSnapshot = data.initialMudSnapshot;
  }

  preload(): void {
    for (const atlas of Object.values(terrainAtlasAssets)) {
      this.load.image(terrainAtlasTextureKey(atlas.id), atlas.imageUrl);

      if (atlas.centerVariantsUrl) {
        this.load.image(
          terrainCenterVariantTextureKey(atlas.id),
          atlas.centerVariantsUrl,
        );
      }
    }

    for (const [plantId, asset] of Object.entries(objectSpriteAssets)) {
      this.load.spritesheet(plantSpriteTextureKey(plantId), asset.imageUrl, {
        frameWidth: asset.manifest.cellSize,
        frameHeight: asset.manifest.cellSize,
      });
    }
  }

  create(): void {
    const biome = getActiveBiome();
    const backgroundTerrainDefinition = getBiomeTerrain(
      biome,
      biome.backgroundTerrainId,
    );
    const digTerrainDefinition = getBiomeTerrain(biome, biome.digTerrainId);
    const world = new World();
    const baseTerrain = world.createEntity();
    const backgroundTerrain = world.createEntity();
    const diggingTerrain = world.createEntity();
    const mudWorld = world.createEntity();
    const time = world.createEntity();
    const dayNight = world.createEntity();
    const sleepHud = world.createEntity();
    const journal = world.createEntity();
    const handHud = world.createEntity();
    const inventoryHud = world.createEntity();
    const targetActionMenu = world.createEntity();
    const bankPanel = world.createEntity();
    const plantStatusPanel = world.createEntity();
    const minimap = world.createEntity();
    const player = world.createEntity();
    const baseGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const dirtGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const spawnX = worldWidth / 2;
    const spawnY = worldHeight / 2;
    const playerSprite = this.createPlayerSprite(spawnX, spawnY);
    const actionProgressBar = this.createActionProgressBar();
    const energyBar = this.createEnergyBar();
    const currencyDisplay = this.createCurrencyDisplay();
    const dayNightOverlay = this.createDayNightOverlay();
    const sleepProgressBar = this.createSleepProgressBar();
    const sleepVisual = this.createSleepVisual();
    const journalPanel = this.createJournalPanel();
    const handHudDisplay = this.createHandHud();
    const inventoryHudDisplay = this.createInventoryHud();
    const targetActionMenuDisplay = this.createTargetActionMenu();
    const bankPanelDisplay = this.createBankPanel();
    const plantStatusPanelDisplay = this.createPlantStatusPanel();
    const weightLabel = this.createWeightLabel();
    const needs = new NeedState();
    const freeExplore = isFreeExploreMode();

    needs.addNeed({
      id: "carry_more",
      label: "Carry more things",
      description:
        "Two hands are not enough. Something wearable or tied together might help.",
      urgency: 65,
      active: false,
    });

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(freeExplore ? 0.37 : 0.7);
    this.cameras.main.startFollow(playerSprite, true, 0.12, 0.12);

    world.addComponent(baseTerrain, TerrainGrid, baseGrid);
    world.addComponent(
      baseTerrain,
      TerrainBaseLayer,
      new TerrainBaseLayer(
        this.add.graphics().setDepth(0),
        biome.baseLayer.baseColor,
        biome.baseLayer.variantColor,
        biome.baseLayer.shadowColor,
      ),
    );

    world.addComponent(backgroundTerrain, TerrainGrid, baseGrid);
    world.addComponent(
      backgroundTerrain,
      TerrainBackground,
      new TerrainBackground(
        this.add.container(0, 0).setDepth(1),
        biome.terrains.map((terrain) => terrain.texturePrefix),
        backgroundTerrainDefinition.texturePrefix,
      ),
    );

    for (const terrainDefinition of biome.terrains) {
      const atlasWarmupTerrain = world.createEntity();
      const warmupGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
      const terrainAtlas = getTerrainAtlasAsset(terrainDefinition.atlasId);

      world.addComponent(atlasWarmupTerrain, TerrainGrid, warmupGrid);
      world.addComponent(
        atlasWarmupTerrain,
        AutotileLayer,
        new AutotileLayer(
          this.add.container(0, 0).setDepth(-1),
          terrainAtlasTextureKey(terrainAtlas.id),
          terrainDefinition.texturePrefix,
          blobAtlasCellSize,
          terrainAtlas.centerVariantsUrl
            ? terrainCenterVariantTextureKey(terrainAtlas.id)
            : undefined,
        ),
      );
    }

    const visibleTerrainDefinitions = biome.terrains
      .filter((terrain) => terrain.placement.kind !== "background")
      .sort((a, b) => a.stackOrder - b.stackOrder);
    const digTerrainOverlayStackOrder =
      Math.max(
        ...visibleTerrainDefinitions.map((terrain) => terrain.stackOrder),
      ) + 1;
    const terrainGrids = new Map<string, TerrainGrid>();
    const spawnTileX = Math.floor(spawnX / tileSize);
    const spawnTileY = Math.floor(spawnY / tileSize);
    const surfacePlan =
      biome.id === "uniswap"
        ? createBiomeSurfacePlan(baseGrid, biome, spawnTileX, spawnTileY)
        : undefined;
    const minimapDisplay = this.createBiomeMinimap(biome, surfacePlan);

    visibleTerrainDefinitions.forEach((terrainDefinition) => {
      if (terrainDefinition.placement.kind === "background") {
        return;
      }

      const terrain = world.createEntity();
      const terrainAtlas = getTerrainAtlasAsset(terrainDefinition.atlasId);
      const terrainGrid =
        terrainDefinition.id === digTerrainDefinition.id
          ? dirtGrid
          : new TerrainGrid(gridWidth, gridHeight, tileSize);
      const isDigTerrain = terrainDefinition.id === digTerrainDefinition.id;
      const stackOrder = isDigTerrain
        ? digTerrainOverlayStackOrder
        : terrainDefinition.stackOrder;

      seedBiomeTerrainGrid(
        terrainGrid,
        biome,
        terrainDefinition,
        spawnTileX,
        spawnTileY,
        surfacePlan,
      );
      terrainGrids.set(terrainDefinition.id, terrainGrid);
      world.addComponent(terrain, TerrainGrid, terrainGrid);
      world.addComponent(
        terrain,
        TerrainLayer,
        new TerrainLayer(terrainDefinition.id, stackOrder),
      );
      world.addComponent(
        terrain,
        AutotileLayer,
        new AutotileLayer(
          this.add
            .container(0, 0)
            .setDepth(
              terrainLayerDepthBase + stackOrder * terrainLayerDepthStep,
            ),
          terrainAtlasTextureKey(terrainAtlas.id),
          terrainDefinition.texturePrefix,
          blobAtlasCellSize,
          terrainAtlas.centerVariantsUrl
            ? terrainCenterVariantTextureKey(terrainAtlas.id)
            : undefined,
        ),
      );
    });
    world.addComponent(diggingTerrain, TerrainHardness, new TerrainHardness());
    world.addComponent(diggingTerrain, TerrainDigDepth, new TerrainDigDepth());
    const mudBridge = this.initialMudBridge ?? MudWorldBridge.fromEnv();
    const initialMudSnapshot = this.initialMudSnapshot;

    this.initialMudBridge = undefined;
    this.initialMudSnapshot = undefined;

    world.addComponent(mudWorld, MudWorld, new MudWorld(mudBridge));

    world.addComponent(time, GameClock, new GameClock());
    world.addComponent(dayNight, DayNightOverlay, dayNightOverlay);
    world.addComponent(sleepHud, SleepProgressBar, sleepProgressBar);
    world.addComponent(journal, JournalPanel, journalPanel);
    world.addComponent(handHud, HandHud, handHudDisplay);
    world.addComponent(inventoryHud, InventoryHud, inventoryHudDisplay);
    world.addComponent(
      targetActionMenu,
      TargetActionMenu,
      targetActionMenuDisplay,
    );
    world.addComponent(bankPanel, BankPanel, bankPanelDisplay);
    world.addComponent(
      plantStatusPanel,
      PlantStatusPanel,
      plantStatusPanelDisplay,
    );
    world.addComponent(minimap, BiomeMinimap, minimapDisplay);

    world.addComponent(player, PlayerControlled, new PlayerControlled());
    world.addComponent(player, InputState, new InputState());
    world.addComponent(player, MovementState, new MovementState());
    world.addComponent(player, FacingDirection, new FacingDirection(0, 1));
    world.addComponent(player, FocusTarget, new FocusTarget());
    world.addComponent(player, Position, new Position(spawnX, spawnY));
    world.addComponent(
      player,
      Velocity,
      new Velocity(0, 0, tileSize * (freeExplore ? 7 : 2.5)),
    );
    world.addComponent(player, Energy, new Energy(100, 100, 0));
    if (freeExplore) {
      world.addComponent(player, FreeExploreMode, new FreeExploreMode());
    }
    world.addComponent(player, Hands, new Hands());
    world.addComponent(player, PlayerInventory, new PlayerInventory(2));
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
        [Phaser.Input.Keyboard.KeyCodes.Z]: "sleep",
        [Phaser.Input.Keyboard.KeyCodes.T]: "reflect",
        [Phaser.Input.Keyboard.KeyCodes.ENTER]: "bank-open",
        [Phaser.Input.Keyboard.KeyCodes.ONE]: "inventory-grab",
        [Phaser.Input.Keyboard.KeyCodes.X]: "inventory-drop",
      }),
    );
    world.addComponent(player, ActionLog, new ActionLog());
    world.addComponent(player, EnergyBar, energyBar);
    world.addComponent(player, CucBalance, new CucBalance());
    world.addComponent(player, CurrencyDisplay, currencyDisplay);
    world.addComponent(player, Renderable, new Renderable(playerSprite));
    world.addComponent(player, SleepVisual, sleepVisual);
    world.addComponent(
      player,
      GridTargetHighlight,
      new GridTargetHighlight(this.add.graphics().setDepth(9)),
    );

    if (shouldSpawnSeedTestRow()) {
      spawnSeedTestRow(world, baseGrid, spawnX, spawnY);
    }

    seedWorldTrees(world, baseGrid, dirtGrid, {
      seed: biome.worldGeneration.seed,
      spawnTileX,
      spawnTileY,
      spawnClearingRadius: biome.worldGeneration.spawnClearingRadius,
      treePlantIds: biome.worldGeneration.treePlantIds,
      biome,
      terrainGrids,
      surfacePlan,
    });
    seedBiomeObjects(world, baseGrid, biome, {
      spawnTileX,
      spawnTileY,
      terrainGrids,
      surfacePlan,
    });

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
      biome,
      initialMudSnapshot,
    );

    world.update(0);
    this.world = world;
  }

  update(_time: number, delta: number): void {
    this.world?.update(delta / 1000);
  }

  private createPlayerSprite(
    x: number,
    y: number,
  ): Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform {
    const spriteAsset = getPlayerSpriteAsset();

    if (spriteAsset) {
      return this.add
        .sprite(x, y, playerSpriteTextureKey())
        .setOrigin(0.5, 1)
        .setDepth(10)
        .setDisplaySize(
          spriteAsset.manifest.cellSize,
          spriteAsset.manifest.cellSize,
        );
    }

    return this.add
      .circle(x, y, 34, 0xf2c15f)
      .setDepth(10)
      .setStrokeStyle(5, 0x3a2514, 0.95);
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

  private createCurrencyDisplay(): CurrencyDisplay {
    const width = 190;
    const height = 34;
    const x = 18;
    const y = 92;
    const background = this.add
      .rectangle(x, y, width, height, 0x101821, 0.9)
      .setOrigin(0)
      .setDepth(101)
      .setStrokeStyle(2, 0xf1d38b, 0.72);
    const label = this.add
      .text(x + 14, y + 8, "0 CUC", {
        color: "#f6efd7",
        fixedWidth: width - 28,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "15px",
        fontStyle: "700",
      })
      .setOrigin(0)
      .setDepth(102);

    return new CurrencyDisplay(background, label, width, height, x, y);
  }

  private createBiomeMinimap(
    biome: BiomeDefinition,
    surfacePlan: BiomeSurfacePlan | undefined,
  ): BiomeMinimap {
    const width = 184;
    const height = 184;
    const legendWidth = 132;
    const x = this.scale.width - width - legendWidth - 18;
    const y = 18;
    const container = this.add.container(0, 0).setDepth(103);
    const background = this.add
      .rectangle(
        -10,
        -10,
        width + legendWidth + 20,
        height + 20,
        0x101821,
        0.78,
      )
      .setOrigin(0)
      .setStrokeStyle(2, 0xe8f0e8, 0.45);
    const terrainLayer = this.add.graphics();
    const regionLayer = this.add.graphics();
    const overlayLayer = this.add.graphics();
    const labelLayer = this.add.container(0, 0);

    container.add([
      background,
      terrainLayer,
      regionLayer,
      overlayLayer,
      labelLayer,
    ]);

    return new BiomeMinimap(
      container,
      background,
      terrainLayer,
      regionLayer,
      overlayLayer,
      labelLayer,
      biome,
      surfacePlan,
      width,
      height,
      x,
      y,
    );
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

  private createInventoryHud(): InventoryHud {
    const container = this.add.container(18, 248).setDepth(101);
    const title = this.add
      .text(0, 0, "", {
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
      .setOrigin(0, 0);

    container.add(title);

    return new InventoryHud(container, title, 18, 248);
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

  private createBankPanel(): BankPanel {
    const width = 620;
    const height = 590;
    const container = this.add.container(0, 0).setDepth(114).setVisible(false);
    const background = this.add
      .rectangle(0, 0, width, height, 0x101821, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xf1d38b, 0.78);
    const title = this.add
      .text(22, 18, "Central Uni Bank", {
        color: "#f6efd7",
        fixedWidth: width - 92,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "22px",
        fontStyle: "700",
      })
      .setOrigin(0, 0);
    const closeButton = this.add
      .text(width - 54, 18, "X", {
        align: "center",
        color: "#101820",
        fixedWidth: 32,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "16px",
        fontStyle: "700",
        backgroundColor: "#f1d38b",
        padding: { x: 4, y: 4 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    const sellTab = this.add
      .rectangle(22, 64, 126, 34, 0xf1d38b, 1)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    const sellTabLabel = this.add
      .text(22, 73, "Sell", {
        align: "center",
        color: "#101820",
        fixedWidth: 126,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px",
        fontStyle: "700",
      })
      .setOrigin(0, 0);
    const buyTab = this.add
      .rectangle(156, 64, 126, 34, 0x1a2a32, 0.92)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    const buyTabLabel = this.add
      .text(156, 73, "Buy", {
        align: "center",
        color: "#dce8e2",
        fixedWidth: 126,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px",
        fontStyle: "700",
      })
      .setOrigin(0, 0);
    const status = this.add
      .text(304, 68, "", {
        color: "#b9c9c8",
        fixedWidth: width - 326,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "12px",
      })
      .setOrigin(0, 0);
    const panel = new BankPanel(
      container,
      background,
      title,
      closeButton,
      sellTab,
      sellTabLabel,
      buyTab,
      buyTabLabel,
      status,
      width,
      height,
    );

    closeButton.on("pointerdown", () => {
      panel.visible = false;
    });
    sellTab.on("pointerdown", () => {
      panel.activeTab = "sell";
      panel.signature = "";
    });
    buyTab.on("pointerdown", () => {
      panel.activeTab = "buy";
      panel.signature = "";
    });

    container.add([
      background,
      title,
      closeButton,
      sellTab,
      sellTabLabel,
      buyTab,
      buyTabLabel,
      status,
    ]);

    return panel;
  }

  private createPlantStatusPanel(): PlantStatusPanel {
    const width = 316;
    const height = 276;
    const x = this.scale.width - width - 18;
    const y = 226;
    const container = this.add.container(0, 0).setDepth(104).setVisible(false);
    const background = this.add
      .rectangle(0, 0, width, height, 0x101821, 0.88)
      .setOrigin(0)
      .setStrokeStyle(2, 0x8bd6a0, 0.62);
    const title = this.add
      .text(16, 14, "", {
        color: "#f6efd7",
        fixedWidth: width - 32,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "17px",
        fontStyle: "700",
      })
      .setOrigin(0);
    const body = this.add
      .text(16, 46, "", {
        color: "#dce8e2",
        fixedWidth: width - 32,
        fixedHeight: height - 60,
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "13px",
        lineSpacing: 4,
        wordWrap: { width: width - 32 },
      })
      .setOrigin(0);

    container.add([background, title, body]);

    return new PlantStatusPanel(
      container,
      background,
      title,
      body,
      width,
      height,
      x,
      y,
    );
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

type MainGameSceneData = {
  mudBridge?: MudWorldBridge;
  initialMudSnapshot?: PlayerSnapshot;
};

function shouldSpawnSeedTestRow(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const value = params.get("seedTest") ?? params.get("testSeeds");

  return value === "1" || value === "true" || value === "on";
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

function spawnSeedTestRow(
  world: World,
  grid: TerrainGrid,
  spawnX: number,
  spawnY: number,
): void {
  const definitions = Object.values(plantDefinitions);
  const totalDrops = definitions.length * 2;
  const startTileX =
    Math.floor(spawnX / grid.tileSize) - Math.floor(totalDrops / 2);
  const tileY = Math.floor(spawnY / grid.tileSize) + 2;

  definitions.forEach((definition, definitionIndex) => {
    for (let copyIndex = 0; copyIndex < 2; copyIndex += 1) {
      const tileX = startTileX + definitionIndex * 2 + copyIndex;
      const drop = world.createEntity();

      world.addComponent(
        drop,
        Position,
        new Position(
          tileX * grid.tileSize + grid.tileSize / 2,
          tileY * grid.tileSize + grid.tileSize / 2,
        ),
      );
      world.addComponent(drop, SeedDrop, new SeedDrop(definition.seedId, 1));
      world.addComponent(
        drop,
        ItemUseConstraints,
        new ItemUseConstraints("dirt"),
      );
      world.addComponent(drop, Grabbable, new Grabbable());
      world.addComponent(
        drop,
        WeightedObject,
        new WeightedObject(seedDropWeight),
      );
      world.addComponent(drop, Footprint, new Footprint(54, 54));
      world.addComponent(
        drop,
        WeightInspectable,
        new WeightInspectable(definition.seedLabel),
      );
    }
  });
}
