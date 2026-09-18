import * as React from "react"
import { AlertTriangle, ScrollText, SearchX } from "lucide-react"
import { Navigate } from "react-router"
import { BoardEmptyState } from "@/components/board-empty-state"
import { BoardPager } from "@/components/board-pager"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/context/auth-context"
import { useAuditPager } from "@/hooks/use-audit"
import { useNow } from "@/hooks/use-now"
import type { AuditEntry } from "@/lib/api"
import {
  auditActionLabel,
  auditActorLabel,
  auditMetadataPairs,
  AUDIT_ACTION_OPTIONS,
  AUDIT_TARGET_OPTIONS,
  type AuditTargetFilter,
} from "@/lib/audit"
import { formatClock, formatDate, formatRelative } from "@/lib/format-time"

export function AuditPage() {
  const { profile } = useAuth()
  const now = useNow()
  const isAdmin = profile?.systemRole === "ADMIN"

  const [target, setTarget] = React.useState<AuditTargetFilter>("ALL")
  const [action, setAction] = React.useState<string>("ALL")

  // Filtering happens on the server because the log is cursor-paginated and grows without bound —
  // narrowing a page that's already been fetched would only hide rows, not find older ones. Changing
  // either filter resets back to page 1 inside the hook, the same as the Users/Ponds registries.
  const { entries, total, page, pageSize, isLoading, error, goToPage } =
    useAuditPager(
      {
        targetType: target === "ALL" ? undefined : target,
        action: action === "ALL" ? undefined : action,
      },
      { enabled: isAdmin }
    )

  // Admin-only: this is the record of who did what to whom, and the backend answers 403 regardless.
  if (profile && !isAdmin) {
    return <Navigate to="/" replace />
  }

  const hasFilters = target !== "ALL" || action !== "ALL"
  const hasLoaded = !isLoading && !error

  function clearFilters() {
    setTarget("ALL")
    setAction("ALL")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
          Audit log
        </h1>
        <p className="font-sans text-xs text-board-muted">
          Every change an admin has made to users, ponds, and devices — recorded
          automatically and never edited
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Select
          items={AUDIT_TARGET_OPTIONS.map(({ value, label }) => ({
            value,
            label,
          }))}
          value={target}
          onValueChange={(next) =>
            setTarget((next ?? "ALL") as AuditTargetFilter)
          }
        >
          <SelectTrigger aria-label="Filter by area" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_TARGET_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={AUDIT_ACTION_OPTIONS.map(({ value, label }) => ({
            value,
            label,
          }))}
          value={action}
          onValueChange={(next) => setAction(next ?? "ALL")}
        >
          <SelectTrigger aria-label="Filter by action" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hasLoaded ? (
        error ? (
          <BoardEmptyState icon={AlertTriangle} tone="error">
            Couldn't load the audit log: {error.message}
          </BoardEmptyState>
        ) : (
          <p className="font-sans text-sm text-board-muted">
            Loading audit log…
          </p>
        )
      ) : entries.length === 0 ? (
        hasFilters ? (
          <BoardEmptyState
            icon={SearchX}
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          >
            No recorded activity matches these filters.
          </BoardEmptyState>
        ) : (
          <BoardEmptyState icon={ScrollText}>
            Nothing recorded yet. Admin actions — inviting a user, renaming a
            pond, rotating a device secret — will appear here.
          </BoardEmptyState>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {/* Registry table: sm and up, where a fixed-width grid of columns fits without cramping.
              Flat, not a card — row hairlines carry the structure, same as Users and Devices. */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} now={now} />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Registry cards: below sm, where the table's fixed columns force cramped, truncated cells. */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {entries.map((entry) => (
              <AuditCard key={entry.id} entry={entry} now={now} />
            ))}
          </ul>

          <BoardPager
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={goToPage}
            noun="entries"
          />
        </div>
      )}
    </div>
  )
}

// The changed fields, as the action recorded them. Kept to a compact line per entry so the column
// stays scannable; the full value is in the title attribute for anything that truncates.
function MetadataCell({ entry }: { entry: AuditEntry }) {
  const pairs = auditMetadataPairs(entry.metadata)
  if (pairs.length === 0) {
    return <span className="text-board-muted/50">—</span>
  }
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5">
      {pairs.map(({ key, value }) => (
        <span key={key} className="text-board-muted">
          {key}
          <span className="text-board-muted/50">: </span>
          <span className="text-board-fg" title={value}>
            {value.length > 40 ? `${value.slice(0, 40)}…` : value}
          </span>
        </span>
      ))}
    </span>
  )
}

function AuditRow({ entry, now }: { entry: AuditEntry; now: number }) {
  const t = Date.parse(entry.createdAt)
  const metadataPairs = auditMetadataPairs(entry.metadata)
  const metadataLabel =
    metadataPairs.length === 0
      ? "no additional details"
      : metadataPairs.map(({ key, value }) => `${key}: ${value}`).join(", ")

  return (
    <TableRow>
      <TableCell
        tabIndex={0}
        aria-label={`${formatDate(t)} ${formatClock(t)}, ${formatRelative(t, now)}`}
        className="font-heading text-xs whitespace-nowrap tabular-nums"
      >
        {formatDate(t)} {formatClock(t)}
        <p className="font-sans text-[0.7rem] text-board-muted">
          {formatRelative(t, now)}
        </p>
      </TableCell>
      <TableCell
        tabIndex={0}
        aria-label={auditActionLabel(entry.action)}
        className="font-medium text-board-fg"
      >
        {auditActionLabel(entry.action)}
      </TableCell>
      <TableCell
        tabIndex={0}
        aria-label={`By: ${auditActorLabel(entry)}`}
        className="text-xs text-board-muted"
      >
        {auditActorLabel(entry)}
      </TableCell>
      <TableCell
        tabIndex={0}
        aria-label={metadataLabel}
        className="font-heading text-xs"
      >
        <MetadataCell entry={entry} />
      </TableCell>
    </TableRow>
  )
}

function AuditCard({ entry, now }: { entry: AuditEntry; now: number }) {
  const t = Date.parse(entry.createdAt)
  const metadataPairs = auditMetadataPairs(entry.metadata)
  const metadataLabel =
    metadataPairs.length === 0
      ? "no additional details"
      : metadataPairs.map(({ key, value }) => `${key}: ${value}`).join(", ")

  return (
    <li
      tabIndex={0}
      role="group"
      aria-label={`${auditActionLabel(entry.action)} by ${auditActorLabel(entry)}, ${formatDate(t)} ${formatClock(t)}, ${metadataLabel}`}
      className="board-groove flex flex-col gap-2 rounded-xl border p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-sans text-sm font-medium text-board-fg">
          {auditActionLabel(entry.action)}
        </span>
        <span className="font-heading text-[0.7rem] whitespace-nowrap text-board-muted tabular-nums">
          {formatRelative(t, now)}
        </span>
      </div>
      <p className="font-sans text-xs text-board-muted">
        {auditActorLabel(entry)} · {formatDate(t)} {formatClock(t)}
      </p>
      <div className="font-heading text-xs">
        <MetadataCell entry={entry} />
      </div>
    </li>
  )
}
