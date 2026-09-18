import { Gauge } from "lucide-react"
import { cn } from "cn"
import { StatusStamp } from "@/components/dashboard/status-stamp"
import { usePondHistory } from "@/hooks/use-ponds"
import type { Pond } from "@/lib/api"
import { PARAMETER_ICONS } from "@/lib/parameters"
import { pondReadingStates } from "@/lib/pond-status"
import { STATUS_STYLES } from "@/lib/status-styles"

type ParameterSummaryProps = {
  pond: Pond
  now: number
}

// Every monitored parameter as plain values side by side — no card, no border, no per-parameter
// chart (the combined trend below already covers that). Status reads through color alone: the LED,
// label, and value tint together, the same signal the tile vocabulary uses, just with no box left
// to flood.
export function ParameterSummary({ pond, now }: ParameterSummaryProps) {
  const historyByParameter = usePondHistory(pond.id)
  const readings = pondReadingStates(pond, now, historyByParameter)

  return (
    <div className="flex flex-col gap-x-8 gap-y-5 md:flex-row md:flex-wrap">
      {readings.map(({ parameter, reading }) => {
        const Icon = PARAMETER_ICONS[parameter.id] ?? Gauge

        if (!reading) {
          return (
            <div key={parameter.id} className="min-w-40 flex-1">
              <div className="flex items-center gap-2 text-board-stale">
                <Icon className="size-4" />
                <span className="font-sans text-xs font-medium tracking-[0.08em] uppercase">
                  {parameter.label}
                </span>
              </div>
              <p className="mt-1.5 font-sans text-sm text-board-muted">
                No readings yet
              </p>
            </div>
          )
        }

        const styles = STATUS_STYLES[reading.status]

        return (
          <div key={parameter.id} className="min-w-40 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className={cn("flex items-center gap-2", styles.label)}>
                <span
                  className={cn("size-1.5 shrink-0 rounded-full", styles.led)}
                  aria-hidden="true"
                />
                <Icon className="size-4 shrink-0" />
                <span className="font-sans text-xs font-medium tracking-[0.08em] uppercase">
                  {parameter.label}
                </span>
              </div>
              <StatusStamp
                status={reading.status}
                updatedAt={reading.updatedAt}
                now={now}
                className={styles.stamp}
              />
            </div>

            <div className="mt-1.5 flex items-baseline gap-1">
              <span
                className={cn(
                  "font-heading text-3xl font-medium tracking-tight tabular-nums",
                  styles.value
                )}
              >
                {reading.current.toFixed(parameter.precision)}
              </span>
              <span className="font-heading text-sm text-board-muted">
                {parameter.unit}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
