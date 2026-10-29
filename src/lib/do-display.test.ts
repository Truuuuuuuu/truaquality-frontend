/// <reference types="node" />
import assert from "node:assert/strict"
import { test } from "node:test"
import { referenceResult, referenceTone } from "@/lib/do-display"
import type { NormalReference } from "@/lib/api"
import {
  PARAMETERS,
  PARAMETER_BY_ID,
  PARAMETER_FILTER_ITEMS,
} from "@/lib/parameters"
import { formatReading } from "@/lib/reading-format"

const reference: NormalReference = {
  kind: "lower",
  boundary: 5,
  operator: "gt",
  unit: "mg/L",
  label: "Normal: > 5 ppm",
}

test("strict comparison uses the server boundary, including equality", () => {
  assert.equal(referenceResult(4.99, reference), "outside_reference")
  assert.equal(referenceResult(5, reference), "outside_reference")
  assert.equal(referenceResult(5.01, reference), "within_reference")
  assert.equal(referenceResult(0, reference), "outside_reference")
  assert.equal(
    referenceResult(5.01, { ...reference, boundary: 6 }),
    "outside_reference"
  )
  assert.equal(
    referenceResult(6.01, { ...reference, boundary: 6 }),
    "within_reference"
  )
})

test("absent reference and nonfinite readings have no comparison", () => {
  for (const metadata of [null, undefined])
    assert.equal(referenceResult(7.23, metadata), null)
  for (const value of [NaN, Infinity, -Infinity, null, undefined, "7.23"])
    assert.equal(referenceResult(value, reference), null)
})

test("invalid or inherited reference fields never supply fallback numbers", () => {
  for (const metadata of [
    {},
    { ...reference, boundary: NaN },
    { ...reference, boundary: "5" },
    { ...reference, operator: "gte" },
    { ...reference, unit: "ppm" },
    { ...reference, label: "" },
    Object.create(reference),
  ]) {
    assert.equal(referenceResult(7.23, metadata), null)
  }
})

test("reference tones require a current independent comparison", () => {
  assert.equal(referenceTone("within_reference", true), "green")
  assert.equal(referenceTone("outside_reference", true), "amber")
  assert.equal(referenceTone(null, true), "muted")
  assert.equal(referenceTone("within_reference", false), "muted")
  assert.equal(referenceTone("outside_reference", false), "muted")
})

test("pending assessment stays independent of the reference result", () => {
  const metadata = {
    assessment: { state: "pending", kind: "low", evidenceRef: "internal" },
    normalReference: reference,
  }
  assert.equal(
    referenceResult(7.23, metadata.normalReference),
    "within_reference"
  )
  assert.equal(metadata.assessment.state, "pending")
  assert.equal(Object.hasOwn(metadata.assessment, "safeMin"), false)
})

test("DO is fourth with full and compact labels, reported capability and numeric mg/L formatting", () => {
  const parameter = PARAMETER_BY_ID.dissolvedOxygen
  assert.deepEqual(
    PARAMETERS.map((item) => item.id),
    ["temperature", "turbidity", "ph", "dissolvedOxygen"]
  )
  assert.equal(parameter.label, "Dissolved oxygen")
  assert.equal(parameter.shortLabel, "DO")
  assert.equal(parameter.capabilityEvidence, "reported")
  assert.equal(parameter.sinceFirmware, undefined)
  assert.equal(parameter.precision, 2)
  assert.equal(formatReading(parameter, 7.23).text, "7.23 mg/L")
  assert.equal(formatReading(parameter, 5).text, "5.00 mg/L")
  assert.equal(formatReading(parameter, 0).text, "0.00 mg/L")
  assert.equal(PARAMETER_FILTER_ITEMS.at(-1)?.label, "Dissolved oxygen")
  assert.equal(Object.hasOwn(parameter, "boundary"), false)
  assert.equal(Object.hasOwn(parameter, "safeMin"), false)
})
