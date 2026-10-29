/// <reference types="node" />
import assert from "node:assert/strict"
import { test } from "node:test"
import type { SensorDiagnostics } from "@/lib/api"
import {
  unitSensors,
  sensorHealth,
  silentReason,
  sensorDisplay,
} from "@/lib/device-health"
import { STALE_AFTER_MS } from "@/lib/parameters"

const now = Date.parse("2026-10-29T10:00:00Z")
const at = (age = 0) => new Date(now - age).toISOString()
const sensor = (
  parameter: string,
  overrides: Partial<SensorDiagnostics> = {}
): SensorDiagnostics => ({
  parameter,
  lastReadingAt: null,
  lastValue: null,
  reportedStatus: null,
  readings24h: 0,
  longestGapMin24h: 0,
  ...overrides,
})
const state = (
  s: SensorDiagnostics,
  deviceState: "ONLINE" | "OFFLINE" = "ONLINE",
  unitReportsStatuses = false
) => sensorHealth({ sensor: s, deviceState, unitReportsStatuses, now })

test("known diagnostic membership and new firmware do not establish DO probe", () => {
  assert.deepEqual(unitSensors([sensor("dissolvedOxygen")], "99.0.0", null), [])
  assert.equal(
    unitSensors(
      [sensor("dissolvedOxygen", { lastReadingAt: at(), lastValue: 0 })],
      null,
      null
    ).length,
    1
  )
  assert.equal(
    unitSensors(
      [sensor("dissolvedOxygen", { reportedStatus: "uncalibrated" })],
      null,
      null
    ).length,
    1
  )
})

test("DO assignment cutoff requires finite value and timestamp", () => {
  for (const overrides of [
    { lastReadingAt: at(60_000), lastValue: 7 },
    { lastReadingAt: at(), lastValue: NaN },
    { lastReadingAt: "bad", lastValue: 7 },
  ])
    assert.equal(
      unitSensors([sensor("dissolvedOxygen", overrides)], null, at(30_000))
        .length,
      0
    )
  assert.equal(
    unitSensors(
      [
        sensor("dissolvedOxygen", {
          lastReadingAt: at(60_000),
          lastValue: 7,
          reportedStatus: "no_signal",
        }),
      ],
      null,
      at(30_000)
    ).length,
    1
  )
})

test("four reported probes ordered before stable unknown list", () => {
  const sensors = [
    "custom",
    "dissolvedOxygen",
    "ph",
    "temperature",
    "turbidity",
    "constructor",
    "__proto__",
  ].map((id) => sensor(id, { reportedStatus: "ok" }))
  assert.deepEqual(
    unitSensors(sensors, null, null).map((s) => s.parameter),
    [
      "temperature",
      "turbidity",
      "ph",
      "dissolvedOxygen",
      "custom",
      "constructor",
      "__proto__",
    ]
  )
  assert.equal(sensorDisplay("constructor").label, "Constructor")
  assert.equal(
    silentReason("constructor", "__proto__").label,
    "Reported a fault"
  )
})

test("DO calibration and faults use specific reported guidance", () => {
  assert.deepEqual(silentReason("dissolvedOxygen", "uncalibrated"), {
    label: "Needs calibration",
    action: "DO calibration is required; procedure pending verification",
  })
  for (const token of [
    "not_found",
    "disconnected",
    "no_signal",
    "over_range",
    "uncalibrated",
  ] as const) {
    const health = state(
      sensor("dissolvedOxygen", {
        reportedStatus: token,
        lastReadingAt: at(),
        lastValue: 7,
      })
    )
    assert.equal(health.tone, "fault")
    assert.doesNotMatch(
      health.action!,
      /clear.water|6\.86|9\.18|4\.7|probe window/
    )
  }
  assert.match(silentReason("ph", "uncalibrated").action, /6\.86/)
  assert.match(silentReason("turbidity", "uncalibrated").action, /clear-water/)
})

test("DO health follows freshness and faults independently of reference value", () => {
  for (const value of [0, 5, 7.23])
    assert.equal(
      state(
        sensor("dissolvedOxygen", { lastReadingAt: at(), lastValue: value }),
        "ONLINE",
        true
      ).tone,
      "ok"
    )
  assert.equal(
    state(
      sensor("dissolvedOxygen", {
        lastReadingAt: at(STALE_AFTER_MS + 1),
        lastValue: 7,
        reportedStatus: "ok",
      })
    ).tone,
    "stale"
  )
  assert.equal(
    state(sensor("dissolvedOxygen", { reportedStatus: "ok" })).label,
    "No current DO reading"
  )
  assert.equal(
    state(
      sensor("dissolvedOxygen", { reportedStatus: "uncalibrated" }),
      "OFFLINE"
    ).label,
    "Unknown (unit offline)"
  )
})

test("legacy firmware inference and sensor lists stay intact", () => {
  const all = ["temperature", "turbidity", "ph", "dissolvedOxygen"].map((id) =>
    sensor(id)
  )
  assert.deepEqual(
    unitSensors(all, "0.3.0", null).map((s) => s.parameter),
    ["temperature"]
  )
  assert.deepEqual(
    unitSensors(all, "0.6.1", null).map((s) => s.parameter),
    ["temperature", "turbidity"]
  )
  assert.equal(
    state(sensor("temperature", { lastReadingAt: at(), lastValue: 27 }))
      .inferred,
    true
  )
  assert.equal(
    state(
      sensor("temperature", { lastReadingAt: at(), lastValue: 27 }),
      "ONLINE",
      true
    ).label,
    "Not reported by this unit's firmware"
  )
})
