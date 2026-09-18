import type { ComponentType } from "react"
import { cn } from "cn"
import { formatRelative } from "@/lib/format-time"
import type { ReadingState } from "@/lib/parameters"
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"
import { StatusStamp } from "./status-stamp"
import { TrendChart } from "./trend-chart"

type ParameterTileProps = {
  reading: ReadingState
  now: number
  icon: ComponentType<{ className?: string }>
}

export function ParameterTile({
  reading,
  now,
  icon: Icon,
}: ParameterTileProps) {
  const { parameter, threshold, current, history, status, updatedAt } = reading
  const styles = STATUS_STYLES[status]

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`${parameter.label}: ${current.toFixed(parameter.precision)} ${parameter.unit}, ${STATUS_LABELS[status]}, updated ${formatRelative(updatedAt, now)}`}
      className={cn(
        "board-groove flex flex-col gap-4 rounded-xl border p-5 transition-colors duration-500",
        styles.tile
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex items-center gap-2", styles.label)}>
          <span
            className={cn("size-1.5 shrink-0 rounded-full", styles.led)}
            aria-hidden="true"
          />
          <Icon className="size-4" />
          <span className="font-sans text-xs font-medium tracking-[0.08em] uppercase">
            {parameter.label}
          </span>
        </div>
        <StatusStamp
          status={status}
          updatedAt={updatedAt}
          now={now}
          className={styles.stamp}
        />
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-heading text-4xl font-medium tracking-tight tabular-nums",
            styles.value
          )}
        >
          {current.toFixed(parameter.precision)}
        </span>
        <span className="font-heading text-sm text-board-muted">
          {parameter.unit}
        </span>
      </div>

      <div className="h-16">
        <TrendChart
          points={history}
          status={status}
          safeMin={threshold.safeMin}
          safeMax={threshold.safeMax}
          precision={parameter.precision}
        />
      </div>
    </div>
  )
}
