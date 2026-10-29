/// <reference types="node" />
import assert from "node:assert/strict"
import test from "node:test"
import { pendingScaleDomain, referenceScaleDomain } from "./chart-scale"
import type { NormalReference } from "./api"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { TrendChart } from "../components/dashboard/trend-chart"
import { ParameterHistoryChart } from "../components/ponds/parameter-history-chart"
import type { DoReadingState } from "./do-display"
import { PARAMETER_BY_ID } from "./parameters"

const reference: NormalReference = {
  kind: "lower",
  boundary: 5,
  operator: "gt",
  unit: "mg/L",
  label: "Normal: > 5 ppm",
}

for (const [name, min, max] of [
  ["above", 7, 12],
  ["below", 0, 4],
  ["equal", 5, 5],
  ["crossing", 2, 9],
  ["flat", 7.23, 7.23],
  ["zero", 0, 0],
  ["negative", -8, 4],
  ["large", -1e100, 1e100],
  ["largest finite", -Number.MAX_VALUE, Number.MAX_VALUE],
  ["empty", NaN, NaN],
] as const) {
  test(`reference domain preserves ${name} extrema and boundary`, () => {
    const domain = referenceScaleDomain(reference, min, max)
    assert.ok(Number.isFinite(domain.lo) && Number.isFinite(domain.hi))
    assert.ok(domain.lo < domain.hi)
    for (const value of [min, max, reference.boundary].filter(
      Number.isFinite
    )) {
      assert.ok(domain.lo <= value && value <= domain.hi)
    }
    assert.ok(domain.ticks.length > 0 && domain.ticks.length <= 10)
    assert.ok(domain.ticks.every(Number.isFinite))
  })
}

test("missing or invalid reference does not introduce a boundary", () => {
  const domain = referenceScaleDomain(null, 20, 22)
  assert.ok(domain.lo > 5 && domain.hi >= 22)
  assert.deepEqual(
    referenceScaleDomain({ ...reference, boundary: NaN }, 20, 22),
    domain
  )
  const empty = referenceScaleDomain(null, NaN, NaN)
  assert.ok(Number.isFinite(empty.lo) && empty.lo < empty.hi)
})

test("reference boundary is supplied by the server", () => {
  const domain = referenceScaleDomain({ ...reference, boundary: 50 }, 2, 4)
  assert.ok(domain.hi >= 50 && domain.lo <= 2)
})

test("legacy domains retain temperature, turbidity and pH behavior", () => {
  assert.equal(
    pendingScaleDomain(
      { safeMin: 24, safeMax: 32, criticalMin: 20, criticalMax: 36 },
      26,
      28
    ),
    null
  )
  assert.deepEqual(
    pendingScaleDomain(
      {
        safeMin: 0,
        safeMax: 50,
        criticalMin: 0,
        criticalMax: 3000,
        criticalPending: true,
      },
      2,
      4
    ),
    { lo: 0, hi: 60 }
  )
  assert.deepEqual(
    pendingScaleDomain(
      {
        safeMin: 6.5,
        safeMax: 8.5,
        criticalMin: 0,
        criticalMax: 14,
        criticalPending: true,
      },
      7,
      8
    ),
    { lo: 6, hi: 9, step: 0.5 }
  )
})

const reading: DoReadingState = {
  kind: "reference",
  parameter: PARAMETER_BY_ID.dissolvedOxygen,
  current: 5,
  history: [
    { t: 1000, v: 5 },
    { t: 2000, v: 5 },
  ],
  updatedAt: 2000,
  normalReference: reference,
  referenceComparison: "outside_reference",
  assessment: { state: "pending", kind: "low", evidenceRef: "internal" },
  currentReading: true,
}

test("sparkline equality has a full amber stroke, stale and missing references are neutral", () => {
  const html = renderToStaticMarkup(createElement(TrendChart, { reading }))
  assert.match(html, /stroke="var\(--board-warn\)" stroke-width="2"/)
  assert.match(html, /reference comparison/)
  for (const value of [
    { ...reading, currentReading: false },
    { ...reading, normalReference: null },
  ]) {
    const neutral = renderToStaticMarkup(
      createElement(TrendChart, { reading: value })
    )
    assert.doesNotMatch(neutral, /board-accent|board-warn/)
  }
})

for (const compact of [false, true]) {
  test(`${compact ? "compact" : "detail"} reference chart renders independent backend statistics and no severity verdict`, () => {
    const html = renderToStaticMarkup(
      createElement(ParameterHistoryChart, {
        reading,
        domainStart: 0,
        domainEnd: 3000,
        width: 375,
        activeTime: null,
        onActiveTime: () => {},
        showXAxis: true,
        isLive: false,
        reducedMotion: true,
        compact,
        toleranceMs: 1500,
        comparisonLabel: "previous period",
        referenceResolution: "day",
        analysis: {
          min: 5,
          max: 7.23,
          avg: 6,
          previousAvg: null,
          previousChange: null,
          worst: null,
          trend: null,
          outOfRangeShare: null,
          thresholdState: "pending",
          summary: "",
          referenceComparison: {
            outsideShare: 0,
            basis: "weighted_bucket_averages",
            approximate: true,
            minimumResult: "outside_reference",
          },
        },
      })
    )
    assert.match(html, /Lowest DO/)
    assert.match(html, /5\.00/)
    assert.match(html, /Outside normal range/)
    assert.match(html, /0%/)
    assert.match(html, /Approximate; count-weighted daily/)
    assert.match(html, /Unavailable/)
    assert.match(html, /Alert assessment pending/)
    assert.doesNotMatch(
      html,
      /Crit max|Safe max|Trend|Warning|Critical|internal/
    )
    assert.doesNotMatch(html, /NaN|Infinity/)
  })
}
