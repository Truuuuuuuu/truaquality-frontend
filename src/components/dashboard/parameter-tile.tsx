import * as React from "react"
import { useDisplayPreferences } from "@/context/display-preferences-context"
import type { ComponentType } from "react"
import { cn } from "@/lib/utils"
import { silentReason } from "@/lib/device-health"
import { referenceTone } from "@/lib/do-display"
import {
  formatClock,
  formatRelative,
  formatSilentDuration,
} from "@/lib/format-time"
import type {
  ParameterConfig,
  ReadingState,
  ReadingStatus,
} from "@/lib/parameters"
import {
  keepsCase,
  unconfirmedLabel,
  type UnconfirmedSpike,
  type PondReadingEntry,
} from "@/lib/pond-status"
import { formatReading } from "@/lib/reading-format"
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"
import { SignalPathStrip } from "./signal-path-strip"
import { StatusStamp } from "./status-stamp"
import { TrendChart } from "./trend-chart"

type DoParameterTileProps = {
  entry: PondReadingEntry
  deviceId: string | null
  now: number
  compact?: boolean
  icon: ComponentType<{ className?: string }>
}

// Reference color describes only the current DO number. It never becomes a pond
// severity or a StatusStamp alert; faults and whole-unit offline state take priority.
export function DoParameterTile({
  entry,
  deviceId,
  now,
  compact = false,
  icon: Icon,
}: DoParameterTileProps) {
  const { simpleMode } = useDisplayPreferences()
  const { parameter, referenceReading: reading, signal, sensorStatus } = entry
  const current = signal === "live" && reading?.currentReading === true
  const tone = referenceTone(reading?.referenceComparison ?? null, current)
  const color = {
    green: "text-board-accent",
    amber: "text-board-warn",
    muted: "text-board-stale",
  }[tone]
  const unreported = signal === "not_reported"
  const offline = signal === "unit_offline"
  const silent = signal === "silent"
  const reason = silentReason(parameter.id, sensorStatus)
  const message = unreported
    ? "DO not reported by this unit"
    : offline
      ? "Unit offline"
      : silent && sensorStatus === "uncalibrated"
        ? "Needs calibration"
        : !current
          ? "No current DO reading"
          : null
  const shown = reading ? formatReading(parameter, reading.current) : null
  const age = reading ? formatRelative(reading.updatedAt, now) : null
  const comparison =
    current && reading?.referenceComparison
      ? reading.referenceComparison === "within_reference"
        ? "Within normal range"
        : "Outside normal range"
      : null

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`${parameter.label}: ${message ?? comparison ?? "Reference unavailable"}${shown ? `, ${current ? "" : "last "}${shown.spoken}, updated ${age}` : ""}. Alert assessment pending`}
      className={cn(
        "min-w-0",
        compact
          ? "flex flex-col gap-1.5"
          : "board-groove flex flex-col gap-4 rounded-xl border p-5",
        !compact &&
          (current
            ? "border-board-border bg-board-panel"
            : "border-dashed border-board-border-strong bg-board-panel/60")
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className={cn("flex min-w-0 items-center gap-2", color)}>
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="font-sans text-xs font-medium">
            {compact ? parameter.shortLabel : parameter.label}
          </span>
        </div>
        {reading && offline ? (
          <StatusStamp
            status="stale"
            updatedAt={reading.updatedAt}
            now={now}
            className={STATUS_STYLES.stale.stamp}
          />
        ) : reading && silent ? (
          <StatusStamp
            status="stale"
            silent
            updatedAt={reading.updatedAt}
            now={now}
            className={STATUS_STYLES.stale.stamp}
          />
        ) : reading ? (
          <span className="font-heading text-xs text-board-muted">
            {formatClock(reading.updatedAt)}
          </span>
        ) : null}
      </div>
      {message ? (
        <p className="font-sans text-sm font-medium text-board-muted">
          {message}
        </p>
      ) : null}
      {shown ? (
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
          {!current ? (
            <span className="font-sans text-xs text-board-muted">Last</span>
          ) : null}
          <span
            className={cn(
              "font-heading font-medium tracking-tight tabular-nums",
              compact ? "text-3xl" : "text-4xl",
              color
            )}
          >
            {shown.number}
          </span>
          <span className="font-heading text-sm text-board-muted">
            {parameter.unit}
          </span>
          {!current ? (
            <span className="font-sans text-xs text-board-muted">{age}</span>
          ) : null}
        </div>
      ) : null}
      {comparison ? (
        <p className={cn("font-sans text-xs", color)}>{comparison}</p>
      ) : null}
      {reading?.normalReference ? (
        <p className="font-sans text-xs text-board-muted">
          {reading.normalReference.label}
        </p>
      ) : null}
      <p className="font-sans text-xs text-board-muted">
        Alert assessment pending
      </p>
      {!compact && reading && !simpleMode ? (
        <div className="h-16">
          <TrendChart reading={reading} />
        </div>
      ) : null}
      {silent && deviceId ? (
        compact ? (
          <p className="font-sans text-xs text-board-muted">{reason.label}</p>
        ) : (
          <SignalPathStrip
            parameter={parameter.id}
            parameterLabel={parameter.label}
            reasonToken={sensorStatus}
            deviceId={deviceId}
          />
        )
      ) : null}
    </div>
  )
}

type ParameterTileProps = {
  reading: ReadingState
  now: number
  icon: ComponentType<{ className?: string }>
  // The number's own colour (its per-value severity); the tile shell keeps `reading.status`.
  valueStatus?: ReadingStatus
  unconfirmed?: UnconfirmedSpike | null
}

// Live and unit-offline tiles. An offline unit keeps the stale shell and WifiOff stamp with no
// Signal Path strip (D-10) — the probe isn't the problem there, the whole unit is.
export function ParameterTile({
  reading,
  now,
  icon: Icon,
  valueStatus,
  unconfirmed,
}: ParameterTileProps) {
  const { simpleMode } = useDisplayPreferences()
  const { parameter, threshold, current, history, status, updatedAt } = reading
  const styles = STATUS_STYLES[status]
  const spike = unconfirmed ? unconfirmedLabel(unconfirmed) : null
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
      aria-label={`${parameter.label}: ${shown.spoken}, ${STATUS_LABELS[status]}${spike ? `, ${spike.spoken}` : ""}, updated ${formatRelative(updatedAt, now)}`}
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
          <span
            className={cn(
              "font-sans text-xs font-medium tracking-[0.08em]",
              keepsCase(parameter.label) ? null : "uppercase"
            )}
          >
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
            STATUS_STYLES[valueStatus ?? status].value
          )}
        >
          {shown.number}
        </span>
        {parameter.unit ? (
          <span className="font-heading text-sm text-board-muted">
            {parameter.unit}
          </span>
        ) : null}
      </div>

      {spike && unconfirmed ? (
        <p
          className={cn(
            "-mt-3 font-sans text-xs",
            STATUS_STYLES[unconfirmed.severity].label
          )}
        >
          {spike.text}
        </p>
      ) : null}

      {!simpleMode ? (
        <div className="h-16">
          <TrendChart
            points={history}
            status={status}
            threshold={threshold}
            precision={parameter.precision}
          />
        </div>
      ) : null}

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
  const { simpleMode } = useDisplayPreferences()
  const styles = STATUS_STYLES.stale
  const duration = reading
    ? formatSilentDuration(now - reading.updatedAt)
    : null
  const reasonLabel = silentReason(
    parameter.id,
    reasonToken
  ).label.toLowerCase()
  const ariaLabel = duration
    ? `${parameter.label}: no reading for ${duration}, unit online, probe status: ${reasonLabel}`
    : `${parameter.label}: no reading received yet, unit online, probe status: ${reasonLabel}`

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
          <span
            className={cn(
              "font-sans text-xs font-medium tracking-[0.08em]",
              keepsCase(parameter.label) ? null : "uppercase"
            )}
          >
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

      {!simpleMode ? (
        <div className="h-16">
          <TrendChart
            points={reading?.history ?? []}
            status="stale"
            threshold={reading?.threshold ?? NO_HISTORY_THRESHOLD}
            precision={parameter.precision}
          />
        </div>
      ) : null}

      <SignalPathStrip
        parameter={parameter.id}
        parameterLabel={parameter.label}
        reasonToken={reasonToken}
        deviceId={deviceId}
      />
    </div>
  )
}
