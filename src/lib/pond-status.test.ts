/// <reference types="node" />
import assert from "node:assert/strict"
import { test } from "node:test"
import type { Pond } from "@/lib/api"
import {
  parameterSignal,
  pondReadingStates,
  pondStatus,
  pondConnectionLabel,
  silentParameters,
  hasReportedDo,
} from "@/lib/pond-status"
import { STALE_AFTER_MS } from "@/lib/parameters"

const now = Date.parse("2026-10-29T10:00:00Z")
const timestamp = (age = 0) => new Date(now - age).toISOString()
function pond(): Pond {
  return {
    id: "pond",
    name: "Synthetic",
    notes: null,
    fishSpecies: null,
    pondType: "BRACKISH",
    status: "ACTIVE",
    createdAt: timestamp(),
    updatedAt: timestamp(),
    device: {
      id: "unit",
      serial: "SYNTHETIC",
      hardwareModel: null,
      label: null,
      secretVersion: 1,
      status: "ACTIVE",
      pondId: "pond",
      wifiSsid: null,
      createdAt: timestamp(),
      updatedAt: timestamp(),
      firmwareVersion: "99.0.0",
      assignedAt: timestamp(60_000),
      lastSeenAt: timestamp(),
    },
    latest: {
      temperature: { value: 27, recordedAt: timestamp() },
      turbidity: { value: 1, recordedAt: timestamp() },
      ph: { value: 7, recordedAt: timestamp() },
    },
    thresholds: Object.fromEntries(
      ["temperature", "turbidity", "ph"].map((id) => [
        id,
        { safeMin: 0, safeMax: 30, criticalMin: -10, criticalMax: 40 },
      ])
    ),
    sensorStatus: { temperature: "ok", turbidity: "ok", ph: "ok" },
    parameterMetadata: {
      dissolvedOxygen: {
        label: "Dissolved oxygen",
        unit: "mg/L",
        precision: 2,
        ingest: { state: "pending", evidenceRef: "internal" },
        assessment: { state: "pending", kind: "low", evidenceRef: "internal" },
        normalReference: {
          kind: "lower",
          boundary: 5,
          operator: "gt",
          unit: "mg/L",
          label: "Normal: > 5 ppm",
        },
      },
    },
  } as Pond
}
const entry = (
  p: Pond,
  history = new Map<string, { t: number; v: number }[]>()
) =>
  pondReadingStates(p, now, history).find(
    (item) => item.parameter.id === "dissolvedOxygen"
  )!

test("DO requires actual value or own explicit status, never firmware", () => {
  const p = pond()
  assert.equal(parameterSignal(p, "dissolvedOxygen", now), "not_reported")
  p.latest.dissolvedOxygen = { value: 0, recordedAt: timestamp() }
  assert.equal(parameterSignal(p, "dissolvedOxygen", now), "live")
  assert.equal(entry(p).referenceReading?.current, 0)
  delete p.latest.dissolvedOxygen
  p.sensorStatus!.dissolvedOxygen = "uncalibrated"
  assert.equal(parameterSignal(p, "dissolvedOxygen", now), "silent")
})

test("reassignment excludes previous unit readings and histories", () => {
  const p = pond()
  p.latest.dissolvedOxygen = { value: 7.23, recordedAt: timestamp(120_000) }
  const state = entry(
    p,
    new Map([["dissolvedOxygen", [{ t: now - 120_000, v: 7.23 }]]])
  )
  assert.equal(state.signal, "not_reported")
  assert.equal(state.displayReading, null)
})

test("fault overrides fresh numeric currentness and retains last value", () => {
  const p = pond()
  p.latest.dissolvedOxygen = { value: 7.23, recordedAt: timestamp() }
  p.sensorStatus!.dissolvedOxygen = "uncalibrated"
  const state = entry(p)
  assert.equal(state.signal, "silent")
  assert.equal(state.referenceReading?.current, 7.23)
  assert.equal(state.referenceReading?.currentReading, false)
  assert.equal(state.sensorStatus, "uncalibrated")
  assert.equal(state.valueStatus, undefined)
  assert.equal(state.reading, null)
})

test("stale window is strict and offline is separate", () => {
  const p = pond()
  p.device!.assignedAt = timestamp(STALE_AFTER_MS * 3)
  p.latest.dissolvedOxygen = { value: 7, recordedAt: timestamp(STALE_AFTER_MS) }
  assert.equal(entry(p).referenceReading?.currentReading, true)
  p.latest.dissolvedOxygen.recordedAt = timestamp(STALE_AFTER_MS + 1)
  assert.equal(entry(p).signal, "silent")
  assert.equal(entry(p).referenceReading?.currentReading, false)
  p.device!.lastSeenAt = timestamp(STALE_AFTER_MS + 1)
  assert.equal(entry(p).signal, "unit_offline")
  assert.equal(entry(p).referenceReading?.current, 7)
  assert.equal(entry(p).referenceReading?.currentReading, false)
})

test("DO display needs no threshold; missing metadata remains uncolored", () => {
  const p = pond()
  p.latest.dissolvedOxygen = { value: 5, recordedAt: timestamp() }
  assert.equal(
    entry(p).referenceReading?.referenceComparison,
    "outside_reference"
  )
  assert.equal(entry(p).displayReading?.kind, "reference")
  assert.equal(Object.hasOwn(entry(p).displayReading!, "threshold"), false)
  delete p.parameterMetadata
  assert.equal(entry(p).referenceReading?.referenceComparison, null)
  assert.equal(entry(p).referenceReading?.current, 5)
})

test("newer chosen history cannot reuse a mismatched server comparison", () => {
  const p = pond()
  p.latest.dissolvedOxygen = { value: 7, recordedAt: timestamp(10_000) }
  p.referenceComparison = {
    dissolvedOxygen: {
      ...p.latest.dissolvedOxygen,
      result: "within_reference",
    },
  }
  const state = entry(p, new Map([["dissolvedOxygen", [{ t: now, v: 5 }]]]))
  assert.equal(state.referenceReading?.current, 5)
  assert.equal(state.referenceReading?.referenceComparison, "outside_reference")
})

test("every DO state preserves legacy aggregate result, silent labels and ordering inputs", () => {
  const p = pond()
  const baseline = [
    pondStatus(p, now),
    pondConnectionLabel(p, now),
    silentParameters(p, now).map((item) => item.id),
  ]
  for (const token of [
    undefined,
    "ok",
    "uncalibrated",
    "no_signal",
    "over_range",
  ]) {
    for (const age of [0, STALE_AFTER_MS + 1]) {
      p.latest.dissolvedOxygen = { value: 0, recordedAt: timestamp(age) }
      if (token) p.sensorStatus!.dissolvedOxygen = token
      else delete p.sensorStatus!.dissolvedOxygen
      assert.deepEqual(
        [
          pondStatus(p, now),
          pondConnectionLabel(p, now),
          silentParameters(p, now).map((item) => item.id),
        ],
        baseline
      )
    }
  }
  delete p.latest.temperature
  assert.equal(pondConnectionLabel(p, now), "No temperature reading")
  assert.deepEqual(
    silentParameters(p, now).map((item) => item.id),
    ["temperature"]
  )
})

test("positive evidence rejects inherited, nonfinite and invalid-date values", () => {
  assert.equal(
    hasReportedDo({ statuses: Object.create({ dissolvedOxygen: "ok" }) }),
    false
  )
  for (const value of [NaN, Infinity, null])
    assert.equal(
      hasReportedDo({ statuses: {}, value, recordedAt: timestamp() }),
      false
    )
  assert.equal(
    hasReportedDo({ statuses: {}, value: 7, recordedAt: "bad" }),
    false
  )
  assert.equal(
    hasReportedDo({
      statuses: {},
      value: 7,
      recordedAt: timestamp(),
      assignedAt: "bad",
    }),
    false
  )
  assert.equal(parameterSignal(pond(), "constructor", now), "silent")
})
