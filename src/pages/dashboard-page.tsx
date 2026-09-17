import * as React from "react"
import { AlertTriangle, Waves } from "lucide-react"
import { Link } from "react-router"
import { BoardEmptyState } from "@/components/board-empty-state"
import { CombinedTrendChart } from "@/components/ponds/combined-trend-chart"
import {
  PondConnectionStatus,
  PondDeviceIdentity,
} from "@/components/ponds/pond-device-meta"
import { ParameterSummary } from "@/components/ponds/parameter-summary"
import { PondSwitcher } from "@/components/ponds/pond-switcher"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { usePonds } from "@/hooks/use-ponds"
import { useNow } from "@/hooks/use-now"
import { formatClock } from "@/lib/format-time"
import { compareStatus, type ReadingStatus } from "@/lib/parameters"
import { pondConnectionLabel, pondStatus } from "@/lib/pond-status"
import { pondTypeLabel } from "@/lib/pond-types"
import { STATUS_LABELS } from "@/lib/status-styles"

const SUMMARY_ORDER: ReadingStatus[] = ["critical", "warning", "stale"]

export function DashboardPage() {
  const { data: ponds, error, isRefetchError } = usePonds()
  const now = useNow()

  // Worst condition first: the default focus is whichever pond needs attention, not just the first
  // one alphabetically.
  const board = (ponds ?? [])
    .filter((pond) => pond.status === "ACTIVE")
    .map((pond) => ({ pond, status: pondStatus(pond, now) }))
    .sort(
      (a, b) =>
        compareStatus(a.status, b.status) ||
        a.pond.name.localeCompare(b.pond.name)
    )

  // Sticky once chosen: an operator who picks a healthy pond to check on shouldn't get yanked back
  // to the worst one the next time a poll reshuffles `board`.
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selectedEntry =
    board.find((entry) => entry.pond.id === selectedId) ?? board[0]

  const summary = [
    `${board.length} ${board.length === 1 ? "pond" : "ponds"}`,
    ...SUMMARY_ORDER.flatMap((status) => {
      const count = board.filter((entry) => entry.status === status).length
      return count > 0
        ? [`${count} ${STATUS_LABELS[status].toLowerCase()}`]
        : []
    }),
  ].join(" · ")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
          BFAR Sorsogon Overview
        </h1>
        <p className="font-sans text-xs text-board-muted">
          Board time <span className="font-heading">{formatClock(now)}</span>
          {ponds ? ` · ${summary}` : null}
        </p>
        {isRefetchError ? (
          <p
            role="status"
            className="inline-flex items-center gap-1 font-sans text-xs text-board-warn"
          >
            <AlertTriangle className="size-3" />
            Couldn't refresh — showing the last readings received.
          </p>
        ) : null}
      </div>

      {!ponds ? (
        error ? (
          <BoardEmptyState icon={AlertTriangle} tone="error">
            Couldn't load ponds: {error.message}
          </BoardEmptyState>
        ) : (
          <p className="font-sans text-sm text-board-muted">Loading ponds…</p>
        )
      ) : board.length === 0 ? (
        <BoardEmptyState
          icon={Waves}
          action={
            <Button variant="outline" size="sm" render={<Link to="/ponds" />}>
              Go to ponds
            </Button>
          }
        >
          No active ponds yet. Register a pond and assign a monitoring device to
          it to see its readings here.
        </BoardEmptyState>
      ) : selectedEntry ? (
        <div className="flex flex-col gap-6">
          <PondSwitcher
            entries={board}
            selectedId={selectedEntry.pond.id}
            onSelect={setSelectedId}
          />

          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <Link
                to={`/ponds/${selectedEntry.pond.id}`}
                className="truncate font-sans text-sm font-semibold text-board-fg underline-offset-4 hover:underline"
              >
                {selectedEntry.pond.name}
              </Link>
              {selectedEntry.pond.fishSpecies || selectedEntry.pond.pondType ? (
                <p className="flex flex-wrap items-center gap-1.5">
                  {selectedEntry.pond.fishSpecies ? (
                    <span className="truncate font-sans text-sm font-bold text-board-fg">
                      {selectedEntry.pond.fishSpecies}
                    </span>
                  ) : null}
                  {selectedEntry.pond.pondType ? (
                    <span className="inline-flex shrink-0 items-center rounded-md border border-board-border-strong px-1.5 py-0.5 font-sans text-[0.65rem] font-medium tracking-[0.08em] text-board-muted uppercase">
                      {pondTypeLabel(selectedEntry.pond.pondType)}
                    </span>
                  ) : null}
                </p>
              ) : null}
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-sans text-xs text-board-muted">
                <PondDeviceIdentity pond={selectedEntry.pond} />
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={selectedEntry.status}>
                {pondConnectionLabel(selectedEntry.pond, now)}
              </StatusBadge>
              {selectedEntry.pond.device ? (
                <p className="font-sans text-xs text-board-muted">
                  <PondConnectionStatus pond={selectedEntry.pond} now={now} />
                </p>
              ) : null}
            </div>
          </div>

          <ParameterSummary pond={selectedEntry.pond} now={now} />
          <CombinedTrendChart pond={selectedEntry.pond} now={now} />
        </div>
      ) : null}
    </div>
  )
}
