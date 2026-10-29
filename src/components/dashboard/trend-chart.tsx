import * as React from "react"
import { cn } from "cn"
import { pendingScaleDomain, referenceScaleDomain } from "@/lib/chart-scale"
import { referenceResult, type DoReadingState } from "@/lib/do-display"
import type { ReadingPoint, ReadingStatus, Threshold } from "@/lib/parameters"
import { STATUS_COLOR } from "@/lib/status-styles"

type LegacyTrendChartProps = {
  points: ReadingPoint[]
  status: ReadingStatus
  threshold: Threshold
  precision: number
  height?: number
  className?: string
}

type ReferenceTrendChartProps = {
  reading: DoReadingState
  height?: number
  className?: string
}

export function TrendChart(
  props: LegacyTrendChartProps | ReferenceTrendChartProps
) {
  return "reading" in props ? (
    <ReferenceTrendChart {...props} />
  ) : (
    <LegacyTrendChart {...props} />
  )
}

function ReferenceTrendChart({
  reading,
  height = 72,
  className,
}: ReferenceTrendChartProps) {
  const id = React.useId().replace(/[^\w-]/g, "")
  const points = reading.history.filter(
    (point) => Number.isFinite(point.v) && Number.isFinite(point.t)
  )
  const reference =
    referenceResult(0, reading.normalReference) === null
      ? null
      : reading.normalReference
  const domain = referenceScaleDomain(
    reference,
    Math.min(...points.map((point) => point.v)),
    Math.max(...points.map((point) => point.v))
  )
  const scale = Math.max(Math.abs(domain.lo), Math.abs(domain.hi), 1)
  const toY = (value: number) =>
    height *
    (1 -
      (value / scale - domain.lo / scale) /
        (domain.hi / scale - domain.lo / scale))
  const toX = (index: number) =>
    points.length < 2
      ? VIEW_WIDTH / 2
      : (index / (points.length - 1)) * VIEW_WIDTH
  const path = points
    .map((point, index) => `${index ? "L" : "M"} ${toX(index)} ${toY(point.v)}`)
    .join(" ")
  const edgeY = reference ? toY(reference.boundary) : null
  const current = reading.currentReading
  const color = (value: number) =>
    !current || !reference
      ? "var(--board-muted)"
      : referenceResult(value, reference) === "within_reference"
        ? "var(--board-accent)"
        : "var(--board-warn)"
  return (
    <div className={cn("relative h-full w-full", className)}>
      <span className="sr-only">
        Dissolved oxygen reference comparison.{" "}
        {reference?.label ?? "Reference unavailable"}. Alert assessment pending.
      </span>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-label={`Dissolved oxygen trend, reference comparison. ${reference?.label ?? "Reference unavailable"}${current ? "" : ". No current DO reading"}`}
      >
        {edgeY !== null && current ? (
          <>
            <defs>
              <clipPath id={`${id}-above`}>
                <rect x={-3} y={-3} width={VIEW_WIDTH + 6} height={edgeY + 3} />
              </clipPath>
              <clipPath id={`${id}-below`}>
                <rect
                  x={-3}
                  y={edgeY}
                  width={VIEW_WIDTH + 6}
                  height={height - edgeY + 3}
                />
              </clipPath>
            </defs>
            <rect
              width={VIEW_WIDTH}
              height={edgeY}
              fill="var(--board-accent)"
              fillOpacity={0.06}
            />
            <rect
              y={edgeY}
              width={VIEW_WIDTH}
              height={height - edgeY}
              fill="var(--board-warn)"
              fillOpacity={0.06}
            />
            <line
              x2={VIEW_WIDTH}
              y1={edgeY}
              y2={edgeY}
              stroke="var(--board-muted)"
              strokeDasharray="4 4"
            />
            <path
              d={path}
              fill="none"
              stroke="var(--board-accent)"
              strokeWidth={2}
              clipPath={`url(#${id}-above)`}
            />
            <path
              d={path}
              fill="none"
              stroke="var(--board-warn)"
              strokeWidth={2}
              clipPath={`url(#${id}-below)`}
            />
            {points
              .slice(1)
              .map((point, index) =>
                point.v === reference?.boundary &&
                points[index].v === reference.boundary ? (
                  <path
                    key={index}
                    d={`M ${toX(index)} ${edgeY} L ${toX(index + 1)} ${edgeY}`}
                    fill="none"
                    stroke="var(--board-warn)"
                    strokeWidth={2}
                  />
                ) : null
              )}
          </>
        ) : (
          <path
            d={path}
            fill="none"
            stroke="var(--board-muted)"
            strokeWidth={2}
          />
        )}
        {points.map((point, index) => (
          <circle
            key={`${point.t}-${index}`}
            cx={toX(index)}
            cy={toY(point.v)}
            r={index === points.length - 1 ? 3 : 1.5}
            fill={color(point.v)}
          />
        ))}
      </svg>
      {!points.length ? (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-board-muted">
          No history received
        </span>
      ) : null}
      {!reference ? (
        <span className="text-xs text-board-muted">Reference unavailable</span>
      ) : null}
    </div>
  )
}

const VIEW_WIDTH = 320

function LegacyTrendChart({
  points,
  status,
  threshold,
  precision,
  height = 72,
  className,
}: LegacyTrendChartProps) {
  const gradientId = React.useId()

  // A line needs two points; a freshly assigned device or a long gap can leave fewer in the window.
  if (points.length < 2) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center rounded-md border border-dashed border-board-border font-sans text-[0.65rem] text-board-muted",
          className
        )}
      >
        Not enough recent history to chart
      </div>
    )
  }

  const { safeMin, safeMax } = threshold
  const values = points.map((p) => p.v)
  // While the critical line is pending the history charts fit the axis to the data, and the sparkline
  // shares that rule: a one-sided band keeps Safe max in view (so a 4 NTU pond isn't squashed against the
  // full sensor scale), and a two-sided band keeps both safe lines in view plus a margin.
  // Without the pending marker this falls back to the original safe-range-plus-15% domain.
  const fitted = pendingScaleDomain(
    threshold,
    Math.min(...values),
    Math.max(...values)
  )
  let min: number
  let max: number
  if (fitted) {
    min = fitted.lo
    max = fitted.hi
  } else {
    const dataMin = Math.min(...values, safeMin)
    const dataMax = Math.max(...values, safeMax)
    const pad = (dataMax - dataMin) * 0.15 || 1
    min = dataMin - pad
    max = dataMax + pad
  }
  const span = max - min || 1

  const toX = (i: number) => (i / (points.length - 1)) * VIEW_WIDTH
  const toY = (v: number) => height - ((v - min) / span) * height

  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.v).toFixed(1)}`
    )
    .join(" ")
  const areaPath = `${linePath} L ${VIEW_WIDTH} ${height} L 0 ${height} Z`

  const safeTopY = toY(Math.min(safeMax, max))
  const safeBottomY = toY(Math.max(safeMin, min))

  const last = points[points.length - 1]
  const color = STATUS_COLOR[status]
  // The SVG stretches non-uniformly (preserveAspectRatio="none") to fill the tile's box, which
  // would turn a plain SVG <circle> marker into an ellipse. Rendering the marker as a normal HTML
  // dot positioned by percentage keeps it a true circle regardless of that stretch.
  const markerTopPercent = (toY(last.v) / height) * 100

  return (
    <div className={cn("relative h-full w-full", className)}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
        role="img"
        aria-label={`Trend, most recent reading ${last.v.toFixed(precision)}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {status !== "stale" ? (
          <rect
            x={0}
            y={safeTopY}
            width={VIEW_WIDTH}
            height={Math.max(safeBottomY - safeTopY, 0)}
            fill="var(--board-accent)"
            fillOpacity={0.05}
          />
        ) : null}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={status === "stale" ? 0.5 : 1}
        />
      </svg>

      <span
        className="pointer-events-none absolute right-0 flex size-2.5 -translate-y-1/2 items-center justify-center"
        style={{ top: `${markerTopPercent}%` }}
      >
        {status !== "stale" ? (
          <span
            className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        ) : null}
        <span
          className="relative inline-flex size-2 rounded-full"
          style={{
            backgroundColor: color,
            opacity: status === "stale" ? 0.6 : 1,
          }}
          aria-hidden="true"
        />
      </span>
    </div>
  )
}
