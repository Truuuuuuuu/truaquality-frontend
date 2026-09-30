import * as React from "react"
import { Gauge } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  MARGIN_LEFT,
  ParameterHistoryChart,
  plotWidthFor,
} from "@/components/ponds/parameter-history-chart"
import { useElementWidth } from "@/hooks/use-element-width"
import { usePondAnalysisRange, usePondHistoryRange } from "@/hooks/use-ponds"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import type { Pond } from "@/lib/api"
import {
  formatTooltipTime,
  gapToleranceMs,
  nearestPoint,
} from "@/lib/chart-time"
import { formatDateTimeShort } from "@/lib/format-time"
import {
  DEFAULT_HISTORY_RANGE,
  resolveHistoryRange,
  type HistoryRangeValue,
} from "@/lib/history-range"
import {
  PARAMETER_ICONS,
  severityFor,
  type ParameterConfig,
  type ReadingState,
} from "@/lib/parameters"
import { formatReading } from "@/lib/reading-format"
import { pondReadingStates, type PondReadingEntry } from "@/lib/pond-status"
import { STATUS_COLOR, STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"

type PondHistoryChartsProps = {
  pond: Pond
  now: number
  // Omit for the dashboard's fixed "live" 2 h view; the pond detail page passes its selected range.
  range?: HistoryRangeValue
  // Shorter plots, for the dashboard's selected-pond panel.
  compact?: boolean
}

// Fixed so the tooltip can be kept inside the stack arithmetically, with no measuring pass — at phone
// width a free-sized tooltip would push the page into horizontal scroll.
const TOOLTIP_WIDTH = 208
const TOOLTIP_OFFSET = 12

type Plottable = PondReadingEntry & { reading: ReadingState }

// A pond's history as one chart per parameter, stacked on a single time axis. The stack shares one
// crosshair, one tooltip, and one keyboard focus stop, so reading across parameters at a moment in time
// is a vertical glance rather than a comparison between separate widgets.
export function PondHistoryCharts({
  pond,
  now,
  range = DEFAULT_HISTORY_RANGE,
  compact = false,
}: PondHistoryChartsProps) {
  const historyByParameter = usePondHistoryRange(pond.id, range)
  const { data: analysis } = usePondAnalysisRange(pond.id, range)
  // "Last 24h" compares against "prev. 24h"; a custom range just against the period before it.
  const comparisonLabel =
    range.kind === "rolling"
      ? `prev. ${range.label.replace(/^Last\s+/, "")}`
      : "prev. period"
  const readings = pondReadingStates(pond, now, historyByParameter)
  const plottable = readings.filter(
    (entry): entry is Plottable =>
      entry.reading !== null && entry.reading.history.length >= 2
  )
  const lastPlottedId = plottable.at(-1)?.parameter.id

  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const reducedMotion = usePrefersReducedMotion()
  const titleId = `phc-${React.useId().replace(/[^\w-]/g, "")}-title`
  const [activeTime, setActiveTime] = React.useState<number | null>(null)
  // Where the pointer is within the stack, so the tooltip sits beside the chart being hovered instead
  // of always at the top of a tall stack. Null while stepping by keyboard.
  const [pointer, setPointer] = React.useState<{
    y: number
    height: number
  } | null>(null)

  const resolved = resolveHistoryRange(range, now)
  const domainStart = Date.parse(resolved.from)
  const domainEnd = resolved.to ? Date.parse(resolved.to) : now
  const isLive = !resolved.to

  const plotWidth = plotWidthFor(width)
  const toX = (t: number) => {
    const x = ((t - domainStart) / (domainEnd - domainStart)) * plotWidth
    return Math.min(plotWidth, Math.max(0, x))
  }

  const toleranceMs = gapToleranceMs(plottable.map((e) => e.reading.history))
  const allTimes = [
    ...new Set(
      plottable.flatMap(({ reading }) => reading.history.map((p) => p.t))
    ),
  ].sort((a, b) => a - b)

  // Hover snaps to the nearest real reading time, so the crosshair never sits between two readings
  // claiming a value nobody measured.
  const handleActiveTime = (t: number | null) => {
    if (t === null || allTimes.length === 0) {
      setActiveTime(null)
      return
    }
    setActiveTime(
      nearestPoint(
        allTimes.map((time) => ({ t: time, v: 0 })),
        t
      ).t
    )
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (allTimes.length === 0) return
    const index = activeTime === null ? -1 : allTimes.indexOf(activeTime)
    const stepBy = event.shiftKey ? 10 : 1
    let next: number | null = null
    if (event.key === "ArrowRight")
      next =
        index < 0
          ? allTimes.length - 1
          : Math.min(index + stepBy, allTimes.length - 1)
    else if (event.key === "ArrowLeft")
      next = index < 0 ? allTimes.length - 1 : Math.max(index - stepBy, 0)
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = allTimes.length - 1
    else if (event.key === "Escape") {
      setActiveTime(null)
      return
    }
    if (next === null) return
    event.preventDefault()
    setPointer(null)
    setActiveTime(allTimes[next])
  }

  const hovered =
    activeTime === null
      ? []
      : plottable.map(({ parameter, reading }) => {
          const point = nearestPoint(reading.history, activeTime)
          const near = Math.abs(point.t - activeTime) <= toleranceMs / 2
          return {
            parameter,
            value: near ? point.v : null,
            severity: near ? severityFor(reading.threshold, point.v) : null,
          }
        })

  const announcement =
    activeTime === null
      ? ""
      : `${formatTooltipTime(activeTime)}: ${hovered
          .map(({ parameter, value, severity }) =>
            value === null || severity === null
              ? `${parameter.label}, no reading`
              : `${parameter.label} ${formatReading(parameter, value).spoken}, ${STATUS_LABELS[severity]}`
          )
          .join("; ")}`

  let tooltipStyle: React.CSSProperties | undefined
  if (activeTime !== null && width > 0) {
    const anchor = MARGIN_LEFT + toX(activeTime)
    let left = anchor + TOOLTIP_OFFSET
    if (left + TOOLTIP_WIDTH > width)
      left = anchor - TOOLTIP_OFFSET - TOOLTIP_WIDTH
    left = Math.max(0, Math.min(left, width - TOOLTIP_WIDTH))
    tooltipStyle = { left, width: Math.min(TOOLTIP_WIDTH, width) }
    if (!pointer) tooltipStyle.top = 0
    else if (pointer.y < pointer.height / 2)
      tooltipStyle.top = pointer.y + TOOLTIP_OFFSET
    else tooltipStyle.bottom = pointer.height - pointer.y + TOOLTIP_OFFSET
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    setPointer({ y: event.clientY - box.top, height: box.height })
  }

  const interactive = plottable.length > 0

  return (
    // The pond detail page wraps this in its own titled History section; only the dashboard's compact
    // variant carries a heading of its own.
    <div
      className={cn(
        "flex flex-col gap-4",
        compact && "border-t border-board-border pt-6"
      )}
    >
      {compact ? (
        <div className="flex items-center gap-2">
          <h2
            id={titleId}
            className="font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase"
          >
            Historical trends
          </h2>
          <span className="rounded-md border border-board-border-strong px-1.5 py-0.5 font-heading text-[0.65rem] tracking-[0.02em] text-board-muted">
            {range.label}
          </span>
        </div>
      ) : null}

      <div ref={containerRef} className="relative w-full min-w-0">
        <div
          tabIndex={interactive ? 0 : undefined}
          role="group"
          aria-label={
            interactive
              ? `History charts for ${plottable.length} parameter${plottable.length === 1 ? "" : "s"}, ${range.label}. Use the left and right arrow keys to step through readings, Shift to move ten at a time, Home and End to jump to the first or last reading, and Escape to clear.`
              : `History, ${range.label}`
          }
          onKeyDown={interactive ? handleKeyDown : undefined}
          onBlur={() => setActiveTime(null)}
          onPointerMove={interactive ? handlePointerMove : undefined}
          onPointerLeave={() => setPointer(null)}
          className={cn(
            "flex flex-col",
            compact ? "gap-4" : "gap-6",
            interactive &&
              "rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-board-muted"
          )}
        >
          {readings.map(({ parameter, reading, signal }) =>
            reading === null && signal === "not_reported" ? (
              <EmptyRow
                key={parameter.id}
                parameter={parameter}
                message="Not reported by this unit"
              />
            ) : reading === null ? (
              <EmptyRow
                key={parameter.id}
                parameter={parameter}
                message="No readings yet"
              />
            ) : reading.history.length < 2 ? (
              <EmptyRow
                key={parameter.id}
                parameter={parameter}
                message="Not enough history in this range"
              />
            ) : (
              <ParameterHistoryChart
                key={parameter.id}
                reading={reading}
                domainStart={domainStart}
                domainEnd={domainEnd}
                width={width}
                activeTime={activeTime}
                onActiveTime={handleActiveTime}
                showXAxis={parameter.id === lastPlottedId}
                isLive={isLive}
                reducedMotion={reducedMotion}
                compact={compact}
                toleranceMs={toleranceMs}
                analysis={analysis?.parameters[parameter.id] ?? null}
                comparisonLabel={comparisonLabel}
              />
            )
          )}
        </div>

        {tooltipStyle && activeTime !== null ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 flex flex-col gap-1.5 rounded-md border border-board-border-strong bg-board-panel px-3 py-2 shadow-lg"
            style={tooltipStyle}
          >
            <span className="font-heading text-[0.65rem] text-board-muted tabular-nums">
              {formatTooltipTime(activeTime)}
            </span>
            {hovered.map(({ parameter, value, severity }) => (
              <div
                key={parameter.id}
                className="flex items-center gap-2 font-sans text-xs"
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background:
                      severity === null
                        ? STATUS_COLOR.stale
                        : STATUS_COLOR[severity],
                  }}
                />
                <span className="truncate text-board-muted">
                  {parameter.shortLabel}
                </span>
                <span className="ml-auto font-heading text-board-fg tabular-nums">
                  {value === null ? "—" : formatReading(parameter, value).text}
                </span>
                <span
                  className={cn(
                    "w-14 shrink-0 text-right text-[0.65rem]",
                    severity === null
                      ? "text-board-muted"
                      : STATUS_STYLES[severity].label
                  )}
                >
                  {severity === null ? "No data" : STATUS_LABELS[severity]}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <span role="status" className="sr-only">
          {announcement}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 font-sans text-[0.65rem] text-board-muted">
        <span className="font-heading tabular-nums">
          {formatDateTimeShort(domainStart)} →{" "}
          {isLive ? "now" : formatDateTimeShort(domainEnd)}
        </span>
        {interactive ? (
          <span className="hidden sm:inline">
            Hover or use arrow keys for exact readings
          </span>
        ) : null}
      </div>
    </div>
  )
}

function EmptyRow({
  parameter,
  message,
}: {
  parameter: ParameterConfig
  message: string
}) {
  const Icon = PARAMETER_ICONS[parameter.id] ?? Gauge
  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`${parameter.label}: ${message.toLowerCase()}`}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-dashed border-board-border-strong bg-board-panel/60 px-4 py-3"
    >
      <span className="flex items-center gap-2 text-board-stale">
        <Icon className="size-3.5 shrink-0" />
        <span className="font-sans text-xs font-medium tracking-[0.08em] uppercase">
          {parameter.label}
        </span>
      </span>
      <span className="font-sans text-xs text-board-muted">{message}</span>
    </div>
  )
}
