import Phaser from "phaser";
import type { World } from "../../ecs/World";
import { ActionInputSystem } from "../systems/ActionInputSystem";
import { ActionSystem } from "../systems/ActionSystem";
import { AutotileRenderSystem } from "../systems/AutotileRenderSystem";
import { BoundsSystem } from "../systems/BoundsSystem";
import { DayNightRenderSystem } from "../systems/DayNightRenderSystem";
import { EnergyBarSystem } from "../systems/EnergyBarSystem";
import { EnergySystem } from "../systems/EnergySystem";
import { FacingDirectionSystem } from "../systems/FacingDirectionSystem";
import { FocusInputSystem } from "../systems/FocusInputSystem";
import { FocusTargetSystem } from "../systems/FocusTargetSystem";
import { GameClockSystem } from "../systems/GameClockSystem";
import { GridTargetHighlightSystem } from "../systems/GridTargetHighlightSystem";
import { HandHudSystem } from "../systems/HandHudSystem";
import { HeldItemPositionSystem } from "../systems/HeldItemPositionSystem";
import { InputSystem } from "../systems/InputSystem";
import { JournalSystem } from "../systems/JournalSystem";
import { MovementSystem } from "../systems/MovementSystem";
import { PlantGrowthSystem } from "../systems/PlantGrowthSystem";
import { PlantRenderSystem } from "../systems/PlantRenderSystem";
import { RenderSystem } from "../systems/RenderSystem";
import { SeedDropRenderSystem } from "../systems/SeedDropRenderSystem";
import { SeedHudSystem } from "../systems/SeedHudSystem";
import { SleepProgressBarSystem } from "../systems/SleepProgressBarSystem";
import { SleepSystem } from "../systems/SleepSystem";
import { SleepVisualSystem } from "../systems/SleepVisualSystem";
import { TerrainBackgroundSystem } from "../systems/TerrainBackgroundSystem";
import { TerrainBaseRenderSystem } from "../systems/TerrainBaseRenderSystem";
import { WeightDisplaySystem } from "../systems/WeightDisplaySystem";

export function registerSystems(
  world: World,
  scene: Phaser.Scene,
  keyboard: Phaser.Input.Keyboard.KeyboardPlugin,
  bounds: Phaser.Geom.Rectangle,
  weightLabel: Phaser.GameObjects.Text,
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
  world.addSystem(new GameClockSystem());
  world.addSystem(new EnergySystem());
  world.addSystem(new PlantGrowthSystem());
  world.addSystem(new FacingDirectionSystem());
  world.addSystem(new MovementSystem());
  world.addSystem(new HeldItemPositionSystem());
  world.addSystem(new FocusTargetSystem());
  world.addSystem(new ActionSystem());
  world.addSystem(new SleepSystem());
  world.addSystem(new BoundsSystem(bounds));
  world.addSystem(new GridTargetHighlightSystem());
  world.addSystem(new RenderSystem());
  world.addSystem(new PlantRenderSystem(scene));
  world.addSystem(new SeedDropRenderSystem(scene));
  world.addSystem(new SleepVisualSystem());
  world.addSystem(new DayNightRenderSystem());
  world.addSystem(new SleepProgressBarSystem());
  world.addSystem(new SeedHudSystem());
  world.addSystem(new HandHudSystem());
  world.addSystem(new EnergyBarSystem());
  world.addSystem(new WeightDisplaySystem(weightLabel));
}
