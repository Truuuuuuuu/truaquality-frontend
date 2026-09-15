import * as React from "react"
import { AlertTriangle, Cpu, Plus, Waves } from "lucide-react"
import { Link } from "react-router"
import { cn } from "cn"
import { BoardEmptyState } from "@/components/board-empty-state"
import { PondFormDialog } from "@/components/ponds/pond-form-dialog"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/context/auth-context"
import { usePonds } from "@/hooks/use-ponds"
import { useNow } from "@/hooks/use-now"
import type { Pond } from "@/lib/api"
import { formatRelative } from "@/lib/format-time"
import {
  lastReadingAt,
  pondConnectionLabel,
  pondStatus,
} from "@/lib/pond-status"
import { STATUS_STYLES } from "@/lib/status-styles"

export function PondsPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.systemRole === "ADMIN"
  const { data: ponds, error } = usePonds()
  const now = useNow()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  // Kept after the dialog closes so its content doesn't flip to "Add pond" during the exit animation.
  const [dialogPond, setDialogPond] = React.useState<Pond | null>(null)

  function openDialog(pond: Pond | null) {
    setDialogPond(pond)
    setDialogOpen(true)
  }

  const rows = [...(ponds ?? [])].sort(
    (a, b) =>
      Number(a.status === "ARCHIVED") - Number(b.status === "ARCHIVED") ||
      a.name.localeCompare(b.name)
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
            Ponds
          </h1>
          <p className="font-sans text-xs text-board-muted">
            Pond registry for BFAR Sorsogon
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => openDialog(null)}>
            <Plus />
            Add pond
          </Button>
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
      ) : rows.length === 0 ? (
        <BoardEmptyState icon={Waves}>
          {isAdmin
            ? "No ponds registered yet. Add the first pond to start monitoring it."
            : "No ponds registered yet. An administrator needs to add them."}
        </BoardEmptyState>
      ) : (
        <>
          {/* Registry table: sm and up, where a fixed-width grid of columns fits without cramping.
              Flat, not a card — row hairlines (from TableRow/TableHeader) carry the structure. */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Pond</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Last reading</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin ? (
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((pond) => {
                  const lastAt = lastReadingAt(pond)
                  const archived = pond.status === "ARCHIVED"
                  return (
                    <TableRow
                      key={pond.id}
                      className={archived ? "text-board-muted" : undefined}
                    >
                      <TableCell className="max-w-64">
                        <Link
                          to={`/ponds/${pond.id}`}
                          className="font-medium text-board-fg underline-offset-4 hover:underline"
                        >
                          {pond.name}
                        </Link>
                        {pond.notes ? (
                          <p className="truncate text-xs text-board-muted">
                            {pond.notes}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-heading text-xs">
                        {pond.device?.serial ?? (
                          <span className="text-board-muted">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="font-heading text-xs text-board-muted">
                        {lastAt === null
                          ? "Never"
                          : formatRelative(lastAt, now)}
                      </TableCell>
                      <TableCell>
                        {archived ? (
                          <StatusBadge status="stale">Archived</StatusBadge>
                        ) : (
                          <StatusBadge status={pondStatus(pond, now)}>
                            {pondConnectionLabel(pond, now)}
                          </StatusBadge>
                        )}
                      </TableCell>
                      {isAdmin ? (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDialog(pond)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Registry cards: below sm, where the table's fixed columns force cramped, truncated cells. */}
          <div className="flex flex-col gap-3 sm:hidden">
            {rows.map((pond) => {
              const lastAt = lastReadingAt(pond)
              const archived = pond.status === "ARCHIVED"
              const cardStatus = archived ? "stale" : pondStatus(pond, now)
              return (
                <div
                  key={pond.id}
                  className={cn(
                    "board-groove overflow-hidden rounded-xl border transition-colors duration-500",
                    STATUS_STYLES[cardStatus].tile
                  )}
                >
                  <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <Link
                        to={`/ponds/${pond.id}`}
                        className="truncate font-sans text-sm font-semibold text-board-fg underline-offset-4 hover:underline"
                      >
                        {pond.name}
                      </Link>
                      {pond.notes ? (
                        <p className="line-clamp-2 font-sans text-xs text-board-muted">
                          {pond.notes}
                        </p>
                      ) : null}
                    </div>
                    {isAdmin ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-mt-1 -mr-2 shrink-0"
                        onClick={() => openDialog(pond)}
                      >
                        Edit
                      </Button>
                    ) : null}
                  </div>

                  <div className="board-groove flex items-center justify-between gap-3 px-4 py-3">
                    <div className="shrink-0">
                      {archived ? (
                        <StatusBadge status="stale">Archived</StatusBadge>
                      ) : (
                        <StatusBadge status={pondStatus(pond, now)}>
                          {pondConnectionLabel(pond, now)}
                        </StatusBadge>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col items-end gap-1 text-right">
                      <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 font-heading text-xs text-board-muted">
                        <Cpu className="size-3 shrink-0" />
                        <span className="truncate">
                          {pond.device?.serial ?? "Unassigned"}
                        </span>
                      </span>
                      <span className="shrink-0 font-heading text-[0.7rem] text-board-muted">
                        {lastAt === null
                          ? "Never"
                          : formatRelative(lastAt, now)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {isAdmin ? (
        <PondFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          pond={dialogPond}
        />
      ) : null}
    </div>
  )
}
