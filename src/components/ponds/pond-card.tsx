import { Cpu } from "lucide-react"
import { Link } from "react-router"
import { cn } from "cn"
import { StatusBadge } from "@/components/status-badge"
import type { Pond } from "@/lib/api"
import { formatRelative } from "@/lib/format-time"
import { PARAMETER_ICONS } from "@/lib/parameters"
import {
  lastReadingAt,
  latestPondReadings,
  pondConnectionLabel,
  pondStatus,
} from "@/lib/pond-status"
import { STATUS_STYLES } from "@/lib/status-styles"

type PondCardProps = {
  pond: Pond
  now: number
}

export function PondCard({ pond, now }: PondCardProps) {
  const status = pondStatus(pond, now)
  const connectionLabel = pondConnectionLabel(pond, now)
  const readings = latestPondReadings(pond, now)
  const lastAt = lastReadingAt(pond)

  return (
    <Link
      to={`/ponds/${pond.id}`}
      className={cn(
        "board-groove flex flex-col gap-4 rounded-xl border p-5 transition-colors duration-500 outline-none hover:border-board-border-strong focus-visible:ring-3 focus-visible:ring-ring/50",
        STATUS_STYLES[status].tile
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 truncate font-sans text-sm font-semibold text-board-fg">
          {pond.name}
        </span>
        <StatusBadge status={status}>{connectionLabel}</StatusBadge>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {readings.map(({ parameter, reading }) => {
          const Icon = PARAMETER_ICONS[parameter.id]
          const styles = STATUS_STYLES[reading?.status ?? "stale"]
          return (
            <div key={parameter.id} className="flex min-w-0 flex-col gap-1">
              <dt
                className={cn(
                  "flex items-center gap-1 font-sans text-[0.65rem] tracking-[0.08em] uppercase",
                  styles.label
                )}
              >
                {Icon ? <Icon className="size-3 shrink-0" /> : null}
                <span className="truncate" title={parameter.label}>
                  {parameter.shortLabel}
                </span>
              </dt>
              <dd className="flex items-baseline gap-1">
                <span
                  className={cn(
                    "font-heading text-xl font-medium tracking-tight tabular-nums",
                    styles.value
                  )}
                >
                  {reading ? reading.value.toFixed(parameter.precision) : "—"}
                </span>
                <span className="font-heading text-[0.65rem] text-board-muted">
                  {parameter.unit}
                </span>
              </dd>
            </div>
          )
        })}
      </dl>

      <div className="flex items-center justify-between gap-2 font-sans text-[0.7rem] text-board-muted">
        <span className="inline-flex min-w-0 items-center gap-1">
          <Cpu className="size-3 shrink-0" />
          <span className="truncate">
            {pond.device ? pond.device.serial : "No device assigned"}
          </span>
        </span>
        <span className="shrink-0 font-heading">
          {lastAt === null ? "Awaiting data" : formatRelative(lastAt, now)}
        </span>
      </div>
    </Link>
  )
}
