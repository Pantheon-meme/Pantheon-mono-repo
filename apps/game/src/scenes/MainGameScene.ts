import Phaser from "phaser";
import {
  getTerrainAtlasAsset,
  terrainAtlasAssets,
  terrainCenterVariantTextureKey,
  terrainAtlasTextureKey,
} from "../assets/autotiles/TerrainAtlasAssets";
import { objectSpriteAssets } from "../assets/object-sprites/ObjectSpriteAssets";
import {
  minimapFrameAsset,
  minimapFrameSlices,
  minimapFrameTextureKey,
} from "../assets/ui/UiFrameAssets";
import {
  energyBarBarAsset,
  energyBarBarTextureKey,
  energyBarFillerSlices,
  energyBarFillerTextureKey,
  energyBarIconAsset,
  energyBarIconTextureKey,
  inventoryDividerAsset,
  inventoryDividerTextureKey,
  inventoryPanelAsset,
  inventoryPanelSlices,
  inventoryPanelTextureKey,
  inventorySlotAsset,
  inventorySlotHoverAsset,
  inventorySlotHoverTextureKey,
  inventorySlotSelectedAsset,
  inventorySlotSelectedTextureKey,
  inventorySlotTextureKey,
  joystickPlainAsset,
  joystickPlainTextureKey,
  joystickControlTextureKey,
  playerMarkerAsset,
  playerMarkerTextureKey,
  uiImageAssets,
} from "../assets/ui/UiImageAssets";
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
import { ActionToastStack } from "../game/ui/components/ActionToastStack";
import { AutotileLayer } from "../game/terrain/components/AutotileLayer";
import {
  DayNightOverlay,
  type HudSystemButtonId,
} from "../game/ui/components/DayNightOverlay";
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
import { Hands } from "../game/player/components/Hands";
import { IdeaState } from "../game/ideas/components/IdeaState";
import { GridTargetHighlight } from "../game/terrain/components/GridTargetHighlight";
import { InputState } from "../game/player/components/InputState";
import { ItemUseConstraints } from "../game/shared/components/ItemUseConstraints";
import { JournalPanel } from "../game/ui/components/JournalPanel";
import { KnowledgeState } from "../game/ideas/components/KnowledgeState";
import { MudWorld } from "../game/mud/components/MudWorld";
import { MudWorldBridge } from "../game/mud/MudWorldBridge";
import { NeedState } from "../game/needs/components/NeedState";
import { MovementState } from "../game/player/components/MovementState";
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
import {
  hudColors,
  hudFontFamily,
  hudShadow,
} from "../game/ui/HudTheme";
import { ToolInventoryHud, type HudSlot } from "../game/ui/components/ToolInventoryHud";
import { TerrainBackground } from "../game/terrain/components/TerrainBackground";
import { TerrainBaseLayer } from "../game/terrain/components/TerrainBaseLayer";
import { TerrainDigDepth } from "../game/terrain/components/TerrainDigDepth";
import { TerrainGrid } from "../game/terrain/components/TerrainGrid";
import { TerrainHardness } from "../game/terrain/components/TerrainHardness";
import { TerrainLayer } from "../game/terrain/components/TerrainLayer";
import { Velocity } from "../game/shared/components/Velocity";
import { WeightInspectable } from "../game/shared/components/WeightInspectable";
import { WeightedObject } from "../game/shared/components/WeightedObject";
import { VirtualJoystick } from "../game/ui/components/VirtualJoystick";
import { plantSpriteTextureKey } from "../game/plants/PlantSpriteAssets";
import {
  getPlayerSpriteAsset,
  playerSpriteTextureKey,
} from "../game/player/PlayerSpriteAssets";

const tileSize = 256;
const gridWidth = 200;
const gridHeight = 200;
const worldWidth = gridWidth * tileSize;
const worldHeight = gridHeight * tileSize;
const seedDropWeight = 0.02;
const terrainLayerDepthBase = 2;
const terrainLayerDepthStep = 0.1;
const inventoryHudDisplayScale = 0.72;
const inventoryHudPanelPadding = 16;
const inventoryHudSlotGap = 16;
const inventoryHudScreenYFromBottom = 126;

export class MainGameScene extends Phaser.Scene {
  private world?: World;

  constructor() {
    super("main-game");
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

    this.load.image(minimapFrameTextureKey, minimapFrameAsset.imageUrl);

    for (const asset of uiImageAssets) {
      this.load.image(asset.textureKey, asset.imageUrl);
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
    const actionToasts = world.createEntity();
    const toolInventoryHud = world.createEntity();
    const targetActionMenu = world.createEntity();
    const minimap = world.createEntity();
    const virtualJoystick = world.createEntity();
    const player = world.createEntity();
    const baseGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const dirtGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const spawnX = worldWidth / 2;
    const spawnY = worldHeight / 2;
    const playerSprite = this.createPlayerSprite(spawnX, spawnY);
    const actionProgressBar = this.createActionProgressBar();
    const energyBar = this.createEnergyBar();
    const dayNightOverlay = this.createDayNightOverlay();
    const sleepProgressBar = this.createSleepProgressBar();
    const sleepVisual = this.createSleepVisual();
    const journalPanel = this.createJournalPanel();
    const actionToastDisplay = this.createActionToastStack();
    const toolInventoryDisplay = this.createToolInventoryHud();
    const targetActionMenuDisplay = this.createTargetActionMenu();
    const virtualJoystickDisplay = this.createVirtualJoystick();
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
    const terrainGrids = new Map<string, TerrainGrid>();
    const spawnTileX = Math.floor(spawnX / tileSize);
    const spawnTileY = Math.floor(spawnY / tileSize);
    const surfacePlan =
      biome.id === "uniswap"
        ? createBiomeSurfacePlan(baseGrid, biome, spawnTileX, spawnTileY)
        : undefined;
    const minimapDisplay = this.createBiomeMinimap(biome, surfacePlan);

    visibleTerrainDefinitions.forEach((terrainDefinition, terrainIndex) => {
      if (terrainDefinition.placement.kind === "background") {
        return;
      }

      const terrain = world.createEntity();
      const terrainAtlas = getTerrainAtlasAsset(terrainDefinition.atlasId);
      const terrainGrid =
        terrainDefinition.id === digTerrainDefinition.id
          ? dirtGrid
          : new TerrainGrid(gridWidth, gridHeight, tileSize);

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
        new TerrainLayer(terrainDefinition.id, terrainDefinition.stackOrder),
      );
      world.addComponent(
        terrain,
        AutotileLayer,
        new AutotileLayer(
          this.add
            .container(0, 0)
            .setDepth(
              terrainLayerDepthBase + terrainIndex * terrainLayerDepthStep,
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
    world.addComponent(mudWorld, MudWorld, new MudWorld(MudWorldBridge.fromEnv()));

    world.addComponent(time, GameClock, new GameClock());
    world.addComponent(dayNight, DayNightOverlay, dayNightOverlay);
    world.addComponent(sleepHud, SleepProgressBar, sleepProgressBar);
    world.addComponent(journal, JournalPanel, journalPanel);
    world.addComponent(actionToasts, ActionToastStack, actionToastDisplay);
    world.addComponent(
      toolInventoryHud,
      ToolInventoryHud,
      toolInventoryDisplay,
    );
    world.addComponent(
      targetActionMenu,
      TargetActionMenu,
      targetActionMenuDisplay,
    );
    world.addComponent(minimap, BiomeMinimap, minimapDisplay);
    world.addComponent(virtualJoystick, VirtualJoystick, virtualJoystickDisplay);

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
    );

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
        .setDisplaySize(spriteAsset.manifest.cellSize, spriteAsset.manifest.cellSize);
    }

    return this.add
      .circle(x, y, 34, 0xf2c15f)
      .setDepth(10)
      .setStrokeStyle(5, 0x3a2514, 0.95);
  }

  private createEnergyBar(): EnergyBar {
    const width = energyBarBarAsset.width;
    const height = energyBarBarAsset.height;
    const iconWidth = energyBarIconAsset.width;
    const iconHeight = energyBarIconAsset.height;
    const barX = Math.round(iconWidth * 0.5);
    const barY = Math.round((iconHeight - height) * 0.5);
    const visualWidth = barX + width;
    const visualHeight = iconHeight;
    const x = 14;
    const y = 12;
    const container = this.add.container(0, 0).setDepth(101);
    const background = this.add
      .image(barX, barY, energyBarBarTextureKey)
      .setOrigin(0);
    const fill = this.add
      .nineslice(
        barX,
        barY,
        energyBarFillerTextureKey,
        undefined,
        width,
        height,
        energyBarFillerSlices.left,
        energyBarFillerSlices.right,
      )
      .setOrigin(0);
    const icon = this.add
      .image(iconWidth * 0.5, iconHeight * 0.5, energyBarIconTextureKey)
      .setDisplaySize(iconWidth, iconHeight)
      .setOrigin(0.5);
    const value = this.add
      .text(barX + width * 0.5, barY + height * 0.5 - 1, "", {
        align: "center",
        color: "#fffbed",
        fixedWidth: 180,
        fontFamily: hudFontFamily,
        fontSize: "22px",
        fontStyle: "800",
        shadow: {
          color: "#261806",
          blur: 2,
          fill: true,
          offsetX: 1,
          offsetY: 2,
        },
        stroke: "#4b3214",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    const region = this.add
      .text(barX + 10, visualHeight + 4, "", {
        color: hudColors.textSoft,
        fontFamily: hudFontFamily,
        fontSize: "13px",
        shadow: hudShadow(),
      })
      .setOrigin(0);

    container.add([
      background,
      fill,
      value,
      icon,
      region,
    ]);

    return new EnergyBar(
      container,
      background,
      fill,
      icon,
      value,
      region,
      width,
      height,
      visualWidth,
      visualHeight,
      x,
      y,
    );
  }

  private createBiomeMinimap(
    biome: BiomeDefinition,
    surfacePlan: BiomeSurfacePlan | undefined,
  ): BiomeMinimap {
    const width = 184;
    const height = 184;
    const displayScale = 0.54;
    const x = 18;
    const y = 18;
    const frameWidth =
      width + minimapFrameSlices.left + minimapFrameSlices.right;
    const frameHeight =
      height + minimapFrameSlices.top + minimapFrameSlices.bottom;
    const container = this.add.container(0, 0).setDepth(103);
    const background = this.add
      .nineslice(
        -minimapFrameSlices.left,
        -minimapFrameSlices.top,
        minimapFrameTextureKey,
        undefined,
        frameWidth,
        frameHeight,
        minimapFrameSlices.left,
        minimapFrameSlices.right,
        minimapFrameSlices.top,
        minimapFrameSlices.bottom,
      )
      .setOrigin(0);
    const terrainLayer = this.add.graphics();
    const regionLayer = this.add.graphics();
    const overlayLayer = this.add.graphics();
    const markerWidth = 40;
    const playerMarker = this.add
      .image(0, 0, playerMarkerTextureKey)
      .setOrigin(0.5)
      .setDisplaySize(
        markerWidth,
        markerWidth * (playerMarkerAsset.height / playerMarkerAsset.width),
      )
      .setVisible(false);

    container.add([
      terrainLayer,
      regionLayer,
      overlayLayer,
      playerMarker,
      background,
    ]);

    const minimap = new BiomeMinimap(
      container,
      background,
      terrainLayer,
      regionLayer,
      overlayLayer,
      playerMarker,
      biome,
      surfacePlan,
      width,
      height,
      displayScale,
      x,
      y,
    );

    background.setInteractive();
    background.on("pointerover", () => {
      minimap.hovered = true;
    });
    background.on("pointerout", () => {
      minimap.hovered = false;
    });

    return minimap;
  }

  private createActionProgressBar(): ActionProgressBar {
    const width = 168;
    const height = 10;
    const container = this.add.container(0, 0).setDepth(106).setVisible(false);
    const panel = this.add
      .rectangle(0, 0, width + 42, 52, hudColors.panelDark, 0.88)
      .setOrigin(0.5)
      .setStrokeStyle(1, hudColors.borderWarm, 0.72);
    const track = this.add
      .rectangle(-width / 2, 10, width, height, hudColors.trackDark, 0.96)
      .setOrigin(0)
      .setStrokeStyle(1, 0x6f8f88, 0.5);
    const fill = this.add
      .rectangle(-width / 2, 10, 0, height, hudColors.progress, 1)
      .setOrigin(0);
    const iconFrame = this.add
      .circle(-width / 2 - 14, 0, 15, hudColors.panelWarm, 0.96)
      .setStrokeStyle(1, hudColors.borderWarm, 0.62);
    const icon = this.add
      .text(-width / 2 - 14, 0, ">", {
        align: "center",
        color: hudColors.textWarm,
        fixedWidth: 28,
        fontFamily: hudFontFamily,
        fontSize: "13px",
        fontStyle: "700",
      })
      .setOrigin(0.5);
    const label = this.add
      .text(-width / 2 + 2, -8, "", {
        color: hudColors.textWarm,
        fixedWidth: width - 48,
        fontFamily: hudFontFamily,
        fontSize: "14px",
        fontStyle: "700",
        shadow: hudShadow(),
      })
      .setOrigin(0, 0.5);
    const detail = this.add
      .text(width / 2, -8, "", {
        align: "right",
        color: hudColors.textSoft,
        fixedWidth: 44,
        fontFamily: hudFontFamily,
        fontSize: "12px",
        fontStyle: "700",
        shadow: hudShadow(),
      })
      .setOrigin(1, 0.5);

    container.add([panel, track, fill, iconFrame, icon, label, detail]);

    return new ActionProgressBar(
      container,
      panel,
      track,
      fill,
      iconFrame,
      icon,
      label,
      detail,
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
    const panel = this.add
      .rectangle(0, 0, 172, 70, hudColors.panelDark, 0.86)
      .setOrigin(0)
      .setDepth(101)
      .setStrokeStyle(1, hudColors.border, 0.48);
    const label = this.add
      .text(0, 0, "", {
        align: "right",
        color: hudColors.textWarm,
        fontFamily: hudFontFamily,
        fontSize: "15px",
        fontStyle: "700",
        shadow: hudShadow(),
      })
      .setOrigin(0)
      .setDepth(101);
    const phase = this.add
      .text(0, 0, "", {
        align: "right",
        color: hudColors.textSoft,
        fixedWidth: 94,
        fontFamily: hudFontFamily,
        fontSize: "12px",
        fontStyle: "700",
        shadow: hudShadow(),
      })
      .setOrigin(1, 0.5)
      .setDepth(101);
    const buttons = [
      this.createSystemButton("journal", "J"),
      this.createSystemButton("map", "M"),
      this.createSystemButton("settings", "S"),
    ];

    return new DayNightOverlay(shade, panel, label, phase, buttons, 18, 18);
  }

  private createSystemButton(id: HudSystemButtonId, labelText: string) {
    const background = this.add
      .rectangle(0, 0, 28, 26, hudColors.panel, 0.9)
      .setOrigin(0.5)
      .setDepth(102)
      .setStrokeStyle(1, hudColors.border, 0.45)
      .setInteractive({ useHandCursor: true });
    const label = this.add
      .text(0, 0, labelText, {
        align: "center",
        color: hudColors.textWarm,
        fixedWidth: 26,
        fontFamily: hudFontFamily,
        fontSize: "12px",
        fontStyle: "700",
      })
      .setOrigin(0.5)
      .setDepth(103);
    const button = { id, background, label, pendingClick: false };

    background.on("pointerover", () => {
      background.setFillStyle(0x314556, 0.98);
    });
    background.on("pointerout", () => {
      background.setFillStyle(hudColors.panel, 0.9);
    });
    background.on("pointerdown", () => {
      button.pendingClick = true;
    });

    return button;
  }

  private createSleepProgressBar(): SleepProgressBar {
    const width = 360;
    const height = 18;
    const x = 18;
    const y = 244;
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

  private createActionToastStack(): ActionToastStack {
    return new ActionToastStack(this.add.container(0, 0).setDepth(104), 18, 94, 360);
  }

  private createToolInventoryHud(): ToolInventoryHud {
    const slotDefinitions: Array<{ id: string; kind: "tool" | "item" }> = [
      { id: "tool:hands", kind: "tool" },
      { id: "item:left", kind: "item" },
      { id: "item:right", kind: "item" },
    ];
    const hasDivider = slotDefinitions.some((slot) => slot.kind === "tool") &&
      slotDefinitions.some((slot) => slot.kind === "item");
    const contentWidth =
      inventoryHudPanelPadding * 2 +
      slotDefinitions.length * inventorySlotAsset.width +
      Math.max(0, slotDefinitions.length - 1) * inventoryHudSlotGap +
      (hasDivider ? inventoryDividerAsset.width : 0);
    const width = Math.max(
      inventoryPanelSlices.left + inventoryPanelSlices.right + inventorySlotAsset.width,
      contentWidth,
    );
    const height = inventoryPanelAsset.height;
    const container = this.add.container(0, 0).setDepth(105);
    const background = this.add
      .nineslice(
        0,
        0,
        inventoryPanelTextureKey,
        undefined,
        width,
        height,
        inventoryPanelSlices.left,
        inventoryPanelSlices.right,
        inventoryPanelSlices.top,
        inventoryPanelSlices.bottom,
      )
      .setOrigin(0.5);
    const toolsLabel = this.add
      .text(0, 0, "", {
        color: hudColors.textSoft,
        fontFamily: hudFontFamily,
        fontSize: "1px",
      })
      .setVisible(false);
    const itemsLabel = this.add
      .text(0, 0, "", {
        color: hudColors.textSoft,
        fontFamily: hudFontFamily,
        fontSize: "1px",
      })
      .setVisible(false);
    const capacityLabel = this.add
      .text(0, 0, "", {
        color: hudColors.textSoft,
        fontFamily: hudFontFamily,
        fontSize: "1px",
      })
      .setVisible(false);
    const divider = this.add
      .image(0, 0, inventoryDividerTextureKey)
      .setDisplaySize(inventoryDividerAsset.width, inventoryDividerAsset.height)
      .setVisible(hasDivider);
    const slots: HudSlot[] = [];
    let cursorX = -width / 2 + inventoryHudPanelPadding;

    for (let index = 0; index < slotDefinitions.length; index += 1) {
      const definition = slotDefinitions[index];
      const previous = slotDefinitions[index - 1];

      if (previous) {
        if (hasDivider && previous.kind === "tool" && definition.kind === "item") {
          cursorX += inventoryHudSlotGap / 2;
          divider.setPosition(cursorX + inventoryDividerAsset.width / 2, 0);
          cursorX += inventoryDividerAsset.width + inventoryHudSlotGap / 2;
        } else {
          cursorX += inventoryHudSlotGap;
        }
      }

      slots.push(
        this.createHudSlot(
          definition.id,
          definition.kind,
          cursorX + inventorySlotAsset.width / 2,
          0,
        ),
      );
      cursorX += inventorySlotAsset.width;
    }

    const hud = new ToolInventoryHud(
      container,
      background,
      toolsLabel,
      itemsLabel,
      capacityLabel,
      divider,
      slots,
      inventoryHudScreenYFromBottom,
      width,
      inventoryHudDisplayScale,
    );

    for (const slot of slots) {
      slot.background.on("pointerdown", () => {
        hud.selectedSlotId = slot.id;
      });
      slot.background.on("pointerover", () => {
        slot.hovered = true;
        slot.hover.setVisible(true);
      });
      slot.background.on("pointerout", () => {
        slot.hovered = false;
        slot.hover.setVisible(false);
      });
    }

    container.add([
      background,
      toolsLabel,
      itemsLabel,
      capacityLabel,
      divider,
      ...slots.map((slot) => slot.container),
    ]);

    return hud;
  }

  private createHudSlot(
    id: string,
    kind: "tool" | "item",
    x: number,
    y: number,
  ): HudSlot {
    const container = this.add.container(x, y);
    const background = this.add
      .image(0, 0, inventorySlotTextureKey)
      .setDisplaySize(inventorySlotAsset.width, inventorySlotAsset.height)
      .setInteractive({ useHandCursor: true });
    const hover = this.add
      .image(0, 0, inventorySlotHoverTextureKey)
      .setAlpha(0.66)
      .setBlendMode(Phaser.BlendModes.HARD_LIGHT)
      .setDisplaySize(inventorySlotHoverAsset.width, inventorySlotHoverAsset.height)
      .setVisible(false);
    const selection = this.add
      .image(0, 0, inventorySlotSelectedTextureKey)
      .setDisplaySize(
        inventorySlotSelectedAsset.width,
        inventorySlotSelectedAsset.height,
      )
      .setVisible(false);
    const iconPlaceholder = this.createInventoryPlaceholderIcon();
    const iconSprite = this.add
      .sprite(0, 4, inventorySlotTextureKey)
      .setOrigin(0.5)
      .setVisible(false);
    const label = this.add
      .text(0, 0, "", {
        color: hudColors.text,
        fontFamily: hudFontFamily,
        fontSize: "1px",
      })
      .setVisible(false);
    const count = this.add
      .text(0, 0, "", {
        color: hudColors.textSoft,
        fontFamily: hudFontFamily,
        fontSize: "1px",
      })
      .setVisible(false);
    const shortcut = this.add
      .text(37, -40, "", {
        align: "right",
        color: "#3d2011",
        fixedWidth: 24,
        fontFamily: "Georgia, Times New Roman, serif",
        fontSize: "25px",
        fontStyle: "700",
        shadow: {
          color: "#ead2a2",
          blur: 1,
          fill: true,
          offsetX: 0,
          offsetY: 1,
        },
      })
      .setOrigin(1, 0.5);
    const lockOverlay = this.add
      .rectangle(0, 0, 76, 76, 0x020405, 0.42)
      .setOrigin(0.5)
      .setVisible(false);
    const pulse = this.add
      .rectangle(0, 0, 76, 76, hudColors.selected, 0.18)
      .setOrigin(0.5)
      .setVisible(false);

    container.add([
      background,
      hover,
      pulse,
      selection,
      iconPlaceholder,
      iconSprite,
      label,
      count,
      shortcut,
      lockOverlay,
    ]);

    return {
      id,
      kind,
      container,
      background,
      hover,
      selection,
      iconPlaceholder,
      iconSprite,
      label,
      count,
      shortcut,
      lockOverlay,
      pulse,
      hovered: false,
    };
  }

  private createInventoryPlaceholderIcon(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 5);
    const halo = this.add
      .circle(0, 0, 16, 0xf5dca1, 0.14)
      .setStrokeStyle(2, 0x8b5b2d, 0.38);
    const core = this.add
      .circle(0, 0, 7, 0xf8e8ba, 0.36)
      .setStrokeStyle(1, 0x5c351c, 0.28);

    container.add([halo, core]);

    return container;
  }

  private createWeightLabel(): Phaser.GameObjects.Text {
    return this.add
      .text(18, this.scale.height - 182, "", {
        color: hudColors.text,
        fontFamily: hudFontFamily,
        fontSize: "13px",
        shadow: hudShadow(),
      })
      .setScrollFactor(0)
      .setDepth(101);
  }

  private createTargetActionMenu(): TargetActionMenu {
    const container = this.add.container(0, 0).setDepth(104).setVisible(false);
    const background = this.add
      .rectangle(0, 0, 620, 80, hudColors.panelDark, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(2, hudColors.borderWarm, 0.58)
      .setVisible(false);
    const title = this.add
      .text(0, 0, "", {
        color: hudColors.textSoft,
        fixedWidth: 280,
        fontFamily: hudFontFamily,
        fontSize: "11px",
        fontStyle: "700",
      })
      .setOrigin(0)
      .setVisible(false);
    const content = this.add.container(0, 0);
    const leftIndicator = this.add
      .text(0, 0, "<", {
        align: "center",
        color: hudColors.textWarm,
        fixedWidth: 18,
        fontFamily: hudFontFamily,
        fontSize: "20px",
        fontStyle: "700",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const rightIndicator = this.add
      .text(0, 0, ">", {
        align: "center",
        color: hudColors.textWarm,
        fixedWidth: 18,
        fontFamily: hudFontFamily,
        fontSize: "20px",
        fontStyle: "700",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const menu = new TargetActionMenu(
      container,
      background,
      title,
      content,
      leftIndicator,
      rightIndicator,
      620,
      44,
    );

    leftIndicator.on("pointerdown", () => {
      menu.scrollX = Math.max(0, menu.scrollX - 192);
    });
    rightIndicator.on("pointerdown", () => {
      menu.scrollX = Math.min(menu.maxScrollX, menu.scrollX + 192);
    });

    container.add([background, title, content, leftIndicator, rightIndicator]);

    return menu;
  }

  private createVirtualJoystick(): VirtualJoystick {
    const radius = 92;
    const container = this.add.container(0, 0).setDepth(104).setAlpha(0.88);
    const joystickScale = (radius * 2) / joystickPlainAsset.width;
    const zone = this.add
      .zone(0, 0, radius * 2 + 20, radius * 2 + 20)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const base = this.add
      .image(0, 0, joystickPlainTextureKey)
      .setOrigin(0.5)
      .setScale(joystickScale)
      .setAlpha(0.9);
    const thumb = this.add
      .image(0, 0, joystickControlTextureKey)
      .setOrigin(0.5)
      .setScale(joystickScale)
      .setAlpha(0.94);
    const joystick = new VirtualJoystick(
      container,
      zone,
      base,
      thumb,
      radius,
      120,
      120,
    );

    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      joystick.active = true;
      joystick.pointerId = pointer.id;
    });
    zone.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === joystick.pointerId) {
        joystick.active = false;
      }
    });

    container.add([zone, base, thumb]);

    return joystick;
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
      world.addComponent(drop, WeightedObject, new WeightedObject(seedDropWeight));
      world.addComponent(drop, Footprint, new Footprint(54, 54));
      world.addComponent(
        drop,
        WeightInspectable,
        new WeightInspectable(definition.seedLabel),
      );
    }
  });
}
