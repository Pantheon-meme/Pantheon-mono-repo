# Game Architecture

Game code is organized by domain first. Each domain owns its ECS components,
systems, and helper code so related files stay near each other.

## Directory Shape

- `actions`: action registry, action effects, action queue/log components, and
  action systems.
- `energy`, `sleep`, `time`, `ideas`, `needs`: small gameplay domains with
  their own state and systems.
- `plants`: plant and seed state, plant definitions, plant rendering, and seed
  drop rendering.
- `player`: player input, facing, focus, hands, held item state, and movement.
- `terrain`: terrain layers, grids, painting, targeting, highlighting, and
  autotile code.
- `ui`: HUD/panel components and systems that display existing game state.
- `shared`: reusable primitives such as `Position`, `Renderable`, `Footprint`,
  weight components, and generic render/bounds systems.

Prefer adding new code to the owning domain. Use `shared` only when a component
or system is genuinely reusable across multiple domains.

## Systems

## Update Order

Systems are the only code that runs every frame. They read and mutate
components through `World`, and they should stay focused on one job. System
order is registered in `bootstrap/registerSystems.ts`.

Keep this broad order unless a feature has a clear reason to move:

1. Terrain preparation and persistent scene-backed UI setup
2. Raw input and action queueing
3. Time, resource, growth, movement, focus, and action state updates
4. Bounds and derived gameplay state
5. Rendering and HUD updates

If a system consumes state produced by another system, register the producer
first. For example, `ActionInputSystem` queues actions before `ActionSystem`
executes them, and `FocusTargetSystem` refreshes focus before render/HUD systems
display it.

## System Responsibilities

- Gameplay systems mutate game state components, such as position, energy,
  sleep state, plant growth, or action results.
- Render systems create and update Phaser objects from component state. They
  should avoid owning gameplay rules.
- HUD systems display existing state. They should not decide gameplay outcomes.
- Input systems translate Phaser input into components or action queue entries.

When a system starts doing more than one of those jobs, split the extra behavior
into a new system or a helper module.

## Adding a System

1. Add a small component for persistent state if the system needs one.
2. Query only the components the system truly needs.
3. Keep Phaser object creation in render or HUD systems.
4. Register the system in `bootstrap/registerSystems.ts` near the systems it
   depends on.
5. Add or update tests for rule-heavy behavior when the system changes gameplay.

## Components vs Helpers

Use a component when the data belongs to an entity and should persist across
frames. Use a helper when the code is a reusable query or rule, such as finding
a plant at a tile or formatting terrain labels.

Avoid putting long gameplay workflows directly into a system. Actions should
live under `actions`, while shared lookup logic should live in a small query or
helper module near the domain that owns the rule.
