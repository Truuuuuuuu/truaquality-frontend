import * as React from "react"
import { AlertTriangle, ArrowLeft, Cpu, Gauge, WifiOff } from "lucide-react"
import { Link, useParams } from "react-router"
import { cn } from "cn"
import { BoardEmptyState } from "@/components/board-empty-state"
import { ParameterTile } from "@/components/dashboard/parameter-tile"
import { StatusBadge } from "@/components/status-badge"
import { usePond, usePondReadings } from "@/hooks/use-ponds"
import { useNow } from "@/hooks/use-now"
import { ApiError } from "@/lib/api"
import { formatRelative } from "@/lib/format-time"
import {
  PARAMETER_ICONS,
  PARAMETERS,
  toReadingState,
  type ParameterConfig,
  type ReadingPoint,
} from "@/lib/parameters"
import { isDeviceOnline } from "@/lib/pond-status"

export function PondDetailPage() {
  const { pondId = "" } = useParams()
  const { data: pond, error } = usePond(pondId)
  const { data: readings } = usePondReadings(pondId)
  const now = useNow()

  const historyByParameter = React.useMemo(() => {
    const byParameter = new Map<string, ReadingPoint[]>()
    for (const reading of readings ?? []) {
      const history = byParameter.get(reading.parameter) ?? []
      history.push({ t: Date.parse(reading.recordedAt), v: reading.value })
      byParameter.set(reading.parameter, history)
    }
    return byParameter
  }, [readings])

  const backLink = (
    <Link
      to="/ponds"
      className="inline-flex w-fit items-center gap-1 font-sans text-xs text-board-muted hover:text-board-fg"
    >
      <ArrowLeft className="size-3" />
      Ponds
    </Link>
  )

  if (!pond) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        {error ? (
          <BoardEmptyState icon={AlertTriangle} tone="error">
            {error instanceof ApiError && error.status === 404
              ? "This pond doesn't exist."
              : `Couldn't load this pond: ${error.message}`}
          </BoardEmptyState>
        ) : (
          <p className="font-sans text-sm text-board-muted">Loading pond…</p>
        )}
      </div>
    )
  }

  const device = pond.device
  const deviceOnline = device ? isDeviceOnline(device.lastSeenAt, now) : false

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {backLink}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
            {pond.name}
          </h1>
          {pond.status === "ARCHIVED" ? (
            <StatusBadge status="stale">Archived</StatusBadge>
          ) : null}
        </div>
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-sans text-xs text-board-muted">
          {device ? (
            <>
              <Cpu className="size-3" />
              <span className="font-heading">{device.serial}</span>
              {device.hardwareModel ? (
                <span>· {device.hardwareModel}</span>
              ) : null}
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  !deviceOnline && "text-board-stale"
                )}
              >
                · {deviceOnline ? null : <WifiOff className="size-3" />}
                {device.lastSeenAt
                  ? `last seen ${formatRelative(Date.parse(device.lastSeenAt), now)}`
                  : "never connected"}
              </span>
            </>
          ) : (
            "No monitoring device assigned — assign one from the Devices page."
          )}
        </p>
        {pond.notes ? (
          <p className="font-sans text-xs text-board-muted">{pond.notes}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PARAMETERS.map((parameter) => {
          let history = historyByParameter.get(parameter.id) ?? []
          const latest = pond.latest[parameter.id]
          // A device silent for longer than the history window still has a last known value; show it
          // (it will read as stale) rather than claiming the pond has no data.
          if (history.length === 0 && latest) {
            history = [{ t: Date.parse(latest.recordedAt), v: latest.value }]
          }
          const reading = toReadingState(parameter, history, now)
          return reading ? (
            <ParameterTile
              key={parameter.id}
              reading={reading}
              now={now}
              icon={PARAMETER_ICONS[parameter.id] ?? Gauge}
            />
          ) : (
            <NoDataTile key={parameter.id} parameter={parameter} />
          )
        })}
      </div>
    </div>
  )
}

function NoDataTile({ parameter }: { parameter: ParameterConfig }) {
  const Icon = PARAMETER_ICONS[parameter.id] ?? Gauge
  return (
    <div className="board-groove flex min-h-44 flex-col gap-4 rounded-xl border border-dashed border-board-border-strong bg-board-panel/60 p-5">
      <div className="flex items-center gap-2 text-board-stale">
        <Icon className="size-4" />
        <span className="font-sans text-xs font-medium tracking-[0.08em] uppercase">
          {parameter.label}
        </span>
      </div>
      <p className="flex flex-1 items-center justify-center font-sans text-sm text-board-muted">
        No readings yet
      </p>
    </div>
  )
}
