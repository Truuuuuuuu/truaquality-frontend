import { cn } from "cn"
import { usePondHistoryRange } from "@/hooks/use-ponds"
import type { Pond } from "@/lib/api"
import { formatDateTimeShort } from "@/lib/format-time"
import {
  DEFAULT_HISTORY_RANGE,
  resolveHistoryRange,
  type HistoryRangeValue,
} from "@/lib/history-range"
import { PARAMETER_ICONS } from "@/lib/parameters"
import { pondReadingStates } from "@/lib/pond-status"
import { STATUS_COLOR, STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"

type CombinedTrendChartProps = {
  pond: Pond
  now: number
  // Omit for the dashboard's fixed "live" 2 h view; pass the pond detail page's selected history range to
  // chart an arbitrary window instead.
  range?: HistoryRangeValue
}

const VIEW_WIDTH = 960
const HEIGHT = 240

// Percent-of-safe-range: 0% is a parameter's safeMin, 100% its safeMax. Plotting every parameter on
// this shared scale — instead of raw °C next to raw mg/L next to raw ppt — is what makes "combined"
// mean something: three lines drawn together read as "how close is each one to its own edge," not
// an apples-to-oranges overlay.
function toPercent(safeMin: number, safeMax: number, value: number): number {
  return ((value - safeMin) / (safeMax - safeMin)) * 100
}

// A pond's three parameters as one wide trend, normalized to percent-of-safe-range so differing
// units (°C, mg/L, ppt) share one axis. Each line's color is that parameter's current status
// (the same whole-tile-flood vocabulary as the parameter tiles above it), so a line reading red is
// unmistakable even at a glance across the whole chart.
export function CombinedTrendChart({
  pond,
  now,
  range = DEFAULT_HISTORY_RANGE,
}: CombinedTrendChartProps) {
  const historyByParameter = usePondHistoryRange(pond.id, range)
  const readings = pondReadingStates(pond, now, historyByParameter)
  const plottable = readings.filter(
    (entry) => entry.reading && entry.reading.history.length >= 2
  )

  const resolved = resolveHistoryRange(range, now)
  const domainStart = Date.parse(resolved.from)
  const domainEnd = resolved.to ? Date.parse(resolved.to) : now
  const toX = (t: number) => {
    const x = ((t - domainStart) / (domainEnd - domainStart)) * VIEW_WIDTH
    return Math.min(VIEW_WIDTH, Math.max(0, x))
  }

  const allPercents = plottable.flatMap(({ reading }) =>
    reading!.history.map((point) =>
      toPercent(reading!.threshold.safeMin, reading!.threshold.safeMax, point.v)
    )
  )
  const dataMin = Math.min(0, ...allPercents)
  const dataMax = Math.max(100, ...allPercents)
  const pad = (dataMax - dataMin) * 0.12 || 10
  const min = dataMin - pad
  const max = dataMax + pad
  const span = max - min || 1
  const toY = (percent: number) => HEIGHT - ((percent - min) / span) * HEIGHT

  const bandTop = toY(100)
  const bandBottom = toY(0)

  return (
    <div className="flex flex-col gap-4 border-t border-board-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase">
          Combined trend · {range.label}
        </h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {readings.map(({ parameter, reading }) => {
            const Icon = PARAMETER_ICONS[parameter.id]
            const color = STATUS_COLOR[reading?.status ?? "stale"]
            return (
              <div
                key={parameter.id}
                tabIndex={0}
                role="group"
                aria-label={
                  reading
                    ? `${parameter.label}: ${reading.current.toFixed(parameter.precision)} ${parameter.unit}, ${STATUS_LABELS[reading.status]}`
                    : `${parameter.label}: no readings yet`
                }
                className={cn(
                  "flex items-center gap-1.5 font-sans text-xs",
                  reading
                    ? STATUS_STYLES[reading.status].label
                    : "text-board-muted"
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
                <span className="font-medium tracking-[0.02em] uppercase">
                  {parameter.shortLabel}
                </span>
                <span className="font-heading tabular-nums">
                  {reading
                    ? `${reading.current.toFixed(parameter.precision)} ${parameter.unit}`
                    : "—"}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {plottable.length === 0 ? (
        <div
          tabIndex={0}
          role="group"
          aria-label="Not enough recent history to chart"
          className="flex items-center justify-center rounded-md border border-dashed border-board-border font-sans text-xs text-board-muted"
          style={{ height: HEIGHT }}
        >
          Not enough recent history to chart
        </div>
      ) : (
        <svg
          tabIndex={0}
          viewBox={`0 0 ${VIEW_WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-60 w-full overflow-visible"
          role="img"
          aria-label={`Combined trend for ${plottable.length} parameter${plottable.length === 1 ? "" : "s"}, normalized to percent of each parameter's safe range`}
        >
          <rect
            x={0}
            y={bandTop}
            width={VIEW_WIDTH}
            height={Math.max(bandBottom - bandTop, 0)}
            fill="var(--board-accent)"
            fillOpacity={0.05}
          />
          <line
            x1={0}
            x2={VIEW_WIDTH}
            y1={bandTop}
            y2={bandTop}
            stroke="var(--board-border-strong)"
            strokeDasharray="4 4"
          />
          <line
            x1={0}
            x2={VIEW_WIDTH}
            y1={bandBottom}
            y2={bandBottom}
            stroke="var(--board-border-strong)"
            strokeDasharray="4 4"
          />

          {plottable.map(({ parameter, reading }) => {
            const points = reading!.history
            const color = STATUS_COLOR[reading!.status]
            const path = points
              .map((point, i) => {
                const percent = toPercent(
                  reading!.threshold.safeMin,
                  reading!.threshold.safeMax,
                  point.v
                )
                return `${i === 0 ? "M" : "L"} ${toX(point.t).toFixed(1)} ${toY(percent).toFixed(1)}`
              })
              .join(" ")
            const last = points[points.length - 1]
            const lastPercent = toPercent(
              reading!.threshold.safeMin,
              reading!.threshold.safeMax,
              last.v
            )
            const isStale = reading!.status === "stale"

            return (
              <g key={parameter.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={isStale ? 0.5 : 1}
                />
                {!isStale ? (
                  <circle
                    cx={toX(last.t)}
                    cy={toY(lastPercent)}
                    r={4}
                    fill={color}
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
                  cy={toY(lastPercent)}
                  r={3}
                  fill={color}
                  opacity={isStale ? 0.6 : 1}
                />
              </g>
            )
          })}
        </svg>
      )}

      <div className="flex items-center justify-between font-heading text-[0.65rem] text-board-muted">
        <span>{formatDateTimeShort(domainStart)}</span>
        <span>{resolved.to ? formatDateTimeShort(domainEnd) : "Now"}</span>
      </div>
    </div>
  )
}
