/// <reference types="node" />
import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router"
import { Gauge } from "lucide-react"
import { DisplayPreferencesProvider } from "@/context/display-preferences-context"
import { DoParameterTile } from "./parameter-tile"
import type { PondReadingEntry, ParameterSignal } from "@/lib/pond-status"
import { PARAMETER_BY_ID } from "@/lib/parameters"
import { referenceResult } from "@/lib/do-display"

const now = Date.parse("2026-10-29T10:00:00Z")
const reference = {
  kind: "lower",
  boundary: 5,
  operator: "gt",
  unit: "mg/L",
  label: "Normal: > 5 ppm",
} as const

function render(
  signal: ParameterSignal,
  value: number | null,
  token: string | null = null,
  compact = false
) {
  const entry: PondReadingEntry = {
    parameter: PARAMETER_BY_ID.dissolvedOxygen,
    signal,
    sensorStatus: token,
    reading: null,
    displayReading: null,
    valueStatus: undefined,
    unconfirmed: null,
    referenceReading:
      value === null
        ? null
        : {
            kind: "reference",
            parameter: PARAMETER_BY_ID.dissolvedOxygen,
            current: value,
            history: [],
            updatedAt: now - (signal === "live" ? 10_000 : 600_000),
            normalReference: reference,
            referenceComparison: referenceResult(value, reference),
            assessment: null,
            currentReading: signal === "live",
          },
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <DisplayPreferencesProvider>
        <DoParameterTile
          entry={entry}
          deviceId="review-unit"
          now={now}
          compact={compact}
          icon={Gauge}
        />
      </DisplayPreferencesProvider>
    </MemoryRouter>
  )
}

test("DO live and compact values use independent reference tint and accessible labels", () => {
  const full = render("live", 7.23)
  assert.match(full, /text-board-accent/)
  assert.match(full, /7\.23/)
  assert.match(full, /mg\/L/)
  assert.match(full, />Dissolved oxygen<\/span>/)
  assert.match(full, /Normal: &gt; 5 ppm/)
  assert.match(full, /Alert assessment pending/)
  assert.doesNotMatch(full, /BFAR-PHILMINAQ|all types|Warning|Critical/)
  const compact = render("live", 7.23, null, true)
  assert.match(compact, />DO<\/span>/)
  assert.match(compact, /aria-label="Dissolved oxygen:/)
})

test("DO equality and zero are amber numeric readings", () => {
  for (const value of [0, 5]) {
    const html = render("live", value)
    assert.match(html, /text-board-warn/)
    assert.match(html, /Outside normal range/)
    assert.match(html, new RegExp(`${value}\\.00`))
  }
})

test("DO faults mute retained values with age and explicit calibration guidance", () => {
  const html = render("silent", 7.23, "uncalibrated")
  assert.match(html, /Needs calibration/)
  assert.match(
    html,
    /DO calibration is required; procedure pending verification/
  )
  assert.match(html, /10m ago/)
  assert.match(html, /lucide-circle-off/)
  assert.match(html, /View unit details for Dissolved oxygen/)
  assert.doesNotMatch(
    html,
    /text-board-accent|text-board-warn|Within normal range|lucide-wifi-off|6\.86|clear-water/
  )
  const silent = render("silent", 7.23, "no_signal")
  assert.match(silent, /No current DO reading/)
  assert.match(silent, /No DO signal/)
})

test("DO unreported, status-only and offline states stay distinct", () => {
  assert.match(render("not_reported", null), /DO not reported by this unit/)
  assert.match(render("silent", null, "uncalibrated"), /Needs calibration/)
  const offline = render("unit_offline", 7.23)
  assert.match(offline, /Unit offline/)
  assert.match(offline, /lucide-wifi-off/)
  assert.doesNotMatch(offline, /Unit online|text-board-accent|text-board-warn/)
})
