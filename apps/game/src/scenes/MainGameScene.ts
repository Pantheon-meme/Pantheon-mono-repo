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
  actionProgressBarFillerAsset,
  actionProgressBarFillerSlices,
  actionProgressBarFillerTextureKey,
  actionProgressBarTrackAsset,
  actionProgressBarTrackTextureKey,
  actionProgressFinalStatusIconAsset,
  actionProgressFinalStatusIconTextureKey,
  actionProgressIconContainerAsset,
  actionProgressIconContainerTextureKey,
  dateTimeArtworkTextureKey,
  dateTimeHalfcircleFrameAsset,
  dateTimeHalfcircleFrameTextureKey,
  dateTimePanelSlices,
  dateTimePanelTextureKey,
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
  uiIconAssets,
  uiImageAssets,
  uiSystemButtonAssets,
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
import { BankPanel } from "../game/ui/components/BankPanel";
import { CucBalance } from "../game/currency/components/CucBalance";
import { CurrencyDisplay } from "../game/ui/components/CurrencyDisplay";
import {
  DayNightOverlay,
  type HudSystemButton,
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
import { PlayerAvatar } from "../game/player/components/PlayerAvatar";
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
import { hudColors, hudFontFamily, hudShadow } from "../game/ui/HudTheme";
import {
  ToolInventoryHud,
  type HudSlot,
} from "../game/ui/components/ToolInventoryHud";
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

export const tileSize = 256;
export const gridWidth = 200;
export const gridHeight = 200;
export const initialWorldStateHydrationRadius = 32;

const worldWidth = gridWidth * tileSize;
const worldHeight = gridHeight * tileSize;
const seedDropWeight = 0.02;
const terrainLayerDepthBase = 2;
const terrainLayerDepthStep = 0.1;
const inventoryHudDisplayScale = 0.72;
const inventoryHudPanelPadding = 16;
const inventoryHudSlotGap = 16;
const inventoryHudScreenYFromBottom = 126;
const energyBarScreenX = 14;
const energyBarScreenY = 12;
const actionToastScreenX = 18;
const actionToastScreenY = energyBarScreenY + energyBarIconAsset.height + 18;
const dateTimeHudDisplayScale = 0.44;
const dateTimeHudWidth = 560;
const dateTimeHudPanelY = 258;
const dateTimePanelHeight = 150;
const dateTimeHudHeight = dateTimeHudPanelY + dateTimePanelHeight;
const dateTimeArtworkDiameter = 394;
const dateTimePanelTextInset = 68;
const dateTimeFrameX =
  (dateTimeHudWidth - dateTimeHalfcircleFrameAsset.width) / 2;
const dateTimeArtworkCenterX = dateTimeHudWidth / 2;
const dateTimeArtworkCenterY = dateTimeHudPanelY;
const systemButtonWidth = 48;
const systemButtonHeight = 52;
const systemButtonGap = 8;
const systemButtonRowWidth = systemButtonWidth * 3 + systemButtonGap * 2;
const systemButtonGapY = 6;

export class MainGameScene extends Phaser.Scene {
  private world?: World;
  private initialMudBridge?: MudWorldBridge;
  private initialMudSnapshot?: PlayerSnapshot;
  private playerSpriteId = "player";

  constructor() {
    super("main-game");
  }

  init(data: MainGameSceneData = {}): void {
    this.initialMudBridge = data.mudBridge;
    this.initialMudSnapshot = data.initialMudSnapshot;
    this.playerSpriteId = data.playerSpriteId ?? "player";
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
      if (this.textures.exists(plantSpriteTextureKey(plantId))) {
        continue;
      }

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
    const handHud = world.createEntity();
    const inventoryHud = world.createEntity();
    const actionToasts = world.createEntity();
    const toolInventoryHud = world.createEntity();
    const targetActionMenu = world.createEntity();
    const bankPanel = world.createEntity();
    const plantStatusPanel = world.createEntity();
    const minimap = world.createEntity();
    const virtualJoystick = world.createEntity();
    const player = world.createEntity();
    const baseGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const dirtGrid = new TerrainGrid(gridWidth, gridHeight, tileSize);
    const spawnX = worldWidth / 2;
    const spawnY = worldHeight / 2;
    const playerSprite = this.createPlayerSprite(
      spawnX,
      spawnY,
      this.playerSpriteId,
    );
    const actionProgressBar = this.createActionProgressBar();
    const energyBar = this.createEnergyBar();
    const currencyDisplay = this.createCurrencyDisplay();
    const dayNightOverlay = this.createDayNightOverlay();
    const sleepProgressBar = this.createSleepProgressBar();
    const sleepVisual = this.createSleepVisual();
    const journalPanel = this.createJournalPanel();
    const handHudDisplay = this.createHandHud();
    const inventoryHudDisplay = this.createInventoryHud();
    const actionToastDisplay = this.createActionToastStack();
    const toolInventoryDisplay = this.createToolInventoryHud();
    const targetActionMenuDisplay = this.createTargetActionMenu();
    const bankPanelDisplay = this.createBankPanel();
    const plantStatusPanelDisplay = this.createPlantStatusPanel();
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
    world.addComponent(bankPanel, BankPanel, bankPanelDisplay);
    world.addComponent(
      plantStatusPanel,
      PlantStatusPanel,
      plantStatusPanelDisplay,
    );
    world.addComponent(minimap, BiomeMinimap, minimapDisplay);
    world.addComponent(
      virtualJoystick,
      VirtualJoystick,
      virtualJoystickDisplay,
    );

    world.addComponent(player, PlayerControlled, new PlayerControlled());
    world.addComponent(player, PlayerAvatar, new PlayerAvatar(this.playerSpriteId));
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
        [Phaser.Input.Keyboard.KeyCodes.FIVE]: "carry-more-need",
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
    spriteId: string,
  ): Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform {
    const spriteAsset = getPlayerSpriteAsset(spriteId);

    if (spriteAsset) {
      return this.add
        .sprite(x, y, playerSpriteTextureKey(spriteId))
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
    const width = energyBarBarAsset.width;
    const height = energyBarBarAsset.height;
    const iconWidth = energyBarIconAsset.width;
    const iconHeight = energyBarIconAsset.height;
    const barX = Math.round(iconWidth * 0.5);
    const barY = Math.round((iconHeight - height) * 0.5);
    const visualWidth = barX + width;
    const visualHeight = iconHeight;
    const x = energyBarScreenX;
    const y = energyBarScreenY;
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

    container.add([background, fill, value, icon, region]);

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
    const width = actionProgressBarTrackAsset.width;
    const height = actionProgressBarTrackAsset.height;
    const fillWidth = actionProgressBarFillerAsset.width;
    const fillHeight = actionProgressBarFillerAsset.height;
    const iconContainerWidth = actionProgressIconContainerAsset.width;
    const iconCenterX = -184;
    const iconCenterY = 0;
    const trackLeftX = iconCenterX + iconContainerWidth * 0.5 - 6;
    const trackCenterX = trackLeftX + width * 0.5;
    const fillX = trackLeftX + (width - fillWidth) * 0.5;
    const fillY = -fillHeight * 0.5;
    const finalStatusCenterX = trackLeftX + width - 2;
    const container = this.add.container(0, 0).setDepth(106).setVisible(false);
    const track = this.add
      .image(trackCenterX, 0, actionProgressBarTrackTextureKey)
      .setOrigin(0.5);
    const fill = this.add
      .nineslice(
        fillX,
        fillY,
        actionProgressBarFillerTextureKey,
        undefined,
        fillWidth,
        fillHeight,
        actionProgressBarFillerSlices.left,
        actionProgressBarFillerSlices.right,
      )
      .setOrigin(0);
    const iconFrame = this.add
      .image(iconCenterX, iconCenterY, actionProgressIconContainerTextureKey)
      .setOrigin(0.5);
    const icon = this.add
      .image(iconCenterX, iconCenterY + 1, uiIconAssets.gather.textureKey)
      .setDisplaySize(62, 62)
      .setOrigin(0.5);
    const finalStatusIcon = this.add
      .image(finalStatusCenterX, 0, actionProgressFinalStatusIconTextureKey)
      .setDisplaySize(
        actionProgressFinalStatusIconAsset.width,
        actionProgressFinalStatusIconAsset.height,
      )
      .setOrigin(0.5)
      .setVisible(false);

    container.add([track, fill, iconFrame, icon, finalStatusIcon]);

    return new ActionProgressBar(
      container,
      track,
      fill,
      iconFrame,
      icon,
      finalStatusIcon,
      width,
      height,
      fillWidth,
      fillHeight,
      fillX,
      fillY,
      -78,
    );
  }

  private createDayNightOverlay(): DayNightOverlay {
    const shade = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x07142a, 0)
      .setOrigin(0)
      .setDepth(90);
    const container = this.add.container(0, 0).setDepth(101);
    const buttonsContainer = this.add.container(0, 0).setDepth(102);
    const artwork = this.add
      .image(
        dateTimeArtworkCenterX,
        dateTimeArtworkCenterY,
        dateTimeArtworkTextureKey,
      )
      .setDisplaySize(dateTimeArtworkDiameter, dateTimeArtworkDiameter)
      .setOrigin(0.5);
    const artworkMask = this.add.graphics().fillStyle(0xffffff, 1).setAlpha(0);

    artwork.setMask(artworkMask.createGeometryMask());

    const frame = this.add
      .image(dateTimeFrameX, 0, dateTimeHalfcircleFrameTextureKey)
      .setDisplaySize(
        dateTimeHalfcircleFrameAsset.width,
        dateTimeHalfcircleFrameAsset.height,
      )
      .setOrigin(0);
    const panel = this.add
      .nineslice(
        0,
        dateTimeHudPanelY,
        dateTimePanelTextureKey,
        undefined,
        dateTimeHudWidth,
        dateTimePanelHeight,
        dateTimePanelSlices.left,
        dateTimePanelSlices.right,
        dateTimePanelSlices.top,
        dateTimePanelSlices.bottom,
      )
      .setOrigin(0);
    const label = this.add
      .text(
        dateTimePanelTextInset,
        dateTimeHudPanelY + dateTimePanelHeight / 2 + 1,
        "",
        {
          align: "center",
          color: "#3b2414",
          fixedWidth: dateTimeHudWidth - dateTimePanelTextInset * 2,
          fontFamily: "Trebuchet MS, Verdana, system-ui, sans-serif",
          fontSize: "30px",
          fontStyle: "700",
          shadow: {
            color: "#f7e7c3",
            fill: true,
            offsetX: 0,
            offsetY: 2,
          },
          stroke: "#f8e8c2",
          strokeThickness: 3,
        },
      )
      .setOrigin(0, 0.5);
    const buttons = [
      this.createSystemButton("journal"),
      this.createSystemButton("settings"),
      this.createSystemButton("map"),
    ];

    buttons.forEach((button, index) => {
      button.container.setPosition(
        index * (systemButtonWidth + systemButtonGap) + systemButtonWidth / 2,
        systemButtonHeight / 2,
      );
      buttonsContainer.add(button.container);
    });

    container.add([artwork, frame, panel, label]);

    return new DayNightOverlay(
      shade,
      container,
      buttonsContainer,
      artwork,
      artworkMask,
      frame,
      panel,
      label,
      buttons,
      dateTimeHudWidth,
      dateTimeHudHeight,
      dateTimeHudDisplayScale,
      systemButtonRowWidth,
      systemButtonHeight,
      systemButtonGapY,
      dateTimeHudPanelY,
      18,
      18,
    );
  }

  private createSystemButton(id: HudSystemButtonId): HudSystemButton {
    const asset = uiSystemButtonAssets[id];
    const container = this.add.container(0, 0);
    const inactive = this.add
      .image(0, 0, asset.inactive.textureKey)
      .setDisplaySize(systemButtonWidth, systemButtonHeight)
      .setOrigin(0.5);
    const active = this.add
      .image(0, 0, asset.active.textureKey)
      .setDisplaySize(systemButtonWidth, systemButtonHeight)
      .setOrigin(0.5)
      .setVisible(false);
    const hitArea = this.add
      .zone(0, 0, systemButtonWidth, systemButtonHeight)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const button: HudSystemButton = {
      id,
      container,
      active,
      inactive,
      hitArea,
      pendingClick: false,
      pressed: false,
    };

    hitArea.on("pointerdown", () => {
      button.pressed = true;
      this.tweenSystemButton(button, 0.94, 80);
    });
    hitArea.on("pointerup", () => {
      if (button.pressed) {
        button.pendingClick = true;
      }
      button.pressed = false;
      this.tweenSystemButton(button, 1, 130);
    });
    hitArea.on("pointerout", () => {
      button.pressed = false;
      this.tweenSystemButton(button, 1, 130);
    });
    hitArea.on("pointerupoutside", () => {
      button.pressed = false;
      this.tweenSystemButton(button, 1, 130);
    });

    container.add([inactive, active, hitArea]);

    return button;
  }

  private tweenSystemButton(
    button: HudSystemButton,
    scale: number,
    duration: number,
  ): void {
    button.pressTween?.stop();
    button.pressTween = this.tweens.add({
      duration,
      ease: "Sine.easeOut",
      scale,
      targets: button.container,
    });
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
    const icon = this.add
      .image(
        x + height / 2 + 4,
        y + height / 2,
        uiIconAssets.sleepPillow.textureKey,
      )
      .setDepth(103)
      .setVisible(false);
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
    icon.setVisible(false);
    label.setVisible(false);

    return new SleepProgressBar(
      background,
      fill,
      icon,
      label,
      width,
      height,
      x,
      y,
    );
  }

  private createActionToastStack(): ActionToastStack {
    return new ActionToastStack(
      this.add.container(0, 0).setDepth(104),
      actionToastScreenX,
      actionToastScreenY,
      360,
    );
  }

  private createToolInventoryHud(): ToolInventoryHud {
    const slotDefinitions: Array<{ id: string; kind: "tool" | "item" }> = [
      { id: "tool:axe", kind: "tool" },
      { id: "tool:watering-can", kind: "tool" },
      { id: "tool:hands", kind: "tool" },
      { id: "item:left", kind: "item" },
      { id: "item:right", kind: "item" },
    ];
    const hasDivider =
      slotDefinitions.some((slot) => slot.kind === "tool") &&
      slotDefinitions.some((slot) => slot.kind === "item");
    const contentWidth =
      inventoryHudPanelPadding * 2 +
      slotDefinitions.length * inventorySlotAsset.width +
      Math.max(0, slotDefinitions.length - 1) * inventoryHudSlotGap +
      (hasDivider ? inventoryDividerAsset.width : 0);
    const width = Math.max(
      inventoryPanelSlices.left +
        inventoryPanelSlices.right +
        inventorySlotAsset.width,
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
        if (
          hasDivider &&
          previous.kind === "tool" &&
          definition.kind === "item"
        ) {
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
      .setDisplaySize(
        inventorySlotHoverAsset.width,
        inventorySlotHoverAsset.height,
      )
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
      .rectangle(0, 0, 1040, 128, hudColors.panelDark, 0.9)
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
        fixedWidth: 34,
        fontFamily: hudFontFamily,
        fontSize: "42px",
        fontStyle: "700",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const rightIndicator = this.add
      .text(0, 0, ">", {
        align: "center",
        color: hudColors.textWarm,
        fixedWidth: 34,
        fontFamily: hudFontFamily,
        fontSize: "42px",
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
      1040,
      128,
    );

    leftIndicator.on("pointerdown", () => {
      menu.scrollX = Math.max(0, menu.scrollX - 384);
    });
    rightIndicator.on("pointerdown", () => {
      menu.scrollX = Math.min(menu.maxScrollX, menu.scrollX + 384);
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
    const contentMaskShape = this.add.graphics();
    contentMaskShape.fillStyle(0xffffff, 1);
    contentMaskShape.fillRect(18, 116, width - 36, height - 138);
    const contentMask = contentMaskShape.createGeometryMask();
    contentMaskShape.setVisible(false);
    const content = this.add.container(18, 116);
    const scrollbarTrack = this.add
      .rectangle(width - 16, 116, 4, height - 138, 0x2b3a42, 0.72)
      .setOrigin(0, 0);
    const scrollbarThumb = this.add
      .rectangle(width - 18, 116, 8, 54, 0xf1d38b, 0.84)
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
      content,
      contentMask,
      scrollbarTrack,
      scrollbarThumb,
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
      contentMaskShape,
      content,
      scrollbarTrack,
      scrollbarThumb,
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
  playerSpriteId?: string;
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
