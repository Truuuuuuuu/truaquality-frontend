/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Gauge } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  formatTick,
  nearestPoint,
  splitRuns,
  timeTicks,
} from "@/lib/chart-time"
import {
  PARAMETER_ICONS,
  severityFor,
  type ReadingPoint,
  type ReadingState,
  type Threshold,
} from "@/lib/parameters"
import { hasLowSide, pendingScaleDomain, valueTicks } from "@/lib/chart-scale"
import { formatStatValue } from "@/lib/reading-format"
import { STATUS_COLOR, STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"

type ParameterHistoryChartProps = {
  reading: ReadingState
  domainStart: number
  domainEnd: number
  // The stack's measured width — every chart in it draws at the same width so their time axes line up.
  width: number
  activeTime: number | null
  onActiveTime: (t: number | null) => void
  showXAxis: boolean
  isLive: boolean
  reducedMotion: boolean
  compact?: boolean
  // Shared across the stack, so a stretch reads as "no data" on every chart or on none.
  toleranceMs: number
}

// Exported so the container positions its tooltip against the same plot origin every chart draws from.
export const MARGIN_LEFT = 44
// Room for the labeled threshold edges. On a phone-width chart they'd eat a quarter of the plot, so the
// left-hand value ticks carry the scale alone there.
export const MARGIN_RIGHT_WIDE = 88
export const MARGIN_RIGHT_NARROW = 12
export const NARROW_BELOW = 480
const MARGIN_TOP = 8
const AXIS_HEIGHT = 22
const PLOT_HEIGHT = 132
const PLOT_HEIGHT_COMPACT = 80
const EDGE_LABEL_GAP = 11

export function marginRightFor(width: number) {
  return width < NARROW_BELOW ? MARGIN_RIGHT_NARROW : MARGIN_RIGHT_WIDE
}

export function plotWidthFor(width: number) {
  return Math.max(width - MARGIN_LEFT - marginRightFor(width), 0)
}

export function chartHeightFor(compact: boolean, showXAxis: boolean) {
  return (
    MARGIN_TOP +
    (compact ? PLOT_HEIGHT_COMPACT : PLOT_HEIGHT) +
    (showXAxis ? AXIS_HEIGHT : 6)
  )
}

export type WindowStats = {
  min: number
  max: number
  avg: number
  outOfRangeShare: number
  worst: "nominal" | "warning" | "critical"
}

// Summary of the selected window. "Out of range" counts plotted points, so on long ranges (hourly
// rollups) it's the share of hours whose average left the safe band — close to, but not exactly, the
// share of raw readings.
export function windowStats(
  history: ReadingPoint[],
  threshold: Threshold
): WindowStats {
  let min = Infinity
  let max = -Infinity
  let sum = 0
  let out = 0
  let worst: WindowStats["worst"] = "nominal"
  for (const { v } of history) {
    min = Math.min(min, v)
    max = Math.max(max, v)
    sum += v
    const severity = severityFor(threshold, v)
    if (severity !== "nominal") out++
    if (severity === "critical") worst = "critical"
    else if (severity === "warning" && worst === "nominal") worst = "warning"
  }
  return {
    min,
    max,
    avg: sum / history.length,
    outOfRangeShare: out / history.length,
    worst,
  }
}

export function formatShare(share: number) {
  if (share === 0) return "0%"
  if (share < 0.01) return "<1%"
  return `${Math.round(share * 100)}%`
}

type Band = { y1: number; y2: number }

// One parameter's history in its own units, drawn against its own safe and critical edges. The line is
// painted three times through zone clip paths, so each stretch takes the color of the zone it passes
// through — a past excursion stays amber or red on the chart even after the reading has recovered.
export function ParameterHistoryChart({
  reading,
  domainStart,
  domainEnd,
  width,
  activeTime,
  onActiveTime,
  showXAxis,
  isLive,
  reducedMotion,
  compact = false,
  toleranceMs,
}: ParameterHistoryChartProps) {
  const { parameter, threshold, history } = reading
  const Icon = PARAMETER_ICONS[parameter.id] ?? Gauge
  const baseId = `phc-${React.useId().replace(/[^\w-]/g, "")}`
  const patternId = `${baseId}-gap`
  const clipIds = {
    nominal: `${baseId}-safe`,
    warning: `${baseId}-warn`,
    critical: `${baseId}-crit`,
  }

  const stats = windowStats(history, threshold)
  const narrow = width < NARROW_BELOW
  const plotWidth = plotWidthFor(width)
  const innerHeight = compact ? PLOT_HEIGHT_COMPACT : PLOT_HEIGHT
  const height = chartHeightFor(compact, showXAxis)

  const toX = (t: number) => {
    const x = ((t - domainStart) / (domainEnd - domainStart)) * plotWidth
    return Math.min(plotWidth, Math.max(0, x))
  }
  const toTime = (x: number) =>
    domainStart + (x / plotWidth) * (domainEnd - domainStart)

  // The domain contains both critical edges, so every zone is visible and a reading's distance from its
  // limits reads straight off the chart. While the critical line is pending there is no real upper edge to
  // show, so the axis fits the data instead: the safe line always stays in view and a spike stretches the
  // axis rather than going off-scale (D-01 supersedes clamping with off-scale markers). A reading at the
  // sensor's ceiling plots at its value.
  const pending = threshold.criticalPending === true
  const lowSide = hasLowSide(threshold)
  const fitted = pendingScaleDomain(threshold, stats.min, stats.max)
  let lo: number
  let hi: number
  if (fitted) {
    lo = fitted.lo
    hi = fitted.hi
  } else {
    const dataLo = Math.min(stats.min, threshold.criticalMin, threshold.safeMin)
    const dataHi = Math.max(stats.max, threshold.criticalMax, threshold.safeMax)
    const pad = (dataHi - dataLo) * 0.1 || 1
    lo = dataLo - pad
    hi = dataHi + pad
  }
  const toY = (v: number) => innerHeight - ((v - lo) / (hi - lo)) * innerHeight
  const clampY = (y: number) => Math.min(innerHeight, Math.max(0, y))

  const { ticks: yTicks, decimals } = valueTicks(lo, hi, compact ? 2 : 4)
  const tickDecimals = Math.min(decimals, parameter.precision)
  const { ticks: xTicks, step: xStep } = timeTicks(
    domainStart,
    domainEnd,
    Math.max(2, Math.floor(plotWidth / 96))
  )

  const ySafeMax = toY(threshold.safeMax)
  const ySafeMin = toY(threshold.safeMin)
  const yCritMax = toY(threshold.criticalMax)
  const yCritMin = toY(threshold.criticalMin)

  // Zone bands in plot space. The clip versions overshoot the plot so a round line cap at the very top or
  // bottom isn't shaved off. While the critical line is pending (D-02) nothing above the safe max is
  // called critical: the warning band runs open-ended to the plot top, and a parameter with no low side
  // (safe floor equals critical floor) gets no low-side bands at all.
  const zones: Record<"nominal" | "warning" | "critical", Band[]> = pending
    ? {
        nominal: [{ y1: ySafeMax, y2: ySafeMin }],
        warning: [
          { y1: -10, y2: ySafeMax },
          ...(lowSide ? [{ y1: ySafeMin, y2: yCritMin }] : []),
        ],
        critical: lowSide ? [{ y1: yCritMin, y2: innerHeight + 10 }] : [],
      }
    : {
        nominal: [{ y1: ySafeMax, y2: ySafeMin }],
        warning: [
          { y1: yCritMax, y2: ySafeMax },
          { y1: ySafeMin, y2: yCritMin },
        ],
        critical: [
          { y1: -10, y2: yCritMax },
          { y1: yCritMin, y2: innerHeight + 10 },
        ],
      }
  const zoneTint = {
    nominal: { color: "var(--board-accent)", opacity: 0.08 },
    warning: { color: "var(--board-warn)", opacity: 0.07 },
    critical: { color: "var(--board-critical)", opacity: 0.07 },
  } as const

  // Labeled edges, nudged apart where two sit close together so their labels don't print over each other.
  // A pending critical max has no line or label (its value is a placeholder), and a parameter with no low
  // side draws no Safe min / Crit min.
  const edges = [
    {
      key: "critMax",
      label: "Crit max",
      value: threshold.criticalMax,
      critical: true,
    },
    {
      key: "safeMax",
      label: "Safe max",
      value: threshold.safeMax,
      critical: false,
    },
    {
      key: "safeMin",
      label: "Safe min",
      value: threshold.safeMin,
      critical: false,
    },
    {
      key: "critMin",
      label: "Crit min",
      value: threshold.criticalMin,
      critical: true,
    },
  ]
    .filter((edge) => {
      if (edge.key === "critMax") return !pending
      if (edge.key === "safeMin" || edge.key === "critMin") return lowSide
      return true
    })
    .map((edge) => ({ ...edge, y: toY(edge.value), labelY: toY(edge.value) }))
  for (let i = 1; i < edges.length; i++) {
    edges[i].labelY = Math.max(
      edges[i].labelY,
      edges[i - 1].labelY + EDGE_LABEL_GAP
    )
  }
  const overflow = (edges.at(-1)?.labelY ?? 0) - (innerHeight - 4)
  if (overflow > 0) edges.forEach((edge) => (edge.labelY -= overflow))

  const runs = splitRuns(history, toleranceMs)
  const runPaths = runs
    .filter((run) => run.length > 1)
    .map((run) => ({
      key: run[0].t,
      d: run
        .map(
          (point, i) =>
            `${i === 0 ? "M" : "L"} ${toX(point.t).toFixed(1)} ${toY(point.v).toFixed(1)}`
        )
        .join(" "),
    }))
  const singles = runs.filter((run) => run.length === 1).map((run) => run[0])

  // Stretches of the window with no reading for this parameter: before the first one, between runs, and
  // after the last. Hatched rather than left blank, so an empty stretch reads as "nothing was received"
  // instead of "the chart ends here".
  const gaps: { from: number; to: number }[] = []
  const first = history[0]
  const last = history[history.length - 1]
  if (first.t - domainStart > toleranceMs)
    gaps.push({ from: domainStart, to: first.t })
  for (let i = 1; i < runs.length; i++) {
    const previous = runs[i - 1]
    gaps.push({ from: previous[previous.length - 1].t, to: runs[i][0].t })
  }
  if (domainEnd - last.t > toleranceMs)
    gaps.push({ from: last.t, to: domainEnd })

  const isStale = reading.status === "stale"
  const lastColor = STATUS_COLOR[reading.status]
  const pulse = isLive && !isStale && !reducedMotion

  const activeX = activeTime === null ? null : toX(activeTime)
  const activePoint =
    activeTime === null ? null : nearestPoint(history, activeTime)
  const showActivePoint =
    activePoint !== null &&
    activeTime !== null &&
    Math.abs(activePoint.t - activeTime) <= toleranceMs / 2

  const handlePointer = (event: React.PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    onActiveTime(toTime(event.clientX - box.left))
  }

  const format = (v: number) => formatStatValue(parameter, v)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 shrink-0 self-center text-board-muted" />
          <h3 className="font-sans text-xs font-medium tracking-[0.08em] text-board-fg uppercase">
            {parameter.label}
          </h3>
          <span className="inline-flex items-baseline gap-1">
            <span className="font-heading text-xs text-board-muted">
              {parameter.unit}
            </span>
            {parameter.approximate ? (
              <span className="font-sans text-xs text-board-muted">
                approx.
              </span>
            ) : null}
          </span>
          <span
            className={cn(
              "flex items-center gap-1.5 font-sans text-xs",
              STATUS_STYLES[reading.status].label
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                STATUS_STYLES[reading.status].led
              )}
            />
            {STATUS_LABELS[reading.status]}
          </span>
        </div>
        <dl className="flex flex-wrap gap-x-3 gap-y-0.5 font-sans text-xs text-board-muted">
          {[
            { label: "Min", value: format(stats.min) },
            { label: "Max", value: format(stats.max) },
            { label: "Avg", value: format(stats.avg) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-1">
              <dt>{label}</dt>
              <dd className="font-heading text-board-fg tabular-nums">
                {value}
              </dd>
            </div>
          ))}
          <div className="flex items-baseline gap-1">
            {/* Visually "4% out of range", but the term still precedes its value for assistive tech. */}
            <dt className="order-last">out of range</dt>
            <dd
              className={cn(
                "font-heading tabular-nums",
                STATUS_STYLES[stats.worst].value
              )}
            >
              {formatShare(stats.outOfRangeShare)}
            </dd>
          </div>
        </dl>
      </div>

      {width === 0 ? (
        <div style={{ height }} />
      ) : (
        <svg
          width={width}
          height={height}
          aria-hidden="true"
          className="block overflow-visible"
        >
          <defs>
            <pattern
              id={patternId}
              width={6}
              height={6}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={6}
                stroke="var(--board-border-strong)"
                strokeWidth={1.5}
              />
            </pattern>
            {(["nominal", "warning", "critical"] as const).map((zone) => (
              <clipPath key={zone} id={clipIds[zone]}>
                {zones[zone].map((band, i) => (
                  <rect
                    key={i}
                    x={-6}
                    y={Math.min(band.y1, band.y2)}
                    width={plotWidth + 12}
                    height={Math.max(Math.abs(band.y2 - band.y1), 0)}
                  />
                ))}
              </clipPath>
            ))}
          </defs>

          <g transform={`translate(${MARGIN_LEFT} ${MARGIN_TOP})`}>
            {/* Zone tints */}
            {(["nominal", "warning", "critical"] as const).flatMap((zone) =>
              zones[zone].map((band, i) => {
                const y1 = clampY(Math.min(band.y1, band.y2))
                const y2 = clampY(Math.max(band.y1, band.y2))
                return (
                  <rect
                    key={`${zone}-${i}`}
                    x={0}
                    y={y1}
                    width={plotWidth}
                    height={Math.max(y2 - y1, 0)}
                    fill={zoneTint[zone].color}
                    fillOpacity={zoneTint[zone].opacity}
                  />
                )
              })
            )}

            {/* Value ticks */}
            {yTicks.map((tick) => (
              <text
                key={tick}
                x={-8}
                y={toY(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-board-muted font-heading text-[0.625rem] tabular-nums"
              >
                {tick.toFixed(tickDecimals)}
              </text>
            ))}

            {/* Time gridlines — every chart, so the stack reads as one shared axis */}
            {xTicks.map((tick) => (
              <line
                key={tick}
                x1={toX(tick)}
                x2={toX(tick)}
                y1={0}
                y2={innerHeight}
                stroke="var(--board-border)"
                strokeDasharray="2 4"
              />
            ))}

            {/* Threshold edges */}
            {edges.map((edge) => (
              <g key={edge.key}>
                <line
                  x1={0}
                  x2={plotWidth}
                  y1={edge.y}
                  y2={edge.y}
                  stroke={
                    edge.critical
                      ? "var(--board-critical)"
                      : "var(--board-accent)"
                  }
                  strokeOpacity={0.55}
                  strokeDasharray={edge.critical ? "2 3" : "4 4"}
                />
                {!narrow ? (
                  <text
                    x={plotWidth + 8}
                    y={edge.labelY}
                    dy="0.32em"
                    className={cn(
                      "font-sans text-[0.625rem]",
                      edge.critical ? "fill-board-critical" : "fill-board-muted"
                    )}
                  >
                    {edge.label}
                    <tspan dx={4} className="fill-board-fg font-heading">
                      {format(edge.value)}
                    </tspan>
                  </text>
                ) : null}
              </g>
            ))}

            {/* Stretches with no readings */}
            {gaps.map((gap) => {
              const x = toX(gap.from)
              const w = toX(gap.to) - x
              return (
                <g key={`${gap.from}-${gap.to}`}>
                  <rect
                    x={x}
                    y={0}
                    width={Math.max(w, 0)}
                    height={innerHeight}
                    fill={`url(#${patternId})`}
                    opacity={0.8}
                  />
                  {w >= 56 ? (
                    <text
                      x={x + w / 2}
                      y={innerHeight - 6}
                      textAnchor="middle"
                      className="fill-board-muted font-sans text-[0.625rem]"
                    >
                      No data
                    </text>
                  ) : null}
                </g>
              )
            })}

            {/* Baseline + time labels */}
            <line
              x1={0}
              x2={plotWidth}
              y1={innerHeight}
              y2={innerHeight}
              stroke="var(--board-border-strong)"
            />
            {showXAxis
              ? xTicks.map((tick) => (
                  <g key={tick}>
                    <line
                      x1={toX(tick)}
                      x2={toX(tick)}
                      y1={innerHeight}
                      y2={innerHeight + 4}
                      stroke="var(--board-border-strong)"
                    />
                    <text
                      x={toX(tick)}
                      y={innerHeight + 16}
                      textAnchor="middle"
                      className="fill-board-muted font-heading text-[0.625rem] tabular-nums"
                    >
                      {formatTick(tick, xStep)}
                    </text>
                  </g>
                ))
              : null}

            {/* The line, once per zone */}
            <g opacity={isStale ? 0.5 : 1}>
              {(["nominal", "warning", "critical"] as const).map((zone) => (
                <g key={zone} clipPath={`url(#${clipIds[zone]})`}>
                  {runPaths.map((run) => (
                    <path
                      key={run.key}
                      d={run.d}
                      fill="none"
                      stroke={STATUS_COLOR[zone]}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ))}
                </g>
              ))}
              {singles.map((point) => (
                <circle
                  key={point.t}
                  cx={toX(point.t)}
                  cy={toY(point.v)}
                  r={2}
                  fill={STATUS_COLOR[severityFor(threshold, point.v)]}
                />
              ))}
              {pulse ? (
                <circle
                  cx={toX(last.t)}
                  cy={toY(last.v)}
                  r={4}
                  fill={lastColor}
                  opacity={0.6}
                >
                  <animate
                    attributeName="r"
                    values="4;9;4"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.6;0;0.6"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </circle>
              ) : null}
              <circle
                cx={toX(last.t)}
                cy={toY(last.v)}
                r={3.5}
                fill={lastColor}
                stroke="var(--board-bg)"
                strokeWidth={1.5}
              />
            </g>

            {/* Shared crosshair */}
            {activeX !== null ? (
              <g pointerEvents="none">
                <line
                  x1={activeX}
                  x2={activeX}
                  y1={0}
                  y2={innerHeight}
                  stroke="var(--board-muted)"
                  strokeWidth={1}
                />
                {showActivePoint && activePoint ? (
                  <circle
                    cx={toX(activePoint.t)}
                    cy={toY(activePoint.v)}
                    r={4.5}
                    fill={STATUS_COLOR[severityFor(threshold, activePoint.v)]}
                    stroke="var(--board-bg)"
                    strokeWidth={2}
                  />
                ) : null}
              </g>
            ) : null}

            <rect
              x={0}
              y={0}
              width={plotWidth}
              height={innerHeight}
              fill="transparent"
              className="cursor-crosshair"
              onPointerMove={handlePointer}
              onPointerDown={handlePointer}
              onPointerLeave={() => onActiveTime(null)}
            />
          </g>
        </svg>
      )}
    </div>
  )
}
