import type * as React from "react"
import { Gauge } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { usePondAnalysisRange } from "@/hooks/use-ponds"
import type { Pond } from "@/lib/api"
import type { HistoryRangeValue } from "@/lib/history-range"
import { PARAMETER_ICONS, PARAMETERS } from "@/lib/parameters"
import { cn } from "@/lib/utils"

type HistorySummaryProps = {
  pond: Pond
  range: HistoryRangeValue
  // The page's range picker, shown right of the heading: it sits above everything it governs (this summary,
  // the history charts and the reading table below).
  rangeControl?: React.ReactNode
}

// The history analysis in plain sentences, for staff who'd rather read "falling by about 0.3 °C per day"
// than decode the stats row. The server writes the sentences (`summary`); this only lays them out. Shares the
// charts' analysis query (same key), so it costs no extra request.
export function HistorySummary({
  pond,
  range,
  rangeControl,
}: HistorySummaryProps) {
  const { data: analysis } = usePondAnalysisRange(pond.id, range)
  const entries = analysis
    ? PARAMETERS.flatMap((parameter) => {
        const result = analysis.parameters[parameter.id]
        return result ? [{ parameter, result }] : []
      })
    : null

  // The section always renders, even while the analysis loads: the range picker lives in its header, and a
  // picker that vanished on every range change couldn't be used.
  return (
    <section
      aria-labelledby="pond-summary-title"
      className="flex flex-col gap-3 border-t border-board-border pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="pond-summary-title"
          className="font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase"
        >
          Trend summary
        </h2>
        {rangeControl}
      </div>
      {entries === null ? (
        <SummarySkeleton />
      ) : entries.length === 0 ? (
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
                  {result.summary}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

const SUMMARY_LINE_WIDTHS = ["w-3/4", "w-2/3", "w-4/5", "w-3/5"]

// One placeholder sentence per parameter, shaped like the loaded list (icon + line), so the section
// doesn't sit empty and then push the charts down when the analysis lands.
function SummarySkeleton() {
  return (
    <ul
      className="flex flex-col gap-3"
      aria-busy="true"
      aria-label="Loading trend summary"
    >
      {PARAMETERS.map((parameter, index) => (
        <li key={parameter.id} className="flex gap-2.5">
          <Skeleton className="mt-0.5 size-4 shrink-0" />
          <Skeleton
            className={cn(
              "h-4 max-w-prose",
              SUMMARY_LINE_WIDTHS[index % SUMMARY_LINE_WIDTHS.length]
            )}
          />
        </li>
      ))}
    </ul>
  )
}
