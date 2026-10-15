import assert from "node:assert/strict"
import { test } from "node:test"
import { temporaryPhDisplayValue } from "./temporary-ph-display.ts"

const eligible = Object.freeze({
  parameterId: "ph",
  signal: "live" as const,
  hasActiveAssignedDevice: true,
  hasThreshold: true,
})

test("pH displays 7.5 for live and silent supported online devices", () => {
  assert.equal(temporaryPhDisplayValue(eligible), 7.5)
  assert.equal(
    temporaryPhDisplayValue({ ...eligible, signal: "silent" }),
    7.5
  )
})

test("offline, unsupported, absent or disabled devices retain normal rendering", () => {
  for (const signal of ["unit_offline", "not_reported"] as const) {
    assert.equal(temporaryPhDisplayValue({ ...eligible, signal }), null)
  }
  assert.equal(
    temporaryPhDisplayValue({ ...eligible, hasActiveAssignedDevice: false }),
    null
  )
  assert.equal(
    temporaryPhDisplayValue({ ...eligible, hasThreshold: false }),
    null
  )
})

test("other parameters are never overridden", () => {
  for (const parameterId of [
    "temperature",
    "turbidity",
    "dissolved_oxygen",
    "salinity",
    "unknown",
  ]) {
    assert.equal(temporaryPhDisplayValue({ ...eligible, parameterId }), null)
  }
})

test("missing and faulty source readings need no mutation or synthetic record", () => {
  const source = Object.freeze({
    reading: null,
    sensorStatus: "over_range",
    history: Object.freeze([Object.freeze({ value: 13, recordedAt: "original" })]),
  })
  const before = structuredClone(source)
  const input = Object.freeze({ ...eligible, signal: "silent" as const, source })
  assert.equal(temporaryPhDisplayValue(input), 7.5)
  assert.deepEqual(source, before)
  assert.equal(input.signal, "silent")
  assert.equal(temporaryPhDisplayValue(eligible), 7.5)
})
