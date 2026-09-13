---
version: 1
slug: "frontend-src-pages-dashboard-page-tsx"
primary_target: "frontend/src/pages/dashboard-page.tsx"
related_targets: []
---

## Scope & mode

Primary target: `frontend/src/pages/dashboard-page.tsx` (route `/`), plus new `AppShell`/sidebar shell components
it lives inside. Mode: **Operate**. Visitor: a BFAR Sorsogon staff member monitoring the ponds BFAR Sorsogon operates.

## Audience, job, task, proof, constraints

Job: glance at current pond conditions, spot anything out of range, drill into a parameter's trend. Task
frequency: frequent live-feeling updates; devices can go stale/offline. Proof/content: mock time-series data
for Temperature, Dissolved Oxygen, Salinity (no readings API yet — see PRODUCT.md). Constraints: WCAG 2.1 AA;
sidebar must collapse to a hamburger-triggered drawer on mobile; single organization (BFAR Sorsogon), so no
office/region scoping or switching.

## Direction contract

**THESIS:** The dashboard IS the plant schematic — ponds are live nodes on an operations board, not cards in
a generic analytics grid. It refuses the SaaS-dashboard default (sidebar + neutral card grid + line charts
with no material identity).

**OWN-WORLD:** Graphite/slate ground (dark control-room base), cyan-teal for nominal telemetry, amber/red
alert flood that tints a whole tile/region (never a small badge), engraved hairline dividers between panel
sections. Values and timestamps set in a technical monospace; labels in a plain grotesk. Sidebar reads as a
panel rail, not a marketing nav — icon + label rows on a slightly darker plane than the main board.

**STORY:** The staff member opens the board and immediately reads: is anything wrong right now (color
flood on any out-of-range tile), what is the flagship number (Temperature, largest on the page), and, per
parameter, its recent trend at a glance — before deciding whether to drill in.

**FIRST VIEWPORT:** Sidebar rail (fixed "BFAR Sorsogon" org line, nav: Dashboard active, room for future admin links)
docked left on desktop, collapsing to a hamburger-triggered drawer under the mobile breakpoint. Main board
opens with one oversized Temperature reading (numeral leads the page, donated scale discipline from the
type-specimen challenger) plus its sparkline and stamped last-updated timestamp/status (donated ledger
discipline from the ticket-wallet challenger: every value is stamped, not bare). Below, Dissolved Oxygen and
Salinity occupy the same repeatable tile pattern (numeral + trend chart + stamped timestamp), sized smaller
than Temperature but structurally identical, so future parameters slot in without a redesign.

**FORM:** Municipal utility/SCADA schematic board — candidate 5 of 7 on the ordered cultural-world list
(sonde instrument panel, weather-bulletin board, pond logbook, harbor-bridge instrumentation, **SCADA
utility schematic**, limnology field notebook, hatchery tank board). Seed key `8b4e1e28`, assigned index 5,
mode `operate`. Weighed against challengers: nixie-tube laboratory counter (competitive — strong instrument
identity, but a physical-counter metaphor fits a snapshot value better than a trend chart) and four declined
challengers (variable-font specimen, racing livery, jet-age ticket wallet, drawcord cape, cloud quarry) —
the racing livery's whole-region color-flood-on-state discipline and the ticket-wallet's stamped/validated
record discipline were raised into this direction rather than lost.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict,
DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

- Exact pond names in mock data — illustrative only, not real BFAR Sorsogon records.
- No image generation available in this session: build is code-led by necessity (no comp round), ambition
  carried in this FIRST VIEWPORT block and the signature interaction (live-updating sparklines + alert-flood
  transitions), audited in behavior at finish.
