import { Gauge } from "lucide-react"
import { usePondAnalysisRange } from "@/hooks/use-ponds"
import type { Pond } from "@/lib/api"
import { describeAnalysis } from "@/lib/analysis-summary"
import type { HistoryRangeValue } from "@/lib/history-range"
import { PARAMETER_ICONS, PARAMETERS } from "@/lib/parameters"

type HistorySummaryProps = {
  pond: Pond
  range: HistoryRangeValue
}

// The history analysis in plain sentences, for staff who'd rather read "falling by about 0.3 °C per day"
// than decode the stats row. Shares the charts' analysis query (same key), so it costs no extra request.
export function HistorySummary({ pond, range }: HistorySummaryProps) {
  const { data: analysis } = usePondAnalysisRange(pond.id, range)
  if (!analysis) return null

  const entries = PARAMETERS.flatMap((parameter) => {
    const result = analysis.parameters[parameter.id]
    return result ? [{ parameter, result }] : []
  })

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase">
        Summary
      </h3>
      {entries.length === 0 ? (
        <p className="font-sans text-sm text-board-muted">
          No readings in this range to summarize.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map(({ parameter, result }) => {
            const Icon = PARAMETER_ICONS[parameter.id] ?? Gauge
            return (
              <li key={parameter.id} className="flex gap-2.5">
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-board-muted"
                />
                <p className="max-w-prose font-sans text-sm leading-relaxed text-board-fg">
                  {describeAnalysis(
                    parameter,
                    result,
                    pond.thresholds[parameter.id],
                    range
                  ).join(" ")}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
