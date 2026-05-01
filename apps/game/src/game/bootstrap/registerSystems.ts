import Phaser from "phaser";
import type { World } from "../../ecs/World";
import { ActionInputSystem } from "../actions/systems/ActionInputSystem";
import { ActionProgressBarSystem } from "../ui/systems/ActionProgressBarSystem";
import { ActionSystem } from "../actions/systems/ActionSystem";
import { AutotileRenderSystem } from "../terrain/systems/AutotileRenderSystem";
import { BiomeObjectRenderSystem } from "../biome/systems/BiomeObjectRenderSystem";
import { BiomeRegionAwarenessSystem } from "../biome/systems/BiomeRegionAwarenessSystem";
import { BiomeMinimapSystem } from "../ui/systems/BiomeMinimapSystem";
import { BoundsSystem } from "../shared/systems/BoundsSystem";
import { DayNightRenderSystem } from "../ui/systems/DayNightRenderSystem";
import { EnergyBarSystem } from "../ui/systems/EnergyBarSystem";
import { EnergySystem } from "../energy/systems/EnergySystem";
import { FacingDirectionSystem } from "../player/systems/FacingDirectionSystem";
import { FocusInputSystem } from "../player/systems/FocusInputSystem";
import { FocusTargetSystem } from "../player/systems/FocusTargetSystem";
import { GameClockSystem } from "../time/systems/GameClockSystem";
import { GridTargetHighlightSystem } from "../terrain/systems/GridTargetHighlightSystem";
import { HandHudSystem } from "../ui/systems/HandHudSystem";
import { HarvestedPlantRenderSystem } from "../plants/systems/HarvestedPlantRenderSystem";
import { HeldItemPositionSystem } from "../player/systems/HeldItemPositionSystem";
import { InputSystem } from "../player/systems/InputSystem";
import { ForageDropRenderSystem } from "../items/systems/ForageDropRenderSystem";
import { JournalSystem } from "../ui/systems/JournalSystem";
import { MovementSystem } from "../player/systems/MovementSystem";
import { MudHydrationSystem } from "../mud/systems/MudHydrationSystem";
import { PlantGrowthSystem } from "../plants/systems/PlantGrowthSystem";
import { PlantRenderSystem } from "../plants/systems/PlantRenderSystem";
import { PlantStatusPanelSystem } from "../ui/systems/PlantStatusPanelSystem";
import { PlayerSpriteAnimationSystem } from "../player/systems/PlayerSpriteAnimationSystem";
import { RenderSystem } from "../shared/systems/RenderSystem";
import { SeedDropRenderSystem } from "../plants/systems/SeedDropRenderSystem";
import { SleepProgressBarSystem } from "../ui/systems/SleepProgressBarSystem";
import { SleepSystem } from "../sleep/systems/SleepSystem";
import { SleepVisualSystem } from "../ui/systems/SleepVisualSystem";
import { TargetActionMenuSystem } from "../ui/systems/TargetActionMenuSystem";
import { TerrainBackgroundSystem } from "../terrain/systems/TerrainBackgroundSystem";
import { TerrainBaseRenderSystem } from "../terrain/systems/TerrainBaseRenderSystem";
import { WeightDisplaySystem } from "../ui/systems/WeightDisplaySystem";
import { WorldDepthSystem } from "../shared/systems/WorldDepthSystem";
import type { BiomeDefinition } from "../biome/BiomeDefinitions";

export function registerSystems(
  world: World,
  scene: Phaser.Scene,
  keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
  bounds: Phaser.Geom.Rectangle,
  weightLabel: Phaser.GameObjects.Text,
  biome: BiomeDefinition,
): void {
  world.addSystem(new TerrainBaseRenderSystem());
  world.addSystem(new AutotileRenderSystem(scene));
  world.addSystem(new TerrainBackgroundSystem(scene));
  world.addSystem(new JournalSystem(scene));
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
  world.addSystem(new MudHydrationSystem());
  world.addSystem(new GameClockSystem());
  world.addSystem(new EnergySystem());
  world.addSystem(new PlantGrowthSystem());
  world.addSystem(new FacingDirectionSystem());
  world.addSystem(new MovementSystem());
  world.addSystem(new BiomeRegionAwarenessSystem(biome));
  world.addSystem(new HeldItemPositionSystem());
  world.addSystem(new FocusTargetSystem());
  world.addSystem(new ActionSystem());
  world.addSystem(new SleepSystem());
  world.addSystem(new BoundsSystem(bounds));
  world.addSystem(new GridTargetHighlightSystem());
  world.addSystem(new RenderSystem());
  world.addSystem(new PlayerSpriteAnimationSystem());
  world.addSystem(new BiomeObjectRenderSystem(scene));
  world.addSystem(new PlantRenderSystem(scene));
  world.addSystem(new HarvestedPlantRenderSystem(scene));
  world.addSystem(new SeedDropRenderSystem(scene));
  world.addSystem(new ForageDropRenderSystem(scene));
  world.addSystem(new WorldDepthSystem());
  world.addSystem(new SleepVisualSystem());
  world.addSystem(new DayNightRenderSystem());
  world.addSystem(new TargetActionMenuSystem());
  world.addSystem(new PlantStatusPanelSystem());
  world.addSystem(new BiomeMinimapSystem());
  world.addSystem(new ActionProgressBarSystem());
  world.addSystem(new SleepProgressBarSystem());
  world.addSystem(new HandHudSystem());
  world.addSystem(new EnergyBarSystem(biome));
  world.addSystem(new WeightDisplaySystem(weightLabel));
}
