import { Gauge } from "lucide-react"
import {
  ParameterTile,
  SilentParameterTile,
} from "@/components/dashboard/parameter-tile"
import { usePondHistory } from "@/hooks/use-ponds"
import type { Pond } from "@/lib/api"
import { PARAMETER_ICONS, type ParameterConfig } from "@/lib/parameters"
import { pondReadingStates } from "@/lib/pond-status"

type PondLiveReadingsProps = {
  pond: Pond
  now: number
}

// The parameter-tile grid (value + 2 h sparkline) for one pond, shared by the pond detail page
// and the dashboard so both render a pond's live readings the same way. Tiles dispatch on the
// per-parameter signal: a parameter the unit never sends gets the muted not-reported tile (D-09),
// a probe that went quiet on an online unit gets the silent tile with its reason (D-07), and live
// or unit-offline readings keep the ordinary tile (D-10).
export function PondLiveReadings({ pond, now }: PondLiveReadingsProps) {
  const historyByParameter = usePondHistory(pond.id)
  const readings = pondReadingStates(pond, now, historyByParameter)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {readings.map((entry) => {
        const { parameter, reading, signal, sensorStatus } = entry
        const { valueStatus, unconfirmed } = entry
        const icon = PARAMETER_ICONS[parameter.id] ?? Gauge
        if (signal === "not_reported")
          return <NotReportedTile key={parameter.id} parameter={parameter} />
        if (signal === "silent" && pond.device)
          return (
            <SilentParameterTile
              key={parameter.id}
              parameter={parameter}
              reading={reading}
              reasonToken={sensorStatus}
              deviceId={pond.device.id}
              now={now}
              icon={icon}
            />
          )
        return reading ? (
          <ParameterTile
            key={parameter.id}
            reading={reading}
            now={now}
            icon={icon}
            valueStatus={valueStatus}
            unconfirmed={unconfirmed}
          />
        ) : (
          <NoDataTile key={parameter.id} parameter={parameter} />
        )
      })}
    </div>
  )
}

function NoDataTile({ parameter }: { parameter: ParameterConfig }) {
  const Icon = PARAMETER_ICONS[parameter.id] ?? Gauge
  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`${parameter.label}: no readings yet`}
      className="board-groove flex min-h-44 flex-col gap-4 rounded-xl border border-dashed border-board-border-strong bg-board-panel/60 p-5"
    >
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

function NotReportedTile({ parameter }: { parameter: ParameterConfig }) {
  const Icon = PARAMETER_ICONS[parameter.id] ?? Gauge
  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={`${parameter.label}: not reported by this unit`}
      className="board-groove flex min-h-44 flex-col gap-4 rounded-xl border border-dashed border-board-border-strong bg-board-panel/60 p-5"
    >
      <div className="flex items-center gap-2 text-board-stale">
        <Icon className="size-4" />
        <span className="font-sans text-xs font-medium tracking-[0.08em] uppercase">
          {parameter.label}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1">
        <p className="font-sans text-sm font-medium text-board-muted">
          Not reported by this unit
        </p>
        <p className="font-sans text-xs text-board-muted">
          This unit&apos;s firmware doesn&apos;t send{" "}
          {parameter.label.toLowerCase()}. An administrator can update it to
          start monitoring.
        </p>
      </div>
    </div>
  )
}
