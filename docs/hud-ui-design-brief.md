# Pantheon HUD and UI Design Brief

## Goal

Design a reusable custom UI component set for the Pantheon Phaser game. The current game UI is mostly Phaser text and rectangles. We need a cohesive HUD and interaction kit that can replace those placeholders while staying readable over a top-down, cozy farming/survival world.

The design should feel handmade, warm, and practical: readable at game speed, integrated with the world art, and not like a generic web dashboard.

## Game Context

- Project: Pantheon
- Client: Phaser 3, TypeScript, Vite
- Current local preview: `http://localhost:5174/`
- Seed test view: `http://localhost:5174/?seedTest=1`
- Visual world style: cozy hand-painted 2D, three-quarter top-down, soft natural edges, warm highlights, readable silhouettes.
- Runtime UI is drawn in Phaser, so assets should be easy to slice, tint, scale, and compose.

## Current UI Surfaces

The new component kit should cover these in-game surfaces:

1. Energy HUD
   - Current position: top-left.
   - Current size: about `360 x 24`.
   - Shows energy fill plus text like `Energy 74 / 100`.
   - Also displays the latest action message below the bar.

2. Action Progress Bar
   - Appears near the player while an action is running.
   - Current size: about `156 x 12`.
   - Has a short label above it, for example `Forage`, `Plant`, `Rest`.
   - Needs to read clearly over terrain and moving sprites.

3. Sleep Progress Bar
   - Current position: top-left below energy.
   - Current size: about `360 x 18`.
   - Hidden unless the player is sleeping.
   - Uses a cool blue fill in the current placeholder.

4. Seed HUD
   - Current position: left side below the main bars.
   - Shows active seed and inventory counts.
   - Example content:
     - `Seeds [C Sungrain seed]`
     - `Sungrain seed: 3`
     - `Emberwheat seed: 1`
   - Needs a compact inventory/list treatment.

5. Hand HUD
   - Current position: left side below Seed HUD.
   - Shows left/right hand state and key hints.
   - Supports empty, holding item, and selected/toggled states.

6. Target Action Menu
   - Appears near the bottom-center of the camera.
   - Displays the focused tile/object title and action buttons.
   - Current button size: `136 x 38`.
   - Current layout: up to 3 columns with 8 px gaps.
   - Action buttons can show a key hint and an optional second line of detail.
   - Needs normal, hover, pressed, disabled/unavailable, and queued states.

7. Journal Panel
   - Current panel size: about `520 x 440`.
   - Current position: left side.
   - Tabs: Needs, Ideas, Skills, Checks.
   - Needs a larger modal/panel design that is still readable during gameplay.
   - Should support selected tab, inactive tab, hover tab, body text, headings, empty state, and list entries.

8. Day/Night Overlay Readout
   - Current position: top-right.
   - Text label showing day/time status.
   - Needs a compact status badge or readout.

9. Weight/Inspect Label
   - Current position: bottom-left.
   - Shows contextual readout when standing on or inspecting an object.
   - Needs short tooltip/toast style.

10. Sleep Visual Marker
    - Appears over the player while sleeping.
    - Current marker: `Zzz` text plus a soft shadow ellipse.
    - Could become a small animated icon treatment.

11. Terrain Help Overlay
    - Used in the terrain/autogrid playground.
    - Needs a compact help/instruction panel style for dev or debug overlays.

## Component Kit Needed

Please provide designs for these reusable components:

- HUD bar frame
- HUD bar fill
- Small HUD panel
- Large journal/panel window
- Tab button
- Action button
- Key hint chip
- Inventory row
- Item slot / hand slot
- Tooltip / inspect label
- Toast / action message
- Status badge
- Progress label
- Small icon frame
- Divider / separator
- Scroll indicator or scroll track, if the journal needs overflow

## Required States

For every interactive component, include:

- Default
- Hover/focus
- Pressed
- Disabled/unavailable
- Selected/active
- Queued/pending, for action buttons

For bars, include:

- Empty
- Low
- Medium
- Full
- Over-time or special state if visually useful

For item slots, include:

- Empty
- Filled
- Selected hand
- Unavailable/blocked
- New or changed item count

## Visual Direction

The UI should support the game world rather than compete with it.

Preferred qualities:

- Warm, tactile, crafted
- Readable on grass, dirt, water, tree canopies, and night overlay
- Slightly material, such as carved wood, pressed parchment, woven cloth, etched stone, bronze trim, or painted enamel
- Soft shadows and borders that separate UI from the game without heavy black boxes
- Clear color language for energy, sleep, progress, danger/blocked, selection, and success

Avoid:

- Sci-fi glass panels
- Generic mobile RPG chrome
- High-fantasy ornament that makes small text hard to read
- Excessive gradients or glow
- Overly rounded pill shapes for every element
- Tiny decorative details that disappear at runtime scale

## Current Placeholder Palette

These are not final requirements, but they describe what is in the game today:

- Main text: `#eef7f4`
- Secondary text: `#dce8e2`
- Dark panel: `#101821`, `#111821`, `#17222a`
- Button fill: `#1a2630`
- Hover fill: `#314556`
- Warm accent: `#f1d38b`, `#f6efd7`
- Energy fill: `#66d685`
- Sleep fill: `#7bd7ff`
- Action progress fill: `#f0c85a`
- Night shade: `#07142a`

The final palette can change, but it should preserve strong contrast and clear semantic roles.

## Typography

Current runtime font stack is:

`Inter, system-ui, sans-serif`

Design with this as the default unless you recommend a game-friendly replacement. If a custom font is proposed, include licensing information and fallback behavior.

Target text sizes currently used:

- Main HUD label: `18 px`
- Secondary HUD text: `15-16 px`
- Button text: `13 px`
- Journal title: `22 px`
- Journal body: `16 px`
- Over-player marker: `24 px`

## Layout Constraints

Design for these viewport scenarios:

- Desktop baseline: `1240 x 720`
- Small laptop: `1024 x 640`
- Mobile or narrow preview: `390 x 844`

Important constraints:

- HUD must not hide the player or target action menu.
- Text must remain readable over the game world.
- Action buttons must support up to 3 columns on desktop.
- Journal panel should fit within small laptop screens.
- Mobile/narrow layout can stack or compress HUD groups, but must keep action buttons tappable.
- Minimum comfortable touch target: `44 x 44` for mobile-like layouts.

## Asset Export Requirements

Please provide:

- Figma file or design source.
- PNG exports for raster textures.
- Optional SVG only for simple icons or masks that will not need painterly texture.
- 1x and 2x exports for bitmap UI pieces.
- Transparent backgrounds for individual UI assets.
- 9-slice or scalable frame guidance for panels and buttons.
- Pixel dimensions for every exported asset.
- Color tokens and typography tokens.
- Spacing tokens for padding, gaps, and margins.

Recommended export structure:

```text
ui/
  frames/
    panel-small.png
    panel-large.png
    button-action.png
    button-action-hover.png
    button-action-pressed.png
    tab.png
    tab-selected.png
  bars/
    bar-frame.png
    fill-energy.png
    fill-sleep.png
    fill-progress.png
  icons/
    energy.png
    sleep.png
    seed.png
    left-hand.png
    right-hand.png
    journal.png
    warning.png
    success.png
  slots/
    item-slot-empty.png
    item-slot-filled.png
    item-slot-selected.png
  overlays/
    tooltip.png
    toast.png
```

## Icon Needs

Please design icons for:

- Energy
- Sleep/rest
- Seed pouch
- Left hand
- Right hand
- Journal
- Needs
- Ideas
- Skills
- Checks
- Plant
- Forage
- Dig
- Grab/pick up
- Use/interact
- Blocked/unavailable
- Queued/pending
- Day
- Night
- Weight/inspect

Icons should be readable at `16 x 16`, `24 x 24`, and `32 x 32`.

## Data Content To Support

The UI must handle these real strings and patterns:

- `Energy 100 / 100`
- `Forage: shook loose 2 Sungrain seed`
- `Plant needs 12 energy`
- `Seeds [C Sungrain seed]`
- `Moonwillow pearlseed: 12`
- `Left hand: empty`
- `Right hand: Honeyfig seed`
- `[Space] Forage`
- `[2] Use held seed`
- `Tile 14,27`
- `Two hands are not enough. Something wearable or tied together might help.`

Design should allow long seed/item names without ugly clipping.

## Implementation Notes

The UI will be implemented in Phaser with `GameObjects.Image`, `Sprite`, `Text`, `Container`, `Rectangle`, and possibly `NineSlice` where appropriate.

Useful implementation assumptions:

- We can tint simple fills in code.
- We can use 9-slice frames for panels and buttons.
- We can layer text over exported frames.
- We can animate alpha, scale, and position.
- Avoid assets that require complex DOM/CSS behavior.

## Designer Deliverables Checklist

- Desktop HUD mockup
- Mobile/narrow HUD mockup
- Journal open mockup
- Target action menu mockup
- Component sheet with all states
- Icon sheet
- Asset export folder
- Token/spec page with colors, typography, spacing, shadows, and 9-slice margins
- Notes about animation suggestions for hover, pressed, queued action, action progress, sleep, and toast messages

## Acceptance Criteria

The design is ready to implement when:

- Every current UI surface has a replacement component.
- All required states are designed.
- Assets can be exported individually with transparent backgrounds.
- Panel and button frames have clear scalable/9-slice rules.
- Text remains readable at the target runtime sizes.
- The component kit feels consistent with the game world and works over bright terrain, dark terrain, and night overlay.
