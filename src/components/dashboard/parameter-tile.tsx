import type { ComponentType } from "react"
import { AlertTriangle, WifiOff } from "lucide-react"
import { cn } from "cn"
import { formatClock, formatRelative } from "@/lib/format-time"
import type { ReadingState } from "@/lib/parameters"
import { STATUS_STYLES } from "@/lib/status-styles"
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
  const { parameter, current, history, status, updatedAt } = reading
  const styles = STATUS_STYLES[status]

  return (
    <div
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
          safeMin={parameter.safeMin}
          safeMax={parameter.safeMax}
          precision={parameter.precision}
        />
      </div>
    </div>
  )
}

function StatusStamp({
  status,
  updatedAt,
  now,
  className,
}: {
  status: ReadingState["status"]
  updatedAt: number
  now: number
  className: string
}) {
  if (status === "stale") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-heading text-[0.65rem] tracking-wide",
          className
        )}
      >
        <WifiOff className="size-3" />
        {formatRelative(updatedAt, now)}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-heading text-[0.65rem] tracking-wide",
        className
      )}
    >
      {status !== "nominal" ? <AlertTriangle className="size-3" /> : null}
      {formatClock(updatedAt)}
    </span>
  )
}
