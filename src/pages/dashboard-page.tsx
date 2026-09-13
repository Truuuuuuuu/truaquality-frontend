import { Droplets, FlaskConical, Thermometer, Waves } from "lucide-react"
import { ParameterTile } from "@/components/dashboard/parameter-tile"
import { useNow } from "@/hooks/use-now"
import { formatClock } from "@/lib/format-time"
import { useLiveReadings } from "@/lib/mock-readings"

const PARAMETER_ICONS = {
  temperature: Thermometer,
  dissolvedOxygen: Droplets,
  salinity: Waves,
}

export function DashboardPage() {
  const readings = useLiveReadings()
  const now = useNow()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
            BFAR Sorsogon Overview
          </h1>
          <span className="inline-flex items-center gap-1 rounded-md border border-board-warn/40 px-1.5 py-0.5 font-sans text-[0.65rem] font-medium tracking-wide text-board-warn uppercase">
            <FlaskConical className="size-3" />
            Sample data
          </span>
        </div>
        <p className="font-sans text-xs text-board-muted">
          Board time <span className="font-heading">{formatClock(now)}</span> · simulated readings, no live
          devices connected yet
        </p>
      </div>

      <ParameterTile
        reading={readings.temperature}
        now={now}
        icon={PARAMETER_ICONS.temperature}
        variant="flagship"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ParameterTile
          reading={readings.dissolvedOxygen}
          now={now}
          icon={PARAMETER_ICONS.dissolvedOxygen}
        />
        <ParameterTile reading={readings.salinity} now={now} icon={PARAMETER_ICONS.salinity} />
      </div>
    </div>
  )
}
