---
name: TruAquality Monitoring Board
description: A SCADA-style pond monitoring board where the dashboard reads as the plant schematic itself.
colors:
  # Dark variant (Dark theme / default). Every token has a Light-theme counterpart below;
  # both drive the same component roles — see Colors for which applies when.
  rail-graphite: "oklch(0.115 0.007 258)"
  board-slate: "oklch(0.15 0.008 258)"
  panel-slate: "oklch(0.195 0.01 258)"
  raised-slate: "oklch(0.235 0.012 258)"
  hairline-border: "oklch(1 0 0 / 8%)"
  hairline-border-strong: "oklch(1 0 0 / 14%)"
  instrument-white: "oklch(0.93 0.004 258)"
  muted-slate-text: "oklch(0.6 0.014 258)"
  telemetry-green: "oklch(0.78 0.15 145)"
  telemetry-green-dim: "oklch(0.48 0.09 145)"
  alert-amber: "oklch(0.75 0.16 70)"
  alert-amber-dim: "oklch(0.45 0.1 65)"
  critical-red: "oklch(0.63 0.21 25)"
  critical-red-dim: "oklch(0.4 0.14 25)"
  stale-gray: "oklch(0.6 0.01 258)"
  # Light variant (Light theme).
  rail-graphite-light: "oklch(0.91 0.006 258)"
  board-slate-light: "oklch(0.97 0.003 258)"
  panel-slate-light: "oklch(0.995 0.002 258)"
  raised-slate-light: "oklch(0.89 0.008 258)"
  hairline-border-light: "oklch(0 0 0 / 8%)"
  hairline-border-strong-light: "oklch(0 0 0 / 14%)"
  instrument-ink-light: "oklch(0.2 0.006 258)"
  muted-slate-text-light: "oklch(0.46 0.012 258)"
  telemetry-green-light: "oklch(0.4 0.13 145)"
  telemetry-green-dim-light: "oklch(0.88 0.06 145)"
  alert-amber-light: "oklch(0.42 0.15 65)"
  alert-amber-dim-light: "oklch(0.88 0.06 65)"
  critical-red-light: "oklch(0.42 0.19 25)"
  critical-red-dim-light: "oklch(0.88 0.08 25)"
  stale-gray-light: "oklch(0.42 0.01 258)"
typography:
  display:
    fontFamily: "'Geist Mono Variable', monospace"
    fontSize: "clamp(3.75rem, 8vw, 4.5rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Inter Variable', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Geist Mono Variable', monospace"
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  label:
    fontFamily: "'Inter Variable', sans-serif"
    fontSize: "0.65rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.08em"
  mono:
    fontFamily: "'Geist Mono Variable', monospace"
    fontSize: "0.65rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.02em"
rounded:
  sm: "0.5rem"
  md: "0.625rem"
  lg: "0.875rem"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  parameter-tile-nominal:
    backgroundColor: "{colors.panel-slate}"
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.lg}"
    padding: "20px"
  parameter-tile-warning:
    backgroundColor: "{colors.alert-amber-dim}"
    textColor: "{colors.alert-amber}"
    rounded: "{rounded.lg}"
    padding: "20px"
  parameter-tile-critical:
    backgroundColor: "{colors.critical-red-dim}"
    textColor: "{colors.critical-red}"
    rounded: "{rounded.lg}"
    padding: "20px"
  nav-item-active:
    backgroundColor: "{colors.instrument-white}"
    textColor: "{colors.board-slate}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-item-inactive:
    backgroundColor: "transparent"
    textColor: "{colors.muted-slate-text}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  status-stamp:
    backgroundColor: "transparent"
    textColor: "{colors.muted-slate-text}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
---

# Design System: TruAquality Monitoring Board

## Overview

**Creative North Star: "The SCADA Schematic"**

TruAquality's dashboard is built to read as a control-room instrument panel, not a SaaS analytics grid. It refuses the generic dashboard default of a neutral card grid with unstyled line charts sitting under a marketing-style sidenav. Instead the board is an instrument-panel ground — dark control-room by default, with a daylit brushed-aluminum variant for the Light theme — with panel tiles that behave like physical gauges and a rail-styled sidebar that reads as an equipment list rather than product navigation. The board now follows the app-wide Light/Dark/System theme toggle (an earlier iteration fixed it permanently dark; that constraint was later reversed so the instrument panel can be read in either lighting condition, the way a real control room's panel lighting can be dimmed or raised).

Density is calm at rest and urgent on alert: every reading (Temperature, Dissolved Oxygen, Salinity) sits in a structurally identical, equally sized tile in one uniform grid — no single parameter is promoted to a larger "hero" size — and every tile is built from the same repeatable pattern (numeral + sparkline + stamped timestamp) so future parameters slot in without a redesign. The system carries two inherited disciplines from earlier explorations in this world's build history: whole-region color flood on out-of-range state (never a small badge), and a stamped/validated feel on every value (nothing is presented bare, without a timestamp).

**Key Characteristics:**
- Instrument-panel ground that follows the app-wide theme toggle: dark graphite/slate control-room by default, daylit brushed-aluminum in Light
- Green for nominal telemetry; amber and red flood the entire tile on warning/critical, not a corner badge
- Geist Mono for every number and timestamp; Inter for every label — the pairing itself signals "instrument reading" vs. "caption"
- Engraved-groove hairlines (inset highlight + inset shadow) divide panel sections instead of flat border lines
- Every parameter tile is the same shape and size — hierarchy comes from state color, not from scale

## Colors

The palette is a narrow, deliberately desaturated slate family for structure, with three saturated signal colors reserved strictly for reading state — never for decoration. Every token below has a Dark value (the control-room scene, default) and a Light value (a daylit instrument panel, same roles) — the app's Light/Dark/System toggle switches between them; System resolves from the OS preference. Both variants are held to the same WCAG 2.1 AA contrast floor independently, not by inheriting the other's margin.

### Primary
- **Telemetry Green** — Dark `oklch(0.78 0.15 145)` / Light `oklch(0.4 0.13 145)`: the nominal-state signal. Used on the sparkline line/marker and the LED status dot whenever a reading is in its safe range. This is the "everything is fine" color and the only accent used outside an alert state — it is deliberately not reused for navigation (see Components → Navigation). Light mode uses a deeper, more saturated green than the dark scene's brighter one so it still reads at ≥4.5:1 on a near-white ground — same hue, inverted for contrast.

### Secondary
- **Alert Amber** — Dark `oklch(0.75 0.16 70)` / Light `oklch(0.42 0.15 65)`: warning-state flood color. Applies to the tile background (10% fill), border, value text, LED dot, and status stamp simultaneously — the whole tile shifts, not a badge.
- **Critical Red** — Dark `oklch(0.63 0.21 25)` / Light `oklch(0.42 0.19 25)`: critical-state flood color, same whole-tile application as amber but at higher fill/border opacity for a more alarmed register.

### Neutral
- **Rail Graphite** — Dark `oklch(0.115 0.007 258)` / Light `oklch(0.91 0.006 258)`: the sidebar rail plane. In both variants it sits apart from the main board — darker than the board in Dark (recedes), a duller gray than the board in Light (still reads as a distinct equipment rail rather than blending into a near-white canvas).
- **Board Slate** — Dark `oklch(0.15 0.008 258)` / Light `oklch(0.97 0.003 258)`: the main canvas background.
- **Panel Slate** — Dark `oklch(0.195 0.01 258)` / Light `oklch(0.995 0.002 258)`: default (nominal) tile background — lighter/brighter than the board in both variants, so tiles read as raised plates catching light, not sunken wells.
- **Raised Slate** — Dark `oklch(0.235 0.012 258)` / Light `oklch(0.89 0.008 258)`: hover/interactive plane for rail rows, icon buttons, and the scrollbar thumb. Lightens further in Dark (catches more light on hover); darkens slightly in Light (a conventional light-mode hover tint).
- **Instrument White / Instrument Ink** — Dark `oklch(0.93 0.004 258)` / Light `oklch(0.2 0.006 258)`: primary reading/label text on the board — near-white ink on the dark scene, near-black ink on the light one.
- **Muted Slate Text** — Dark `oklch(0.6 0.014 258)` / Light `oklch(0.46 0.012 258)`: secondary text — labels, captions, inactive nav items, the "Board time" caption.
- **Stale Gray** — Dark `oklch(0.6 0.01 258)` / Light `oklch(0.42 0.01 258)`: dedicated desaturated color for a stale/offline reading — deliberately outside the green/amber/red trio so "we haven't heard from this device" never gets mistaken for a graded severity.
- **Hairline Border / Hairline Border, Strong** — Dark `oklch(1 0 0 / 8%)` / `oklch(1 0 0 / 14%)`, Light `oklch(0 0 0 / 8%)` / `oklch(0 0 0 / 14%)`: low-opacity borders for dividers, tile edges, and the dashed panel on empty-state pages — white-based ink on the dark scene, black-based on the light one, same alpha steps.

### Named Rules
**The Whole-Tile Flood Rule.** An out-of-range reading recolors the entire tile — background fill, border, value text, LED dot, and status stamp together — never a small corner badge on an otherwise-neutral card. Alert state is a property of the region, not an icon on top of it.

**The Stale-Is-Not-a-Severity Rule.** Stale/offline uses its own neutral gray (`stale-gray`), not a dimmed version of amber or red. A device that has stopped reporting is a data-integrity fact, not a graded alarm level.

**The Lit-Not-Repainted Rule.** Switching Light/Dark changes how the instrument panel is lit, never what it is: every role, layout position, and state behavior stays identical across both variants — only the sampled lightness/chroma per token changes. A component that needs a different layout or a different color role in Light than in Dark has stopped being this design system.

## Typography

**Display/Value Font:** Geist Mono Variable (with `monospace` fallback)
**Label Font:** Inter Variable (with `sans-serif` fallback)

**Character:** Every number and timestamp is set in a technical monospace so readings feel measured and instrument-sourced; every label, heading, and caption is set in a plain grotesk so structural text stays out of the way. The pairing itself is the primary legibility device — an operator can tell a value from a label without reading it.

### Hierarchy
- **Title** (500 weight, 36px, line-height 1.1, tabular-nums): the numeral on every parameter tile — the single largest recurring element on the dashboard, identical across all tiles.
- **Headline** (600 weight, 18px, tracking tight): the page title ("BFAR Sorsogon Overview", "Ponds", "Devices").
- **Label** (500 weight, 10.4px/0.65rem–11.2px/0.7rem, tracking 0.08em–0.14em, uppercase): parameter names and nav item labels.
- **Mono/Stamp** (400 weight, 0.65rem, tracking 0.02em): every timestamp and relative-time stamp ("Board time", per-tile last-updated stamps).

### Named Rules
**The Equal-Tiles Rule.** No parameter tile is scaled up into a "hero" reading — every tile shares the same numeral size (36px), padding, and sparkline height. Visual hierarchy across tiles is expressed only through state color (nominal/warning/critical/stale), never through a size difference between parameters. (An earlier iteration promoted Temperature to a larger "flagship" tile; that pattern was retired so a third or fourth parameter has no special case to imitate or break.)

**The Stamped-Value Rule.** No reading appears without an adjacent timestamp or relative-time stamp in the mono/stamp style. A bare number with no provenance is not a valid tile state.

## Layout

The board is a two-region shell: a fixed-width rail sidebar (`w-60`/240px) docked left on desktop, and a flexible main canvas that scrolls independently. Below the `md` breakpoint the rail collapses entirely behind a hamburger-triggered drawer (slide-in from the left, `w-72`/288px, backdrop dim, focus-trapped, closes on Escape or backdrop click) — the rail never squeezes down to icons-only.

The main canvas is a plain flat surface (`--board-bg`) — an earlier blueprint-grid texture was tried and removed as decorative rather than functional. Page padding steps up with viewport: 16px (mobile) → 24px (`sm`) → 32px (`lg`).

Tile rhythm: every parameter tile is the same structural shape and size, laid out in a responsive grid — `1` column by default, `2` columns at the `sm` breakpoint (640px), `3` columns at `lg` (1024px) — so a third or fourth parameter drops into the same grid without a new pattern or a layout decision. Internal gaps are 16px (`gap-4`) between tiles, 24px (`gap-6`) between page sections.

## Elevation & Depth

The board is flat by design — no drop shadows convey hierarchy between tiles or between the rail and the canvas. Depth instead comes from tonal layering (rail darker than board, board darker than panel, panel darker than raised/hover surfaces) and from an engraved-groove hairline treatment on section dividers: an inset highlight plus an inset shadow that reads as a cut groove in the panel material rather than a drawn line. The one exception is the mobile navigation drawer, which uses a conventional drop shadow (`shadow-2xl`) because it is a temporary overlay above the board, not part of the board's own material.

### Shadow Vocabulary
- **Engraved groove** (`box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 6%), inset 0 -1px 0 0 oklch(0 0 0 / 35%)`): section dividers inside panels (sidebar header/footer, tile top edge feel) — a cut line, not a drawn border.
- **Drawer overlay** (`shadow-2xl`): the mobile navigation drawer only, since it floats above the board rather than sitting on it.

### Named Rules
**The Groove-Not-Border Rule.** Structural dividers inside a panel use the engraved groove treatment, not a flat 1px border, to keep the board reading as machined material rather than drawn UI.

## Shapes

Corners are moderate and consistent, never sharp and never pill-shaped except for true circular indicators. Tiles and the mobile drawer use a 14px radius (`rounded-xl`, `--radius-xl`); interactive rows (nav items, icon buttons) use a 10px radius (`rounded-lg`, base `--radius`); small stamp/pill badges use an 8px radius (`rounded-md`). The only fully circular elements are the per-tile LED status dot and the animated sparkline's latest-point marker — both intentionally read as physical indicator lights, not icons.

## Components

### Navigation (Sidebar Rail)
- **Style:** a darker plane (`rail-graphite`) than the main board, with an engraved-groove header (station name + "Monitoring Station" label) and footer (signed-in user + fixed "BFAR Sorsogon" org line + sign-out). The system serves a single organization, so there is no office switcher or per-office label.
- **Active item:** an inverted solid block — background in `instrument-white`/`instrument-ink`, text in `board-slate` (the near-black ink on Light, near-white ink on Dark, each swapped onto a solid fill) — with no accent color at all. "You are here" is signaled by contrast and weight (bumped to semibold), not by borrowing the nominal-telemetry hue; that keeps navigation state and reading state visually distinct instead of implying an active tab is somehow "in range."
- **Inactive/available item:** muted text, raised-slate background on hover.
- **Ponds and Devices:** real routes, styled identically to Dashboard's nav item and highlighted the same way when active. Both pages are currently empty states (see Empty State component below) — the "Soon" disabled-pill treatment from an earlier iteration was retired once the routes existed to navigate to, even though their content isn't built yet.
- **Mobile:** identical content inside a slide-in drawer, focus-trapped, closing on Escape/backdrop/route change.

### Parameter Tile (Signature Component)
The board's core repeating unit: icon + uppercase label + LED dot on top, a numeral-plus-unit reading in the middle, a sparkline trend at the bottom, and a stamped timestamp badge in the top-right corner. One size only — every parameter tile shares the same numeral scale, padding, and sparkline height, sitting in a shared responsive grid (see Layout) so new parameters inherit the pattern automatically with no "hero" special case. State (`nominal` / `warning` / `critical` / `stale`) drives tile background, border, value color, LED color, and stamp color together (the Whole-Tile Flood Rule), with a 500ms color transition so a state change reads as a deliberate event rather than a flicker. `stale` additionally switches the tile border to dashed and swaps the timestamp for a relative "time since last report" with a wifi-off glyph.

### Trend Chart (Signature Component)
An inline SVG sparkline (no charting library), rendered per tile: a status-colored line with a soft gradient fill beneath it, a faint band showing the parameter's safe range, and a marker at the most recent point. On a live (non-stale) reading, that marker pulses continuously (radius and opacity animate on a 2.4s loop) — the board's signature "this is a live instrument, not a static chart" cue. A stale reading freezes the marker at full opacity with no pulse and dims the whole line to 50% opacity.

### Badges / Stamps
- **Status stamp:** small stroked-border pill in mono type, holding either a formatted clock time (nominal/warning/critical) or a relative time with a wifi-off icon (stale). Border and text color match the tile's state color.
- **Sample-data badge:** an amber-stroked uppercase pill with a flask icon, used once at the page header while the system runs on mock readings — not a component to reuse once live device data lands.

### Empty State (Ponds, Devices)
The pattern for a route that exists in navigation before its feature is built: the same page header as Dashboard (headline + muted one-line caption), followed by a single dashed-border panel (`border-dashed border-board-border-strong`, `bg-board-panel/60` — the same treatment as a stale parameter tile, reused deliberately so "not live yet" reads consistently across the app) centered with a muted icon and one or two sentences describing what will land there. It is a placeholder to be replaced with real content, not a permanent design, so it carries no additional chrome beyond the header and the one panel.

## Do's and Don'ts

### Do:
- **Do** set every numeric reading and timestamp in Geist Mono, tabular-nums where the value updates live.
- **Do** flood the entire tile (background, border, value, LED, stamp) on warning/critical state; never isolate the alert signal to a small badge or icon.
- **Do** give stale/offline its own neutral color (`stale-gray`) distinct from the amber/red severity scale.
- **Do** keep new parameter tiles structurally identical to the existing standard tile (icon, label, numeral, sparkline, stamp) so the grid absorbs them without a redesign.
- **Do** use the engraved-groove treatment for structural dividers inside a panel rather than a flat border line.
- **Do** let the board's `--board-*` tokens vary between `:root` (Light) and `.dark` (Dark) like every other themeable token in this app — the board follows the same Light/Dark/System toggle as the rest of the app, it does not opt out of it.

### Don't:
- **Don't** hardcode a `--board-*` token to one literal value outside the `:root`/`.dark` pair — that silently breaks the theme toggle for the board (this happened once already; see the Overview note).
- **Don't** introduce a drop-shadow-based elevation system for tiles or panels; depth here comes from tonal layering and the groove, not lifted shadows.
- **Don't** add a corner or badge-style alert indicator as an alternative to the whole-tile flood — the two have been weighed already and only the flood shipped.
- **Don't** treat the "Sample data" flask badge as a reusable pattern; it exists only to flag mock data and should be removed, not restyled, once real device readings land.
- **Don't** tint the active nav item with `telemetry-green` (or any accent color); active state is signaled by the inverted `instrument-white`/`board-slate` block only, kept deliberately separate from reading-state color.
