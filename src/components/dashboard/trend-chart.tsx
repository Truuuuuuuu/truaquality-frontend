import * as React from "react"
import { cn } from "cn"
import type { ReadingPoint, ReadingStatus } from "@/lib/parameters"

const STATUS_COLOR: Record<ReadingStatus, string> = {
  nominal: "var(--board-accent)",
  warning: "var(--board-warn)",
  critical: "var(--board-critical)",
  stale: "var(--board-stale)",
}

type TrendChartProps = {
  points: ReadingPoint[]
  status: ReadingStatus
  safeMin: number
  safeMax: number
  precision: number
  height?: number
  className?: string
}

const VIEW_WIDTH = 320

export function TrendChart({
  points,
  status,
  safeMin,
  safeMax,
  precision,
  height = 72,
  className,
}: TrendChartProps) {
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

  const values = points.map((p) => p.v)
  const dataMin = Math.min(...values, safeMin)
  const dataMax = Math.max(...values, safeMax)
  const pad = (dataMax - dataMin) * 0.15 || 1
  const min = dataMin - pad
  const max = dataMax + pad
  const span = max - min || 1

  const toX = (i: number) => (i / (points.length - 1)) * VIEW_WIDTH
  const toY = (v: number) => height - ((v - min) / span) * height

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.v).toFixed(1)}`).join(" ")
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
          style={{ backgroundColor: color, opacity: status === "stale" ? 0.6 : 1 }}
          aria-hidden="true"
        />
      </span>
    </div>
  )
}
