import { Gauge } from "lucide-react"
import { cn } from "cn"
import { ProbeRing } from "@/components/dashboard/signal-path-strip"
import { StatusStamp } from "@/components/dashboard/status-stamp"
import { usePondHistory } from "@/hooks/use-ponds"
import type { Pond } from "@/lib/api"
import { silentReason } from "@/lib/device-health"
import { formatRelative, formatSilentDuration } from "@/lib/format-time"
import { PARAMETER_ICONS } from "@/lib/parameters"
import { pondReadingStates, unconfirmedLabel } from "@/lib/pond-status"
import { formatReading } from "@/lib/reading-format"
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"

type ParameterSummaryProps = {
  pond: Pond
  now: number
}

// Every monitored parameter as plain values side by side — no card, no border, no per-parameter
// chart (the stacked per-parameter history charts below already cover that). Status reads through
// color alone: the LED, label, and value tint together, the same signal the tile vocabulary uses,
// just with no box left to flood.
export function ParameterSummary({ pond, now }: ParameterSummaryProps) {
  const historyByParameter = usePondHistory(pond.id)
  const readings = pondReadingStates(pond, now, historyByParameter)

  return (
    <div className="flex flex-col gap-x-8 gap-y-5 md:flex-row md:flex-wrap">
      {readings.map((entry) => {
        const { parameter, reading, signal, sensorStatus } = entry
        const { valueStatus, unconfirmed } = entry
        const Icon = PARAMETER_ICONS[parameter.id] ?? Gauge

        // The unit's firmware never sends this parameter (D-09): muted, no LED, not the stale look.
        if (signal === "not_reported") {
          return (
            <div
              key={parameter.id}
              tabIndex={0}
              role="group"
              aria-label={`${parameter.label}: not reported by this unit`}
              className="min-w-40 flex-1"
            >
              <div className="flex items-center gap-2 text-board-stale">
                <Icon className="size-4 shrink-0" />
                <span className="font-sans text-xs font-medium tracking-[0.08em] uppercase">
                  {parameter.label}
                </span>
              </div>
              <p className="mt-1.5 font-sans text-sm text-board-muted">
                Not reported by this unit
              </p>
            </div>
          )
        }

        // Unit online, this probe quiet (D-07). The card only names the reason; the action and the
        // unit link live on the pond detail tile's Signal Path strip.
        if (signal === "silent") {
          const stale = STATUS_STYLES.stale
          const duration = reading
            ? formatSilentDuration(now - reading.updatedAt)
            : null
          const reasonLabel = silentReason(sensorStatus).label
          return (
            <div
              key={parameter.id}
              tabIndex={0}
              role="group"
              aria-label={`${parameter.label}: ${duration ? `no reading for ${duration}` : "no reading received yet"}, unit online, probe ${reasonLabel.toLowerCase()}`}
              className="min-w-40 flex-1"
            >
              <div className="flex items-center justify-between gap-3">
                <div className={cn("flex items-center gap-2", stale.label)}>
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", stale.led)}
                    aria-hidden="true"
                  />
                  <Icon className="size-4 shrink-0" />
                  <span className="font-sans text-xs font-medium tracking-[0.08em] uppercase">
                    {parameter.label}
                  </span>
                </div>
                {reading ? (
                  <StatusStamp
                    status="stale"
                    silent
                    updatedAt={reading.updatedAt}
                    now={now}
                    className={stale.stamp}
                  />
                ) : null}
              </div>
              <p className="mt-1.5 font-sans text-sm font-medium text-board-stale">
                {duration
                  ? `No reading for ${duration}`
                  : "No reading received yet"}
              </p>
              <p className="mt-1 flex items-center gap-2 font-sans text-xs text-board-muted">
                <ProbeRing />
                {reasonLabel}
              </p>
            </div>
          )
        }

        if (!reading) {
          return (
            <div
              key={parameter.id}
              tabIndex={0}
              role="group"
              aria-label={`${parameter.label}: no readings yet`}
              className="min-w-40 flex-1"
            >
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
        const shown = formatReading(parameter, reading.current)
        const spike = unconfirmed ? unconfirmedLabel(unconfirmed) : null

        return (
          <div
            key={parameter.id}
            tabIndex={0}
            role="group"
            aria-label={`${parameter.label}: ${shown.spoken}, ${STATUS_LABELS[reading.status]}${spike ? `, ${spike.spoken}` : ""}, updated ${formatRelative(reading.updatedAt, now)}`}
            className="min-w-40 flex-1"
          >
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
              {shown.prefix ? (
                <span
                  className="font-heading text-sm text-board-muted"
                  aria-hidden="true"
                >
                  {shown.prefix}
                </span>
              ) : null}
              <span
                className={cn(
                  "font-heading text-3xl font-medium tracking-tight tabular-nums",
                  STATUS_STYLES[valueStatus ?? reading.status].value
                )}
              >
                {shown.number}
              </span>
              <span className="font-heading text-sm text-board-muted">
                {parameter.unit}
              </span>
            </div>
            {spike && unconfirmed ? (
              <p
                className={cn(
                  "mt-1 font-sans text-xs",
                  STATUS_STYLES[unconfirmed.severity].label
                )}
              >
                {spike.text}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
