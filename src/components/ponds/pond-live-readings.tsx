import { Gauge } from "lucide-react"
import { ParameterTile } from "@/components/dashboard/parameter-tile"
import { usePondHistory } from "@/hooks/use-ponds"
import type { Pond } from "@/lib/api"
import { PARAMETER_ICONS, type ParameterConfig } from "@/lib/parameters"
import { pondReadingStates } from "@/lib/pond-status"

type PondLiveReadingsProps = {
  pond: Pond
  now: number
}

// The parameter-tile grid (value + 2 h sparkline) for one pond, shared by the pond detail page
// and the dashboard so both render a pond's live readings the same way.
export function PondLiveReadings({ pond, now }: PondLiveReadingsProps) {
  const historyByParameter = usePondHistory(pond.id)
  const readings = pondReadingStates(pond, now, historyByParameter)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {readings.map(({ parameter, reading }) =>
        reading ? (
          <ParameterTile
            key={parameter.id}
            reading={reading}
            now={now}
            icon={PARAMETER_ICONS[parameter.id] ?? Gauge}
          />
        ) : (
          <NoDataTile key={parameter.id} parameter={parameter} />
        )
      )}
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
