import * as React from "react"
import type { ComponentType } from "react"
import { cn } from "cn"
import { silentReason } from "@/lib/device-health"
import {
  formatClock,
  formatRelative,
  formatSilentDuration,
} from "@/lib/format-time"
import type { ParameterConfig, ReadingState } from "@/lib/parameters"
import { formatReading } from "@/lib/reading-format"
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"
import { SignalPathStrip } from "./signal-path-strip"
import { StatusStamp } from "./status-stamp"
import { TrendChart } from "./trend-chart"

type ParameterTileProps = {
  reading: ReadingState
  now: number
  icon: ComponentType<{ className?: string }>
}

// Live and unit-offline tiles. An offline unit keeps the stale shell and WifiOff stamp with no
// Signal Path strip (D-10) — the probe isn't the problem there, the whole unit is.
export function ParameterTile({
  reading,
  now,
  icon: Icon,
}: ParameterTileProps) {
  const { parameter, threshold, current, history, status, updatedAt } = reading
  const styles = STATUS_STYLES[status]
  const shown = formatReading(parameter, current)
  const hintId = React.useId()
  const hint = parameter.approximate
    ? shown.atCeiling
      ? parameter.ceilingHint
      : parameter.approximateHint
    : undefined

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`${parameter.label}: ${shown.spoken}, ${STATUS_LABELS[status]}, updated ${formatRelative(updatedAt, now)}`}
      aria-describedby={hint ? hintId : undefined}
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

      <div className="flex min-h-11 items-baseline gap-2">
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
            "font-heading text-4xl font-medium tracking-tight tabular-nums",
            styles.value
          )}
        >
          {shown.number}
        </span>
        <span className="font-heading text-sm text-board-muted">
          {parameter.unit}
        </span>
      </div>

      <div className="h-16">
        <TrendChart
          points={history}
          status={status}
          threshold={threshold}
          precision={parameter.precision}
        />
      </div>

      {hint ? (
        <p
          id={hintId}
          className="line-clamp-2 font-sans text-xs leading-normal text-board-muted"
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}

// A never-read probe has no threshold to hand the sparkline; with no points TrendChart returns its
// "not enough history" box before the threshold is ever read, so any placeholder works here.
const NO_HISTORY_THRESHOLD = {
  safeMin: 0,
  safeMax: 0,
  criticalMin: 0,
  criticalMax: 0,
}

type SilentParameterTileProps = {
  parameter: ParameterConfig
  reading: ReadingState | null
  reasonToken: string | null
  deviceId: string
  now: number
  icon: ComponentType<{ className?: string }>
}

// The unit is online but this probe has gone quiet (D-07). Same stale shell as an offline tile, but
// the stamp is CircleOff (not WifiOff) and the foot is the Signal Path strip that says why, so staff
// can tell "the probe needs attention" apart from "the whole unit dropped off".
export function SilentParameterTile({
  parameter,
  reading,
  reasonToken,
  deviceId,
  now,
  icon: Icon,
}: SilentParameterTileProps) {
  const styles = STATUS_STYLES.stale
  const duration = reading
    ? formatSilentDuration(now - reading.updatedAt)
    : null
  const reasonLabel = silentReason(reasonToken).label.toLowerCase()
  const ariaLabel = duration
    ? `${parameter.label}: no reading for ${duration}, unit online, probe ${reasonLabel}`
    : `${parameter.label}: no reading received yet, unit online, probe ${reasonLabel}`

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={ariaLabel}
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
        {reading ? (
          <StatusStamp
            status="stale"
            silent
            updatedAt={reading.updatedAt}
            now={now}
            className={styles.stamp}
          />
        ) : null}
      </div>

      <div className="flex min-h-11 flex-col justify-center gap-1">
        {reading && duration ? (
          <>
            <p className="font-sans text-lg font-medium text-board-stale">
              No reading for {duration}
            </p>
            <p className="font-sans text-xs text-board-muted">
              Last{" "}
              <span className="font-heading">
                {formatReading(parameter, reading.current).text}
              </span>{" "}
              at{" "}
              <span className="font-heading">
                {formatClock(reading.updatedAt)}
              </span>
            </p>
          </>
        ) : (
          <p className="font-sans text-lg font-medium text-board-stale">
            No reading received yet
          </p>
        )}
      </div>

      <div className="h-16">
        <TrendChart
          points={reading?.history ?? []}
          status="stale"
          threshold={reading?.threshold ?? NO_HISTORY_THRESHOLD}
          precision={parameter.precision}
        />
      </div>

      <SignalPathStrip
        parameterLabel={parameter.label}
        reasonToken={reasonToken}
        deviceId={deviceId}
      />
    </div>
  )
}
