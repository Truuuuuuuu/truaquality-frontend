/// <reference types="node" />
import assert from "node:assert/strict"
import test from "node:test"
import type { Pond } from "@/lib/api"
import {
  historicalDisplayReading,
  historicalValuePresentation,
} from "./history-reading"
import { PARAMETER_BY_ID, PARAMETER_FILTER_ITEMS } from "./parameters"
import type { PondReadingEntry } from "./pond-status"
import { formatReading } from "./reading-format"

const reference = {
  kind: "lower",
  boundary: 5,
  operator: "gt",
  unit: "mg/L",
  label: "Normal: > 5 ppm",
} as const
const entry: PondReadingEntry = {
  parameter: PARAMETER_BY_ID.dissolvedOxygen,
  reading: null,
  displayReading: null,
  referenceReading: null,
  signal: "not_reported",
  sensorStatus: null,
  valueStatus: undefined,
  unconfirmed: null,
}
const pond = {
  parameterMetadata: {
    dissolvedOxygen: {
      normalReference: reference,
      assessment: { state: "pending" },
    },
  },
  latest: {
    dissolvedOxygen: { value: 99, recordedAt: new Date(999).toISOString() },
  },
  device: { assignedAt: new Date(500).toISOString() },
} as unknown as Pond

test("selected historic DO survives new assignment/never-reported current probe without appending latest", () => {
  const points = [
    { t: 200, v: 7 },
    { t: 100, v: 0 },
  ]
  const reading = historicalDisplayReading(entry, pond, points)
  assert.ok(reading && reading.kind === "reference")
  assert.deepEqual(reading.history, [
    { t: 100, v: 0 },
    { t: 200, v: 7 },
  ])
  assert.equal(reading.current, 7)
  assert.equal(reading.currentReading, false)
  assert.deepEqual(points, [
    { t: 200, v: 7 },
    { t: 100, v: 0 },
  ])
})

test("empty/nonfinite selected DO history never fabricates a row from current latest", () => {
  assert.equal(historicalDisplayReading(entry, pond, []), null)
  assert.equal(
    historicalDisplayReading(entry, pond, [
      { t: 1, v: NaN },
      { t: Infinity, v: 7 },
    ]),
    null
  )
})

test("historical reference equality/zero is amber, strictly above is green, never an alert severity", () => {
  for (const value of [0, 4.99, 5]) {
    assert.deepEqual(
      historicalValuePresentation(
        "dissolvedOxygen",
        value,
        undefined,
        reference
      ),
      {
        tone: "amber",
        label: "Outside normal range",
        assessment: "Alert assessment pending",
      }
    )
  }
  assert.equal(
    historicalValuePresentation("dissolvedOxygen", 5.01, undefined, reference)
      .tone,
    "green"
  )
  assert.equal(
    historicalValuePresentation("dissolvedOxygen", 5.01, undefined, {
      ...reference,
      boundary: 8,
    }).tone,
    "amber"
  )
})

test("missing reference remains numeric-neutral, invalid points are no reading", () => {
  assert.equal(
    historicalValuePresentation("dissolvedOxygen", 5).label,
    "Reference unavailable"
  )
  for (const value of [null, undefined, NaN, Infinity])
    assert.equal(
      historicalValuePresentation(
        "dissolvedOxygen",
        value,
        undefined,
        reference
      ).label,
      "No reading"
    )
})

test("historic DO uses selected metadata despite current disconnected fault", () => {
  const reading = historicalDisplayReading(
    { ...entry, signal: "silent", sensorStatus: "disconnected" },
    pond,
    [{ t: 100, v: 5 }]
  )
  assert.ok(reading && reading.kind === "reference")
  assert.equal(reading.referenceComparison, "outside_reference")
  assert.equal(
    historicalDisplayReading(entry, {} as Pond, [{ t: 100, v: 5 }])?.kind,
    "reference"
  )
})

test("legacy history keeps its existing assessed state and severity", () => {
  const threshold = {
    safeMin: 10,
    safeMax: 30,
    criticalMin: 0,
    criticalMax: 40,
  }
  const display = {
    kind: "assessed",
    parameter: PARAMETER_BY_ID.temperature,
    threshold,
    current: 20,
    history: [],
    updatedAt: 1,
    status: "nominal",
  } as const
  const legacy = {
    ...entry,
    parameter: PARAMETER_BY_ID.temperature,
    displayReading: { ...display, history: [] },
  }
  assert.equal(
    historicalDisplayReading(legacy, pond, []),
    legacy.displayReading
  )
  assert.equal(
    historicalValuePresentation("temperature", 20, threshold).tone,
    "nominal"
  )
  assert.equal(
    historicalValuePresentation("temperature", 5, threshold).tone,
    "warning"
  )
  assert.equal(
    historicalValuePresentation("temperature", -1, threshold).tone,
    "critical"
  )
})

test("canonical filter full label and two-decimal mg/L remain registry-owned", () => {
  assert.deepEqual(PARAMETER_FILTER_ITEMS.at(-1), {
    value: "dissolvedOxygen",
    label: "Dissolved oxygen",
  })
  assert.equal(
    formatReading(PARAMETER_BY_ID.dissolvedOxygen, 0).text,
    "0.00 mg/L"
  )
})
