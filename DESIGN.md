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
  auth-rail:
    backgroundColor: "{colors.rail-graphite}"
    textColor: "{colors.instrument-white}"
  auth-panel:
    backgroundColor: "{colors.panel-slate}"
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.lg}"
    padding: "28px"
    width: "26rem"
  auth-input-invalid:
    backgroundColor: "{colors.board-slate}"
    borderColor: "{colors.critical-red}"
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.md}"
    height: "44px"
  auth-input-well:
    backgroundColor: "{colors.board-slate}"
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "44px"
  auth-submit:
    backgroundColor: "{colors.instrument-white}"
    textColor: "{colors.board-slate}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  auth-text-action:
    backgroundColor: "transparent"
    textColor: "{colors.muted-slate-text}"
---

# Design System: TruAquality Monitoring Board

## Overview

**Creative North Star: "The SCADA Schematic"**

TruAquality's dashboard is built to read as a control-room instrument panel, not a SaaS analytics grid. It refuses the generic dashboard default of a neutral card grid with unstyled line charts sitting under a marketing-style sidenav. Instead the board is an instrument-panel ground — dark control-room by default, with a daylit brushed-aluminum variant for the Light theme — with panel tiles that behave like physical gauges and a rail-styled sidebar that reads as an equipment list rather than product navigation. The board now follows the app-wide Light/Dark/System theme toggle (an earlier iteration fixed it permanently dark; that constraint was later reversed so the instrument panel can be read in either lighting condition, the way a real control room's panel lighting can be dimmed or raised).

Density is calm at rest and urgent on alert: every reading (Temperature, Dissolved Oxygen, Salinity) sits in a structurally identical, equally sized tile in one uniform grid — no single parameter is promoted to a larger "hero" size — and every tile is built from the same repeatable pattern (numeral + sparkline + stamped timestamp) so future parameters slot in without a redesign. The system carries two inherited disciplines from earlier explorations in this world's build history: whole-region color flood on out-of-range state (never a small badge), and a stamped/validated feel on every value (nothing is presented bare, without a timestamp).

The signed-out pages (sign in, password reset request, set password for an invite or a recovery link) are the same board seen from its doorway, not a separate marketing skin: a rail-graphite plane carries the product and a key to the board's color language, and the form sits on the board ground as a single raised panel plate that obeys the board's own state rules.

**Key Characteristics:**
- Instrument-panel ground that follows the app-wide theme toggle: dark graphite/slate control-room by default, daylit brushed-aluminum in Light
- Green for nominal telemetry; amber and red flood the entire tile on warning/critical, not a corner badge
- Geist Mono for every number and timestamp; Inter for every label — the pairing itself signals "instrument reading" vs. "caption"
- Engraved-groove hairlines (inset highlight + inset shadow) divide panel sections instead of flat border lines
- Every parameter tile is the same shape and size — hierarchy comes from state color, not from scale
- The signed-out access panel is a board plate too, but a deliberately quiet one: no indicator light and no instrument stamp, and a failure marked on the implicated fields rather than flooded across the plate

## Colors

The palette is a narrow, deliberately desaturated slate family for structure, with three saturated signal colors reserved strictly for reading state — never for decoration. Every token below has a Dark value (the control-room scene, default) and a Light value (a daylit instrument panel, same roles) — the app's Light/Dark/System toggle switches between them; System resolves from the OS preference. Both variants are held to the same WCAG 2.1 AA contrast floor independently, not by inheriting the other's margin.

### Primary
- **Telemetry Green** — Dark `oklch(0.78 0.15 145)` / Light `oklch(0.4 0.13 145)`: the nominal-state signal. Used on the sparkline line/marker and the LED status dot whenever a reading is in its safe range. This is the "everything is fine" color and the only accent used outside an alert state — it is deliberately not reused for navigation (see Components → Navigation). Light mode uses a deeper, more saturated green than the dark scene's brighter one so it still reads at ≥4.5:1 on a near-white ground — same hue, inverted for contrast. On the signed-out pages it also marks the safe segment of each range bar, the focused input edge, the text caret, and the board-scope focus outline — never the primary button.

### Secondary
- **Alert Amber** — Dark `oklch(0.75 0.16 70)` / Light `oklch(0.42 0.15 65)`: warning-state flood color. Applies to the tile background (10% fill), border, value text, LED dot, and status stamp simultaneously — the whole tile shifts, not a badge. On the signed-out pages it colors the warning segments of the range bars (75% opacity) and the Caps Lock hint.
- **Critical Red** — Dark `oklch(0.63 0.21 25)` / Light `oklch(0.42 0.19 25)`: critical-state flood color, same whole-tile application as amber but at higher fill/border opacity for a more alarmed register. On the signed-out pages it is deliberately not a flood: it marks the invalid fields' borders and the inline alert text, and nothing else (see Components → Auth Panel).

### Neutral
- **Rail Graphite** — Dark `oklch(0.115 0.007 258)` / Light `oklch(0.91 0.006 258)`: the sidebar rail plane. In both variants it sits apart from the main board — darker than the board in Dark (recedes), a duller gray than the board in Light (still reads as a distinct equipment rail rather than blending into a near-white canvas). The signed-out rail uses the same plane, flat, with no texture.
- **Board Slate** — Dark `oklch(0.15 0.008 258)` / Light `oklch(0.97 0.003 258)`: the main canvas background. Also the fill of the recessed input well, so a field reads as cut down into the raised panel rather than laid on top of it.
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

Signed-out surface roles (Inter unless noted):
- **Rail headline** (600 weight, 30px stepping to 36px at `xl`, line-height 1.15, tracking -0.025em, balanced wrap): the one product statement on the auth rail. It is the largest Inter setting in the app and appears nowhere on the board.
- **Panel title** (600 weight, 24px, line-height tight, tracking -0.02em, balanced wrap): the auth panel heading. It owns its row outright — nothing sits beside it — which is what lets it run two steps above body text without crowding.
- **Field label and body** (500 weight / 400 weight, 14px): field labels, panel descriptions, the invite note; field input text is 16px so mobile browsers never zoom on focus.
- **Range value** (Geist Mono, 12px, tabular-nums): the safe range beside each range bar ("26–31 °C"). It is a real threshold, so it takes mono; parameter names beside it stay Inter.

### Named Rules
**The Equal-Tiles Rule.** No parameter tile is scaled up into a "hero" reading — every tile shares the same numeral size (36px), padding, and sparkline height. Visual hierarchy across tiles is expressed only through state color (nominal/warning/critical/stale), never through a size difference between parameters. (An earlier iteration promoted Temperature to a larger "flagship" tile; that pattern was retired so a third or fourth parameter has no special case to imitate or break.)

**The Stamped-Value Rule.** No reading appears without an adjacent timestamp or relative-time stamp in the mono/stamp style. A bare number with no provenance is not a valid tile state.

## Layout

The board is a two-region shell: a fixed-width rail sidebar (`w-60`/240px) docked left on desktop, and a flexible main canvas that scrolls independently. Below the `md` breakpoint the rail collapses entirely behind a hamburger-triggered drawer (slide-in from the left, `w-72`/288px, backdrop dim, focus-trapped, closes on Escape or backdrop click) — the rail never squeezes down to icons-only.

The main canvas is a plain flat surface (`--board-bg`) — an earlier blueprint-grid texture was tried and removed as decorative rather than functional. Page padding steps up with viewport: 16px (mobile) → 24px (`sm`) → 32px (`lg`).

Tile rhythm: every parameter tile is the same structural shape and size, laid out in a responsive grid — `1` column by default, `2` columns at the `sm` breakpoint (640px), `3` columns at `lg` (1024px) — so a third or fourth parameter drops into the same grid without a new pattern or a layout decision. Internal gaps are 16px (`gap-4`) between tiles, 24px (`gap-6`) between page sections.

**Signed-out shell.** At `lg` (1024px) and up the page is a two-column grid split 5fr / 7fr: the auth rail on the left (wordmark at top, headline + one sentence + range key centered in the remaining height, org footer pinned at the bottom; 40px side padding, 56px at `xl`; content capped at 30rem) and the board ground on the right with the theme toggle top-right and the panel column (max 26rem) centered horizontally. Below `lg` the rail is not rendered: a header row carries the wordmark with the "BFAR Sorsogon" line under it plus the theme toggle, then the panel, then one sentence and a compact range key 40px below the panel, so staff on phones still learn the color language. Page padding on the signed-out shell is 16px → 24px (`sm`) → 40px (`lg`).

### Named Rules
**The Top-Anchored Panel Rule.** The auth panel is anchored to the top of its column (40px down on mobile, `max(3.5rem, 14vh)` from `sm`), never vertically centered. An inline error or a hint that grows the panel extends it downward only, so the field someone is typing into never moves.

## Elevation & Depth

The board is flat by design — no drop shadows convey hierarchy between tiles or between the rail and the canvas. Depth instead comes from tonal layering (rail darker than board, board darker than panel, panel darker than raised/hover surfaces) and from an engraved-groove hairline treatment on section dividers: an inset highlight plus an inset shadow that reads as a cut groove in the panel material rather than a drawn line. The one exception is the mobile navigation drawer, which uses a conventional drop shadow (`shadow-2xl`) because it is a temporary overlay above the board, not part of the board's own material.

The signed-out surface adds depth in the same material terms, all of it cut into or catching light on the plate rather than lifting off it: the panel carries the groove, stacked rows carry a groove each, the input is a recessed well, and the primary button has a lit top edge.

### Shadow Vocabulary
- **Engraved groove** (`box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 6%), inset 0 -1px 0 0 oklch(0 0 0 / 35%)`): section dividers inside panels (sidebar header/footer, tile top edge feel) — a cut line, not a drawn border. In Light the groove pair is `oklch(1 0 0 / 90%)` highlight and `oklch(0 0 0 / 10%)` shadow. Also on the auth panel itself, the auth rail's org footer, and the auth divider (a 2px rule inside the panel).
- **Groove per row** (`box-shadow: 0 -1px 0 0 <groove-shadow>, inset 0 1px 0 0 <groove-highlight>` on every row; the last row adds `inset 0 -1px 0 0 <groove-shadow>, 0 1px 0 0 <groove-highlight>`): a stack of rows such as the range key, where each row is cut above and the stack is closed below. Uses the same highlight/shadow pair as the engraved groove in both themes.
- **Recessed well** (`box-shadow: inset 0 1px 2px oklch(0 0 0 / 0.14)`): the auth input field, on a `board-slate` fill inside a `panel-slate` plate.
- **Lit top edge** (`box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.14)`): the inverted primary button on the signed-out pages.
- **Drawer overlay** (`shadow-2xl`): the mobile navigation drawer only, since it floats above the board rather than sitting on it.

### Named Rules
**The Groove-Not-Border Rule.** Structural dividers inside a panel use the engraved groove treatment, not a flat 1px border, to keep the board reading as machined material rather than drawn UI.

**The Groove-Per-Row Rule.** When rows stack as a list (the range key), each row gets its own groove rather than a single divider between groups — an application of Groove-Not-Border to lists, so a row boundary is always a cut.

## Shapes

Corners are moderate and consistent, never sharp and never pill-shaped except for true circular indicators. Tiles and the mobile drawer use a 14px radius (`rounded-xl`, `--radius-xl`); interactive rows (nav items, icon buttons) use a 10px radius (`rounded-lg`, base `--radius`); small stamp/pill badges use an 8px radius (`rounded-md`). The only fully circular elements are the per-tile LED status dot and the animated sparkline's latest-point marker — both intentionally read as physical indicator lights, not icons.

On the signed-out surface the auth panel takes the tile radius (14px), inputs and the primary button take the interactive radius (10px), the show/hide toggle takes 8px, and the checkbox takes 5px. The range key's status dots are circular indicator lights under the same exception above. Range bar segments are 6px-tall capsules separated by 3px gaps — segments of a scale, not pills.

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

### Auth Rail (Signed-out Shell)
The left column of the signed-out pages at `lg` and up: a flat `rail-graphite` plane with no texture, separated from the board ground by a hairline right edge. Top to bottom it carries the "TruAquality" wordmark (Inter 14px semibold, the same setting as the sidebar's station name), the rail headline and one muted sentence, the Range Key, and an org footer. The footer is the sidebar footer's treatment reused: engraved groove plus hairline top edge, "BFAR Sorsogon" in 14px medium over "Bureau of Fisheries and Aquatic Resources" in 12px muted. The rail holds no readings, no fabricated telemetry, and no controls; below `lg` it is not rendered at all (see Layout → Signed-out shell).

### Range Key (Signature Component)
A key to the board's color language, drawn from the same safe/warning/critical thresholds the board and the backend alerts use. One row per parameter in a three-column subgrid (icon + name, range bar, mono safe range), 14px vertical padding per row, each row cut by the Groove-Per-Row Rule. The range bar is five capsule segments sized to the real thresholds: critical (75% opacity) → warning (75%) → safe (`telemetry-green`, full) → warning → critical, with the two outer critical bands padded to 25% of the critical span so they read as open-ended. Below the rows, a wrap of three status dots labelled Normal / Warning / Critical in 12px muted text. Stale is not in the key; it is not a range. The key appears once per page: in the rail on wide screens, under the panel on narrow ones.

### Auth Panel (Signature Component)
The one raised plate on the signed-out board ground: `panel-slate` fill, hairline border, engraved groove, 14px radius, 20px padding stepping to 28px at `sm`, max width 26rem. The panel title is the header — a plain 24px heading on its own full-width line, with no indicator light before it and no stamp after it. A muted description may follow; content sits 24px below.
- **No status instrumentation on the plate.** An earlier iteration carried a four-state access LED (idle / working / error / done) beside the title and a mono PHT station-time clock at the right. Both were retired: the LED duplicated signals the form already gives more precisely (the submit button's spinner and present-participle label for progress, the marked fields and named alert for failure), and the clock applied the Stamped-Value Rule to a page that has no reading to stamp — it decorated the plate rather than reporting anything. The Stamped-Value Rule governs readings; a sign-in form is not one. Don't reintroduce either as a way to make the panel feel more instrument-like.
- **Error marking (the one exception to the Whole-Tile Flood Rule):** the panel plate is a form someone has to keep reading and re-typing into, not a reading to be alarmed about, so a failure is marked rather than flooded. The plate's border and fill stay neutral; the implicated fields take a critical border (200ms), and the failure is named in one inline alert (a 16px alert-circle icon plus 14px critical text) placed directly above the submit button. The marking recedes the moment the visitor edits a field.
- **View swaps:** when a visitor's action replaces the panel (sign in → reset request → "Check your email"), the new panel settles in (see Entrance Motion) and focus moves to its heading. No settle on first load.
- **Divider:** a 2px engraved groove rule with 24px above and below, separating the form from secondary content (the invite note, "Back to sign in").

### Inputs / Fields (Recessed Well)
- **Style:** 44px tall, 10px radius, `board-slate` fill (darker than the plate in both themes), a border in muted text color at 60%, the recessed-well inset shadow, 14px horizontal padding, 16px text, `telemetry-green` caret. The label sits above in 14px medium ink, 8px gap; an optional 12px muted hint sits below.
- **Hover / Focus:** hover brings the border to full muted; focus-visible turns the border `telemetry-green` with a 4px green ring at 20%. Browser autofill is re-themed inside the board scope to keep the same well fill, ink, and caret.
- **Error / Disabled:** `aria-invalid` switches the border to `critical-red` and the focus ring to critical at 20%; disabled drops to 60% opacity.
- **Password variant:** a 32px-wide show/hide eye toggle inset 6px inside the well's right edge (muted icon, `raised-slate` on hover, 8px radius); when Caps Lock is on, a 12px amber "Caps Lock is on" line with an up-arrow icon appears under the field.
- **Checkbox ("Keep me signed in"):** 18px, 5px radius, `board-slate` fill with a muted border; checked it becomes the inverted block (instrument ink fill, board-colored check), not green.

### Buttons (Signed-out)
- **Primary (submit / primary link):** the inverted active block from Navigation reused as the page's single strongest affordance — full width, 44px tall, 10px radius, `instrument-white`/`instrument-ink` fill with `board-slate` text, 14px semibold, lit top edge. Hover drops the fill to 90%; press nudges it down 1px. While a request runs it stays focusable (`aria-disabled`), dims to 80%, shows a spinning loader (motion-safe), and swaps its label to a present-participle line ("Signing in…"). The same class renders as a link where the next step is navigation ("Go to sign in", "Request a new link").
- **Text action:** 14px medium muted text, no fill, turning ink with an underline on hover ("Forgot password?").
- **Back action:** the text action with a leading left arrow that shifts 2px left on hover; always labelled "Back to sign in", start-aligned below the divider.

### Entrance Motion (Signed-out)
The one orchestrated motion on the signed-out pages, running only under `prefers-reduced-motion: no-preference`; with reduced motion, or before it runs, everything is fully visible and static. On load the rail's headline block and the panel column rise 10px while fading in (700ms, `cubic-bezier(0.16, 1, 0.3, 1)`, the panel delayed 120ms), and each range bar traces in left to right by clip-path (1100ms, same curve, staggered at 260ms + 110ms per row). A panel that replaces another after a visitor's action gets a short settle instead (4px rise and fade, 260ms).

**The One Entrance Rule.** A signed-out page has exactly one choreographed entrance (rise + trace) and one swap settle. No looping motion runs on these pages except the submit button's loading spinner, which reports a real in-progress request.

## Do's and Don'ts

### Do:
- **Do** set every numeric reading and timestamp in Geist Mono, tabular-nums where the value updates live.
- **Do** flood the entire tile (background, border, value, LED, stamp) on warning/critical state; never isolate the alert signal to a small badge or icon.
- **Do** give stale/offline its own neutral color (`stale-gray`) distinct from the amber/red severity scale.
- **Do** keep new parameter tiles structurally identical to the existing standard tile (icon, label, numeral, sparkline, stamp) so the grid absorbs them without a redesign.
- **Do** use the engraved-groove treatment for structural dividers inside a panel rather than a flat border line.
- **Do** let the board's `--board-*` tokens vary between `:root` (Light) and `.dark` (Dark) like every other themeable token in this app — the board follows the same Light/Dark/System toggle as the rest of the app, it does not opt out of it.
- **Do** build any new signed-out page inside the existing auth shell: one Auth Panel headed by its bare title, progress reported by the submit button, and error shown on the implicated fields plus one inline alert — never as a flood of the plate.
- **Do** anchor the auth panel to the top of its column so a growing error or hint never moves the fields.
- **Do** draw the range key from the same threshold configuration the board and alerts use, so the key can never disagree with the board.
- **Do** gate every signed-out animation behind `prefers-reduced-motion: no-preference` and keep content fully visible without it.

### Don't:
- **Don't** hardcode a `--board-*` token to one literal value outside the `:root`/`.dark` pair — that silently breaks the theme toggle for the board (this happened once already; see the Overview note).
- **Don't** introduce a drop-shadow-based elevation system for tiles or panels; depth here comes from tonal layering and the groove, not lifted shadows.
- **Don't** add a corner or badge-style alert indicator to a parameter tile as an alternative to the whole-tile flood — the two have been weighed already and only the flood shipped. The auth panel is the single exception to the flood, and it marks fields rather than badging the plate.
- **Don't** flood, tint, or re-border the auth panel plate on error; the plate stays neutral so the form it holds stays readable while someone corrects it.
- **Don't** put an LED, a clock, a badge, or any other instrument ornament in the auth panel's header row; the title owns that line alone.
- **Don't** treat the "Sample data" flask badge as a reusable pattern; it exists only to flag mock data and should be removed, not restyled, once real device readings land.
- **Don't** tint the active nav item with `telemetry-green` (or any accent color); active state is signaled by the inverted `instrument-white`/`board-slate` block only, kept deliberately separate from reading-state color.
- **Don't** put a texture, gradient, or pattern on the auth rail; it is the same flat rail plane as the sidebar, and the blueprint grid stays retired.
- **Don't** color the signed-out primary button or checked checkbox green; they use the inverted instrument block, and green on those pages means only "safe" or "in progress/granted."
- **Don't** show fabricated readings or live-looking telemetry on a signed-out page; the range key shows thresholds and nothing else does.
- **Don't** vertically center the auth panel.
