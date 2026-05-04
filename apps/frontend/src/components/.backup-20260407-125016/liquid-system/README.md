# Liquid Glass Design System

This directory is the product-facing glass subsystem. Product code should use the 3 public grades instead of importing the raw optical engine.

## Grades

| Grade | Use for | Rendering | Forbidden |
| --- | --- | --- | --- |
| `HeroGlass` | landing hero, showcase focal panes | full refraction on Chromium/Tauri, degraded elsewhere | fixed full-height chrome, repeated cards, drag-resize loops |
| `InteractiveGlass` | search boxes, selected pills, buttons, controls | reduced refraction only in stable states | dense repeated surfaces, full-width sections, live drag/resize refraction |
| `CheapGlass` | sidebars, cards, overlays, modal shells, navigation | CSS-only tint/blur/border/shadow | none; this is the default baseline |

## Public Rule

- Product code should import only:
  - `HeroGlass`
  - `InteractiveGlass`
  - `CheapGlass`
- The raw physical engine stays inside the liquid subsystem and the R&D demo.
- If a surface is fixed, full-height, viewport-covering, repeated in a list, or actively resizing, it must not use real refraction.

## Allowed With Downgrade

- `HeroGlass` on unsupported or low-budget Chromium states should degrade to `InteractiveGlass`.
- `InteractiveGlass` on mobile, Safari, Firefox, drag, resize, pressed, or scroll-heavy states should degrade to `CheapGlass`.

## Wrong Examples

- Full-height sidebar with true refraction.
- Draggable mobile pill rebuilding displacement maps every frame.
- Dense card grid using refractive glass.
- Search/filter panels mixing ad-hoc `backdrop-blur` and physical glass knobs in page code.

## Product vs R&D

- `/liquid-glass` is the only R&D surface where arbitrary physical tuning is allowed.
- Product pages should choose a grade and a preset, not optical parameters.
