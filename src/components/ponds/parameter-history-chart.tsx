/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { useDisplayPreferences } from "@/context/display-preferences-context"
import { Gauge, MoveRight, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AnyParameterAnalysis, SeriesResolution } from "@/lib/api"
import { referenceResult, type DoReadingState } from "@/lib/do-display"
import {
  formatTick,
  nearestPoint,
  splitRuns,
  timeTicks,
} from "@/lib/chart-time"
import {
  PARAMETER_ICONS,
  severityFor,
  type ReadingState,
} from "@/lib/parameters"
import {
  hasLowSide,
  pendingScaleDomain,
  referenceScaleDomain,
  valueTicks,
} from "@/lib/chart-scale"
import { keepsCase } from "@/lib/pond-status"
import { formatStatValue } from "@/lib/reading-format"
import { STATUS_COLOR, STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"

type ParameterHistoryChartProps = {
  reading: ReadingState | DoReadingState
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
  // Server-computed analysis of this range; null until it loads (or when the server has none).
  analysis: AnyParameterAnalysis | null
  comparisonLabel: string
  referenceResolution?: SeriesResolution
}

export function ParameterHistoryChart(props: ParameterHistoryChartProps) {
  return "kind" in props.reading && props.reading.kind === "reference" ? (
    <ReferenceHistoryChart {...props} reading={props.reading} />
  ) : (
    <LegacyParameterHistoryChart
      {...props}
      reading={props.reading as ReadingState}
    />
  )
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

export function formatShare(share: number) {
  if (share === 0) return "0%"
  if (share < 0.01) return "<1%"
  return `${Math.round(share * 100)}%`
}

function ReferenceHistoryChart({
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
  analysis,
  comparisonLabel,
  referenceResolution,
}: Omit<ParameterHistoryChartProps, "reading"> & { reading: DoReadingState }) {
  const id = `do-${React.useId().replace(/[^\w-]/g, "")}`
  const history = reading.history.filter(
    (point) => Number.isFinite(point.v) && Number.isFinite(point.t)
  )
  const reference =
    referenceResult(0, reading.normalReference) === null
      ? null
      : reading.normalReference
  const domain = referenceScaleDomain(
    reference,
    Math.min(...history.map((point) => point.v)),
    Math.max(...history.map((point) => point.v))
  )
  const plotWidth = plotWidthFor(width)
  const innerHeight = compact ? PLOT_HEIGHT_COMPACT : PLOT_HEIGHT
  const height = chartHeightFor(compact, showXAxis)
  const scale = Math.max(Math.abs(domain.lo), Math.abs(domain.hi), 1)
  const toY = (value: number) =>
    innerHeight *
    (1 -
      (value / scale - domain.lo / scale) /
        (domain.hi / scale - domain.lo / scale))
  const toX = (time: number) =>
    Math.min(
      plotWidth,
      Math.max(
        0,
        ((time - domainStart) / Math.max(domainEnd - domainStart, 1)) *
          plotWidth
      )
    )
  const edgeY = reference ? toY(reference.boundary) : null
  const color = (value: number) =>
    referenceResult(value, reference) === "within_reference"
      ? "var(--board-accent)"
      : reference
        ? "var(--board-warn)"
        : "var(--board-muted)"
  const runs = splitRuns(history, toleranceMs)
  const paths = runs
    .filter((run) => run.length > 1)
    .map((run) => ({
      key: run[0].t,
      d: run
        .map(
          (point, index) =>
            `${index ? "L" : "M"} ${toX(point.t)} ${toY(point.v)}`
        )
        .join(" "),
    }))
  const singles = runs.filter((run) => run.length === 1).map((run) => run[0])
  const last = history.at(-1)
  const gaps: { from: number; to: number }[] = []
  if (!history.length) gaps.push({ from: domainStart, to: domainEnd })
  else {
    if (history[0].t - domainStart > toleranceMs)
      gaps.push({ from: domainStart, to: history[0].t })
    for (let index = 1; index < runs.length; index++)
      gaps.push({ from: runs[index - 1].at(-1)!.t, to: runs[index][0].t })
    if (last && domainEnd - last.t > toleranceMs)
      gaps.push({ from: last.t, to: domainEnd })
  }
  const { ticks: xTicks, step: xStep } = timeTicks(
    domainStart,
    domainEnd,
    Math.max(2, Math.floor(plotWidth / 96))
  )
  const activePoint =
    activeTime === null ? null : nearestPoint(history, activeTime)
  const showActive =
    activePoint &&
    activeTime !== null &&
    Math.abs(activePoint.t - activeTime) <= toleranceMs / 2
  const doAnalysis = analysis && "thresholdState" in analysis ? analysis : null
  const comparison = doAnalysis?.referenceComparison
  const format = (value: number) => formatStatValue(reading.parameter, value)
  const change = doAnalysis?.previousChange
  const signed = (value: number) =>
    `${value > 0 ? "+" : value < 0 ? "−" : ""}${format(Math.abs(value))}`
  const shareBasis = comparison?.approximate
    ? `Approximate; count-weighted ${referenceResolution === "day" ? "daily" : referenceResolution === "hour" ? "hourly" : "hourly/daily"} bucket averages, not individual samples`
    : "Raw samples"
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="font-sans text-xs font-medium text-board-fg">
            {reading.parameter.label}
          </h3>
          <span className="font-heading text-xs text-board-muted">
            {reading.parameter.unit}
          </span>
          <span className="font-sans text-xs text-board-muted">
            Alert assessment pending
          </span>
          <span className="font-sans text-xs text-board-muted">
            {reference?.label ?? "Reference unavailable"}
          </span>
          {!reading.currentReading && isLive ? (
            <span className="font-sans text-xs text-board-muted">
              No current DO reading
            </span>
          ) : null}
        </div>
        {analysis ? (
          <dl className="flex flex-wrap gap-x-3 gap-y-1 font-sans text-xs text-board-muted">
            {[
              {
                label: "Lowest DO",
                value: analysis.min,
                tint:
                  comparison?.minimumResult === "within_reference"
                    ? "text-board-accent"
                    : comparison?.minimumResult === "outside_reference"
                      ? "text-board-warn"
                      : "text-board-muted",
              },
              { label: "Max", value: analysis.max, tint: "text-board-fg" },
              { label: "Avg", value: analysis.avg, tint: "text-board-fg" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-1">
                <dt>{stat.label}</dt>
                <dd className={cn("font-heading tabular-nums", stat.tint)}>
                  {format(stat.value)}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline gap-1">
              <dt>Change vs {comparisonLabel}</dt>
              <dd className="font-heading text-board-fg tabular-nums">
                {typeof change === "number" && Number.isFinite(change)
                  ? `${signed(change)} ${reading.parameter.unit}`
                  : "Unavailable"}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-1">
              <dt>Outside normal range</dt>
              <dd className="font-heading text-board-fg tabular-nums">
                {typeof comparison?.outsideShare === "number" &&
                Number.isFinite(comparison.outsideShare)
                  ? formatShare(comparison.outsideShare)
                  : "Unavailable"}
              </dd>
              <dd className="w-full basis-full text-board-muted">
                {comparison ? shareBasis : "Reference comparison unavailable"}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
      {width === 0 ? (
        <div style={{ height }} />
      ) : (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Dissolved oxygen historical reference comparison. ${reference?.label ?? "Reference unavailable"}. Alert assessment pending.`}
          className="block overflow-visible"
        >
          <defs>
            {edgeY !== null ? (
              <>
                <clipPath id={`${id}-above`}>
                  <rect
                    x={-6}
                    y={-6}
                    width={plotWidth + 12}
                    height={edgeY + 6}
                  />
                </clipPath>
                <clipPath id={`${id}-below`}>
                  <rect
                    x={-6}
                    y={edgeY}
                    width={plotWidth + 12}
                    height={innerHeight - edgeY + 6}
                  />
                </clipPath>
              </>
            ) : null}
            <pattern
              id={`${id}-gap`}
              width={6}
              height={6}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                y2={6}
                stroke="var(--board-border-strong)"
                strokeWidth={1.5}
              />
            </pattern>
          </defs>
          <g transform={`translate(${MARGIN_LEFT} ${MARGIN_TOP})`}>
            {edgeY !== null ? (
              <>
                <rect
                  width={plotWidth}
                  height={edgeY}
                  fill="var(--board-accent)"
                  fillOpacity={0.08}
                />
                <rect
                  y={edgeY}
                  width={plotWidth}
                  height={innerHeight - edgeY}
                  fill="var(--board-warn)"
                  fillOpacity={0.07}
                />
                <line
                  x2={plotWidth}
                  y1={edgeY}
                  y2={edgeY}
                  stroke="var(--board-muted)"
                  strokeDasharray="4 4"
                />
              </>
            ) : null}
            {domain.ticks.map((tick) => (
              <text
                key={tick}
                x={-8}
                y={toY(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-board-muted font-heading text-[0.625rem] tabular-nums"
              >
                {tick.toFixed(
                  Math.min(domain.decimals, reading.parameter.precision)
                )}
              </text>
            ))}
            {xTicks.map((tick) => (
              <line
                key={tick}
                x1={toX(tick)}
                x2={toX(tick)}
                y2={innerHeight}
                stroke="var(--board-border)"
                strokeDasharray="2 4"
              />
            ))}
            {gaps.map((gap) => (
              <g key={`${gap.from}-${gap.to}`}>
                <rect
                  x={toX(gap.from)}
                  width={Math.max(0, toX(gap.to) - toX(gap.from))}
                  height={innerHeight}
                  fill={`url(#${id}-gap)`}
                />
                {toX(gap.to) - toX(gap.from) >= 56 ? (
                  <text
                    x={(toX(gap.from) + toX(gap.to)) / 2}
                    y={innerHeight - 6}
                    textAnchor="middle"
                    className="fill-board-muted font-sans text-[0.625rem]"
                  >
                    No data
                  </text>
                ) : null}
              </g>
            ))}
            {reference
              ? ["above", "below"].map((zone) => (
                  <g key={zone} clipPath={`url(#${id}-${zone})`}>
                    {paths.map((path) => (
                      <path
                        key={path.key}
                        d={path.d}
                        fill="none"
                        stroke={
                          zone === "above"
                            ? "var(--board-accent)"
                            : "var(--board-warn)"
                        }
                        strokeWidth={2}
                        strokeLinejoin="round"
                      />
                    ))}
                  </g>
                ))
              : paths.map((path) => (
                  <path
                    key={path.key}
                    d={path.d}
                    fill="none"
                    stroke="var(--board-muted)"
                    strokeWidth={2}
                  />
                ))}
            {reference
              ? runs.flatMap((run) =>
                  run
                    .slice(1)
                    .map((point, index) =>
                      point.v === reference.boundary &&
                      run[index].v === reference.boundary ? (
                        <path
                          key={`${run[index].t}-${point.t}`}
                          d={`M ${toX(run[index].t)} ${edgeY} L ${toX(point.t)} ${edgeY}`}
                          fill="none"
                          stroke="var(--board-warn)"
                          strokeWidth={2}
                        />
                      ) : null
                    )
                )
              : null}
            {singles.map((point) => (
              <circle
                key={point.t}
                cx={toX(point.t)}
                cy={toY(point.v)}
                r={2}
                fill={color(point.v)}
              />
            ))}
            {last ? (
              <circle
                cx={toX(last.t)}
                cy={toY(last.v)}
                r={3.5}
                fill={
                  isLive && !reading.currentReading
                    ? "var(--board-muted)"
                    : color(last.v)
                }
                stroke="var(--board-bg)"
                strokeWidth={1.5}
              >
                {isLive && reading.currentReading && !reducedMotion ? (
                  <animate
                    attributeName="r"
                    values="3.5;5;3.5"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                ) : null}
              </circle>
            ) : null}
            <line
              x2={plotWidth}
              y1={innerHeight}
              y2={innerHeight}
              stroke="var(--board-border-strong)"
            />
            {showXAxis
              ? xTicks.map((tick) => (
                  <text
                    key={tick}
                    x={toX(tick)}
                    y={innerHeight + 16}
                    textAnchor="middle"
                    className="fill-board-muted font-heading text-[0.625rem] tabular-nums"
                  >
                    {formatTick(tick, xStep)}
                  </text>
                ))
              : null}
            {activeTime !== null ? (
              <g pointerEvents="none">
                <line
                  x1={toX(activeTime)}
                  x2={toX(activeTime)}
                  y2={innerHeight}
                  stroke="var(--board-muted)"
                />
                {showActive ? (
                  <circle
                    cx={toX(activePoint.t)}
                    cy={toY(activePoint.v)}
                    r={4.5}
                    fill={color(activePoint.v)}
                    stroke="var(--board-bg)"
                    strokeWidth={2}
                  />
                ) : null}
              </g>
            ) : null}
            <rect
              width={plotWidth}
              height={innerHeight}
              fill="transparent"
              onPointerMove={(event) => {
                const box = event.currentTarget.getBoundingClientRect()
                onActiveTime(
                  domainStart +
                    ((event.clientX - box.left) / Math.max(box.width, 1)) *
                      (domainEnd - domainStart)
                )
              }}
              onPointerLeave={() => onActiveTime(null)}
            />
          </g>
        </svg>
      )}
    </div>
  )
}

// `clipOnly` bands color the line but paint no zone tint.
type Band = { y1: number; y2: number; clipOnly?: boolean }

// One parameter's history in its own units, drawn against its own safe and critical edges. The line is
// painted three times through zone clip paths, so each stretch takes the color of the zone it passes
// through — a past excursion stays amber or red on the chart even after the reading has recovered.
function LegacyParameterHistoryChart({
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
  analysis,
  comparisonLabel,
}: Omit<ParameterHistoryChartProps, "reading"> & { reading: ReadingState }) {
  const { simpleMode } = useDisplayPreferences()
  const { parameter, threshold, history } = reading
  const Icon = PARAMETER_ICONS[parameter.id] ?? Gauge
  const baseId = `phc-${React.useId().replace(/[^\w-]/g, "")}`
  const patternId = `${baseId}-gap`
  const clipIds = {
    nominal: `${baseId}-safe`,
    warning: `${baseId}-warn`,
    critical: `${baseId}-crit`,
  }

  // The axis fits the plotted points themselves — rendering, not analysis.
  const dataMin = Math.min(...history.map((p) => p.v))
  const dataMax = Math.max(...history.map((p) => p.v))
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
  const fitted = pendingScaleDomain(threshold, dataMin, dataMax)
  let lo: number
  let hi: number
  if (fitted) {
    lo = fitted.lo
    hi = fitted.hi
  } else {
    const dataLo = Math.min(dataMin, threshold.criticalMin, threshold.safeMin)
    const dataHi = Math.max(dataMax, threshold.criticalMax, threshold.safeMax)
    const pad = (dataHi - dataLo) * 0.1 || 1
    lo = dataLo - pad
    hi = dataHi + pad
  }
  const toY = (v: number) => innerHeight - ((v - lo) / (hi - lo)) * innerHeight
  const clampY = (y: number) => Math.min(innerHeight, Math.max(0, y))

  // A two-sided pending band hands back the step its axis was padded to, so ticks land on every step in
  // the detail chart and every other step in the compact one. Without a step the tick count is unchanged.
  // The fixed step only holds while it fits: a far out-of-range pH (probe out of the water, a dead buffer)
  // stretches the axis to 0-14, and at a 0.5 step the labels would print over each other on exactly the
  // chart meant to show the excursion. Past one margin's stretch beyond the normal safe-band count (9
  // steps on the detail chart, 5 on the compact one, about 15 px a label), valueTicks picks its own
  // coarser round step instead.
  const maxTickSteps = compact ? 5 : 9
  const stepped = fitted?.step
    ? Math.round((hi - lo) / (compact ? fitted.step * 2 : fitted.step))
    : null
  const tickTarget =
    stepped === null ? (compact ? 2 : 4) : Math.min(stepped, maxTickSteps)
  const { ticks: yTicks, decimals } = valueTicks(lo, hi, tickTarget)
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
  // bottom isn't shaved off. While the critical line is pending (D-02) nothing outside the safe band is
  // called critical: the warning band runs open-ended to the plot top, and below the safe min it runs
  // open-ended to the plot bottom. A parameter with no low side (safe floor equals critical floor) gets
  // no low-side bands at all.
  // With no low side and nothing below the floor, the axis bottom is the safe floor itself (0 NTU, the
  // clear-water reading the firmware clamps to), so the nominal band overshoots the plot bottom like
  // every other edge band; ending it exactly there would clip half the stroke of a line lying on it.
  const zones: Record<"nominal" | "warning" | "critical", Band[]> = pending
    ? {
        nominal: [
          {
            y1: ySafeMax,
            y2: ySafeMin >= innerHeight ? innerHeight + 10 : ySafeMin,
          },
        ],
        warning: [
          { y1: -10, y2: ySafeMax },
          ...(lowSide ? [{ y1: ySafeMin, y2: innerHeight + 10 }] : []),
        ],
        // The backend still judges a value above the placeholder critical (severityFor is unchanged
        // while pending, D-03), so the line turns red past either placeholder to match the header,
        // markers and alert. Both sides are clip-only, so no critical band is drawn (D-02), and each sits
        // off the plot unless the data actually goes past its placeholder. Painted after warning, so it
        // wins where they overlap.
        critical: [
          { y1: -10, y2: yCritMax, clipOnly: true },
          ...(lowSide
            ? [{ y1: yCritMin, y2: innerHeight + 10, clipOnly: true }]
            : []),
        ],
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
  // A pending critical line on either side has no line or label (its value is a placeholder, and keeping it
  // out also stops the overflow nudge dragging labels toward it), and a parameter with no low side draws no
  // Safe min / Crit min.
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
      if (edge.key === "critMin") return lowSide && !pending
      if (edge.key === "safeMin") return lowSide
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
  const signed = (v: number) => {
    const text = Math.abs(v).toFixed(parameter.precision)
    // A change that rounds to zero shouldn't read as "+0.0" or "−0.0".
    if (Number(text) === 0) return `±${text}`
    return `${v > 0 ? "+" : "−"}${text}`
  }
  const TrendIcon =
    analysis?.trend?.direction === "rising"
      ? TrendingUp
      : analysis?.trend?.direction === "falling"
        ? TrendingDown
        : MoveRight

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 shrink-0 self-center text-board-muted" />
          <h3
            className={cn(
              "font-sans text-xs font-medium tracking-[0.08em] text-board-fg",
              keepsCase(parameter.label) ? null : "uppercase"
            )}
          >
            {parameter.label}
          </h3>
          {parameter.unit || parameter.approximate ? (
            <span className="inline-flex items-baseline gap-1">
              {parameter.unit ? (
                <span className="font-heading text-xs text-board-muted">
                  {parameter.unit}
                </span>
              ) : null}
              {parameter.approximate ? (
                <span className="font-sans text-xs text-board-muted">
                  approx.
                </span>
              ) : null}
            </span>
          ) : null}
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
        {!simpleMode && analysis ? (
          <dl className="flex flex-wrap gap-x-3 gap-y-0.5 font-sans text-xs text-board-muted">
            {[
              { label: "Min", value: format(analysis.min) },
              { label: "Max", value: format(analysis.max) },
              { label: "Avg", value: format(analysis.avg) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline gap-1">
                <dt>{label}</dt>
                <dd className="font-heading text-board-fg tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
            {analysis.previousAvg !== null ? (
              <div className="flex items-baseline gap-1">
                {/* Visually "+0.6 vs prev. 24h"; the term still precedes its value for assistive tech. */}
                <dt className="order-last">vs {comparisonLabel}</dt>
                <dd className="font-heading text-board-fg tabular-nums">
                  {signed(analysis.avg - analysis.previousAvg)}
                </dd>
              </div>
            ) : null}
            <div className="flex items-baseline gap-1">
              <dt>Trend</dt>
              {analysis.trend ? (
                <dd className="flex items-center gap-1 text-board-fg">
                  <TrendIcon
                    aria-hidden="true"
                    className="size-3.5 self-center"
                  />
                  <span className="capitalize">{analysis.trend.direction}</span>
                  <span className="font-heading tabular-nums">
                    {signed(analysis.trend.rate)}
                    {parameter.unit ? ` ${parameter.unit}` : ""}/
                    {analysis.trend.rateUnit}
                  </span>
                </dd>
              ) : (
                <dd>not enough data</dd>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              {/* Visually "4% out of range", but the term still precedes its value for assistive tech. */}
              <dt className="order-last">out of range</dt>
              <dd
                className={cn(
                  "font-heading tabular-nums",
                  analysis.worst === null
                    ? "text-board-muted"
                    : STATUS_STYLES[analysis.worst].value
                )}
              >
                {analysis.outOfRangeShare === null
                  ? "Not assessed"
                  : formatShare(analysis.outOfRangeShare)}
              </dd>
            </div>
          </dl>
        ) : null}
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
                if (band.clipOnly) return null
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
            {!simpleMode &&
              xTicks.map((tick) => (
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
            {!simpleMode &&
              edges.map((edge) => (
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
                        edge.critical
                          ? "fill-board-critical"
                          : "fill-board-muted"
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

            {/* Shared crosshair. Positioned by CSS transform rather than x1/cx so the move between readings
                can transition — Safari doesn't animate SVG geometry attributes as CSS properties. Kept short
                so the dot still feels attached to the pointer. */}
            {activeX !== null ? (
              <g pointerEvents="none">
                <line
                  x1={0}
                  x2={0}
                  y1={0}
                  y2={innerHeight}
                  stroke="var(--board-muted)"
                  strokeWidth={1}
                  style={{ transform: `translateX(${activeX}px)` }}
                  className="motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out"
                />
                {showActivePoint && activePoint ? (
                  <circle
                    cx={0}
                    cy={0}
                    r={4.5}
                    fill={STATUS_COLOR[severityFor(threshold, activePoint.v)]}
                    stroke="var(--board-bg)"
                    strokeWidth={2}
                    style={{
                      transform: `translate(${toX(activePoint.t)}px, ${toY(activePoint.v)}px)`,
                    }}
                    className="motion-safe:transition-[transform,fill] motion-safe:duration-150 motion-safe:ease-out"
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
