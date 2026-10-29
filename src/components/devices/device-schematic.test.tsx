/// <reference types="node" />
import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { DeviceSchematic } from "@/components/devices/device-schematic"
import type { SensorDiagnostics } from "@/lib/api"
import { unitSensors, sensorHealth, sensorDisplay } from "@/lib/device-health"
import type { DeviceState } from "@/lib/device-health"

const now = Date.parse("2026-10-29T10:00:00Z")
const assignedAt = "2026-10-29T09:30:00Z"
const sensor = (
  parameter: string,
  overrides: Partial<SensorDiagnostics> = {}
): SensorDiagnostics => ({
  parameter,
  lastValue: null,
  lastReadingAt: null,
  reportedStatus: null,
  readings24h: 0,
  longestGapMin24h: 0,
  ...overrides,
})

function drawing(
  sensors: SensorDiagnostics[],
  deviceState: DeviceState = "ONLINE"
) {
  const probes = unitSensors(sensors, "0.8.0-do-contract", assignedAt).map(
    (s) => {
      const health = sensorHealth({
        sensor: s,
        deviceState,
        unitReportsStatuses: true,
        now,
      })
      return {
        parameter: s.parameter,
        label: sensorDisplay(s.parameter).label,
        tone: health.tone,
        stateLabel: health.label,
      }
    }
  )
  return renderToStaticMarkup(
    <DeviceSchematic
      deviceState={deviceState}
      probes={probes}
      selected={null}
      onSelect={() => {}}
    />
  )
}

test("schematic draws DO only with current-assignment value or explicit status evidence", () => {
  for (const s of [
    sensor("dissolvedOxygen"),
    sensor("dissolvedOxygen", {
      lastValue: 7,
      lastReadingAt: "2026-10-29T09:00:00Z",
    }),
  ])
    assert.doesNotMatch(drawing([s]), /data-probe="dissolvedOxygen"/)
  for (const s of [
    sensor("dissolvedOxygen", { reportedStatus: "uncalibrated" }),
    sensor("dissolvedOxygen", {
      lastValue: 0,
      lastReadingAt: "2026-10-29T10:00:00Z",
    }),
  ]) {
    const svg = drawing([s])
    assert.match(svg, /data-probe="dissolvedOxygen"/)
    assert.match(svg, />Dissolved oxygen</)
    assert.doesNotMatch(svg, /<circle[^>]*cy="246"/)
  }
})

test("DO drawing uses health rather than water reference color", () => {
  const s = (value: number) =>
    sensor("dissolvedOxygen", {
      lastValue: value,
      lastReadingAt: "2026-10-29T10:00:00Z",
      reportedStatus: "ok",
    })
  assert.equal(drawing([s(0)]), drawing([s(7.23)]))
  assert.match(drawing([s(0)]), />Connected</)
  assert.match(drawing([s(7.23)], "OFFLINE"), /Unknown \(unit offline\)/)
  const fault = drawing([
    sensor("dissolvedOxygen", { reportedStatus: "uncalibrated" }),
  ])
  assert.match(fault, />Needs calibration</)
  assert.match(fault, /stroke="var\(--board-critical\)"/)
  assert.doesNotMatch(fault, /buffers|clear.water|ppm|Normal:|BFAR-PHILMINAQ/)
})

test("four-probe fallback keeps full DO label and wraps health wording", () => {
  const probes = ["temperature", "turbidity", "ph", "dissolvedOxygen"].map(
    (p) =>
      sensor(p, {
        reportedStatus: "ok",
        lastReadingAt: "2026-10-29T10:00:00Z",
        lastValue: 7,
      })
  )
  const svg = drawing(probes)
  assert.match(svg, /viewBox="0 0 480 350"/)
  assert.match(svg, /<tspan[^>]*>Dissolved<\/tspan><tspan[^>]*>oxygen<\/tspan>/)
  for (const label of ["Temperature", "Turbidity", "pH"])
    assert.ok(svg.includes(label))
  assert.match(drawing(probes.slice(0, 3)), /viewBox="0 0 480 300"/)
})
