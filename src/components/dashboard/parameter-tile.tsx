import type { ComponentType } from "react"
import { AlertTriangle, WifiOff } from "lucide-react"
import { cn } from "cn"
import { formatClock, formatRelative } from "@/lib/format-time"
import type { ReadingState } from "@/lib/mock-readings"
import { TrendChart } from "./trend-chart"

const STATUS_STYLES = {
  nominal: {
    tile: "border-board-border bg-board-panel",
    value: "text-board-fg",
    label: "text-board-muted",
    led: "bg-board-accent",
    stamp: "border-board-border-strong text-board-muted",
  },
  warning: {
    tile: "border-board-warn/40 bg-board-warn/10",
    value: "text-board-warn",
    label: "text-board-warn",
    led: "bg-board-warn",
    stamp: "border-board-warn/50 text-board-warn",
  },
  critical: {
    tile: "border-board-critical/50 bg-board-critical/12",
    value: "text-board-critical",
    label: "text-board-critical",
    led: "bg-board-critical",
    stamp: "border-board-critical/60 text-board-critical",
  },
  stale: {
    tile: "border-dashed border-board-border-strong bg-board-panel/60",
    value: "text-board-stale",
    label: "text-board-stale",
    led: "bg-board-stale/50",
    stamp: "border-board-border-strong text-board-stale",
  },
} as const

type ParameterTileProps = {
  reading: ReadingState
  now: number
  icon: ComponentType<{ className?: string }>
  variant?: "flagship" | "standard"
}

export function ParameterTile({ reading, now, icon: Icon, variant = "standard" }: ParameterTileProps) {
  const { parameter, current, history, status, updatedAt } = reading
  const styles = STATUS_STYLES[status]
  const isFlagship = variant === "flagship"

  return (
    <div
      className={cn(
        "board-groove flex flex-col gap-4 rounded-xl border p-5 transition-colors duration-500",
        styles.tile,
        isFlagship && "gap-5 p-6"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex items-center gap-2", styles.label)}>
          <span className={cn("size-1.5 shrink-0 rounded-full", styles.led)} aria-hidden="true" />
          <Icon className={cn("size-4", isFlagship && "size-5")} />
          <span
            className={cn(
              "font-sans text-xs font-medium tracking-[0.08em] uppercase",
              isFlagship && "text-sm"
            )}
          >
            {parameter.label}
          </span>
        </div>
        <StatusStamp status={status} updatedAt={updatedAt} now={now} className={styles.stamp} />
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-heading font-medium tabular-nums tracking-tight",
            styles.value,
            isFlagship ? "text-6xl sm:text-7xl" : "text-4xl"
          )}
        >
          {current.toFixed(parameter.precision)}
        </span>
        <span className={cn("font-heading text-board-muted", isFlagship ? "text-xl" : "text-sm")}>
          {parameter.unit}
        </span>
      </div>

      <div className={cn(isFlagship ? "h-28" : "h-16")}>
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
