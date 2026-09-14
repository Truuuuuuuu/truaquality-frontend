import * as React from "react"
import { AlertTriangle, Plus, Waves } from "lucide-react"
import { Link } from "react-router"
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
import { lastReadingAt, pondStatus } from "@/lib/pond-status"

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
        <div className="board-groove rounded-xl border border-board-border bg-board-panel px-2 py-1">
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
                      {lastAt === null ? "Never" : formatRelative(lastAt, now)}
                    </TableCell>
                    <TableCell>
                      {archived ? (
                        <StatusBadge status="stale">Archived</StatusBadge>
                      ) : (
                        <StatusBadge status={pondStatus(pond, now)} />
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
