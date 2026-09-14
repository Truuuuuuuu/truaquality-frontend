import { AlertTriangle, Waves } from "lucide-react"
import { Link } from "react-router"
import { BoardEmptyState } from "@/components/board-empty-state"
import { PondCard } from "@/components/ponds/pond-card"
import { Button } from "@/components/ui/button"
import { usePonds } from "@/hooks/use-ponds"
import { useNow } from "@/hooks/use-now"
import { formatClock } from "@/lib/format-time"
import { compareStatus, type ReadingStatus } from "@/lib/parameters"
import { pondStatus } from "@/lib/pond-status"
import { STATUS_LABELS } from "@/lib/status-styles"

const SUMMARY_ORDER: ReadingStatus[] = ["critical", "warning", "stale"]

export function DashboardPage() {
  const { data: ponds, error, isRefetchError } = usePonds()
  const now = useNow()

  // Worst condition first, so a pond that needs attention is never below the fold.
  const board = (ponds ?? [])
    .filter((pond) => pond.status === "ACTIVE")
    .map((pond) => ({ pond, status: pondStatus(pond, now) }))
    .sort(
      (a, b) =>
        compareStatus(a.status, b.status) ||
        a.pond.name.localeCompare(b.pond.name)
    )

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
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {board.map(({ pond }) => (
            <PondCard key={pond.id} pond={pond} now={now} />
          ))}
        </div>
      )}
    </div>
  )
}
