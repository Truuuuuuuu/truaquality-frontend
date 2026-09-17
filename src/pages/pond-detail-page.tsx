import * as React from "react"
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Gauge,
  X,
} from "lucide-react"
import { Link, useParams } from "react-router"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { BoardEmptyState } from "@/components/board-empty-state"
import { CombinedTrendChart } from "@/components/ponds/combined-trend-chart"
import { ExportReadingsDialog } from "@/components/ponds/export-readings-dialog"
import { HistoryRangePicker } from "@/components/ponds/history-range-picker"
import { PondDeviceMeta } from "@/components/ponds/pond-device-meta"
import { PondLiveReadings } from "@/components/ponds/pond-live-readings"
import { ReadingsFilterDialog } from "@/components/ponds/readings-filter-dialog"
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
import {
  READINGS_PAGE_SIZE,
  usePond,
  usePondReadingsPage,
} from "@/hooks/use-ponds"
import { useNow } from "@/hooks/use-now"
import { ApiError } from "@/lib/api"
import { formatClock, formatRelative } from "@/lib/format-time"
import {
  DEFAULT_HISTORY_RANGE,
  historyRangeKey,
  type HistoryRangeValue,
} from "@/lib/history-range"
import {
  PARAMETER_FILTER_ITEMS,
  PARAMETER_ICONS,
  PARAMETERS,
  severityFor,
  type ParameterConfig,
  type Threshold,
} from "@/lib/parameters"
import { pondTypeLabel } from "@/lib/pond-types"
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"

type PivotRow = { recordedAt: string; values: Partial<Record<string, number>> }

export function PondDetailPage() {
  const { pondId = "" } = useParams()
  const { data: pond, error } = usePond(pondId)
  const now = useNow()

  // Newest-first, keyset-paginated pages from the server (see usePondReadingsPage): `cursorHistory[0]` is
  // always the newest page, and each Older click appends the cursor that page handed back so Newer can pop
  // to the page before it without re-deriving anything.
  const [cursorHistory, setCursorHistory] = React.useState<
    (string | undefined)[]
  >([undefined])
  const [pageIndex, setPageIndex] = React.useState(0)
  const [parameterFilter, setParameterFilter] = React.useState("all")
  const [historyRange, setHistoryRange] = React.useState<HistoryRangeValue>(
    DEFAULT_HISTORY_RANGE
  )
  const [filterDialogOpen, setFilterDialogOpen] = React.useState(false)

  // One entry per active filter — drives both the "Filter • N" count on the trigger button and the
  // removable badge row. The history range has its own dedicated picker/trigger, so it isn't duplicated
  // here as a badge.
  const activeFilters: { key: string; label: string; onRemove: () => void }[] =
    []
  if (parameterFilter !== "all") {
    const label = PARAMETER_FILTER_ITEMS.find(
      (item) => item.value === parameterFilter
    )?.label
    activeFilters.push({
      key: "parameter",
      label: `Parameter: ${label}`,
      onRemove: () => setParameterFilter("all"),
    })
  }
  const hasActiveFilter = activeFilters.length > 0

  // A fresh pond, a changed parameter filter, or a changed range invalidates whatever page/cursor was
  // scrolled to — a cursor encodes a position within one (pond, parameter, range) scan and can't carry over
  // to another.
  const pageResetKey = `${pondId}:${parameterFilter}:${historyRangeKey(historyRange)}`
  const [pageResetFor, setPageResetFor] = React.useState(pageResetKey)
  if (pageResetKey !== pageResetFor) {
    setPageResetFor(pageResetKey)
    setCursorHistory([undefined])
    setPageIndex(0)
  }

  const { data: readingsPage, error: readingsError } = usePondReadingsPage(
    pondId,
    {
      before: cursorHistory[pageIndex],
      parameter: parameterFilter === "all" ? undefined : parameterFilter,
      range: historyRange,
    }
  )
  const pageReadings = React.useMemo(
    () => readingsPage?.readings ?? [],
    [readingsPage]
  )
  const rangeStart = pageIndex * READINGS_PAGE_SIZE + 1
  const rangeEnd = rangeStart + pageReadings.length - 1

  // One row per timestamp instead of one row per (timestamp, parameter): a device reports every parameter
  // in the same tick, so readings sharing a `recordedAt` belong on one line — parameter names read as table
  // columns instead of a repeated "Parameter" cell down every row.
  const pivotedRows = React.useMemo(() => {
    const rows: PivotRow[] = []
    const byTime = new Map<string, PivotRow>()
    for (const reading of pageReadings) {
      let row = byTime.get(reading.recordedAt)
      if (!row) {
        row = { recordedAt: reading.recordedAt, values: {} }
        byTime.set(reading.recordedAt, row)
        rows.push(row)
      }
      row.values[reading.parameter] = reading.value
    }
    return rows
  }, [pageReadings])
  const visibleParameters =
    parameterFilter === "all"
      ? PARAMETERS
      : PARAMETERS.filter((parameter) => parameter.id === parameterFilter)

  const [exportOpen, setExportOpen] = React.useState(false)

  const goOlder = () => {
    const nextCursor = readingsPage?.nextCursor
    if (!nextCursor) return
    setCursorHistory((history) => [
      ...history.slice(0, pageIndex + 1),
      nextCursor,
    ])
    setPageIndex((index) => index + 1)
  }
  const goNewer = () => setPageIndex((index) => Math.max(0, index - 1))

  const backLink = (
    <Link
      to="/ponds"
      className="inline-flex w-fit items-center gap-1 font-sans text-xs text-board-muted hover:text-board-fg"
    >
      <ArrowLeft className="size-3" />
      Ponds
    </Link>
  )

  if (!pond) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        {error ? (
          <BoardEmptyState icon={AlertTriangle} tone="error">
            {error instanceof ApiError && error.status === 404
              ? "This pond doesn't exist."
              : `Couldn't load this pond: ${error.message}`}
          </BoardEmptyState>
        ) : (
          <p className="font-sans text-sm text-board-muted">Loading pond…</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {backLink}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
            {pond.name}
          </h1>
          {pond.status === "ARCHIVED" ? (
            <StatusBadge status="stale">Archived</StatusBadge>
          ) : null}
        </div>
        <PondDeviceMeta pond={pond} now={now} />
        {pond.fishSpecies || pond.pondType ? (
          <p className="font-sans text-xs text-board-muted">
            {[pond.fishSpecies, pondTypeLabel(pond.pondType)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        {pond.notes ? (
          <p className="font-sans text-xs text-board-muted">{pond.notes}</p>
        ) : null}
      </div>

      <PondLiveReadings pond={pond} now={now} />

      <CombinedTrendChart pond={pond} now={now} range={historyRange} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase">
            Reading history
          </h2>
          <div className="flex items-center gap-2">
            <HistoryRangePicker
              value={historyRange}
              onChange={setHistoryRange}
            />
            <Button
              variant={hasActiveFilter ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFilterDialogOpen(true)}
              aria-haspopup="dialog"
            >
              <Filter />
              Filter
              {hasActiveFilter ? (
                <span className="tabular-nums">• {activeFilters.length}</span>
              ) : null}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen(true)}
            >
              <Download />
              Export
            </Button>
          </div>
        </div>

        {hasActiveFilter ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="outline"
                className="gap-1 py-1 pr-1 pl-2"
              >
                {filter.label}
                <button
                  type="button"
                  aria-label={`Remove filter: ${filter.label}`}
                  className="rounded-full p-0.5 text-board-muted transition-colors hover:bg-board-panel-raised hover:text-board-fg"
                  onClick={filter.onRemove}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}

        {readingsError ? (
          <BoardEmptyState icon={AlertTriangle} tone="error">
            {`Couldn't load readings: ${readingsError.message}`}
          </BoardEmptyState>
        ) : !readingsPage ? (
          <p className="font-sans text-sm text-board-muted">
            Loading readings…
          </p>
        ) : pageReadings.length === 0 && pageIndex === 0 ? (
          <BoardEmptyState icon={Gauge}>
            {hasActiveFilter
              ? "No readings match the current filters."
              : "No readings yet."}
          </BoardEmptyState>
        ) : (
          <div className="board-groove overflow-hidden rounded-xl border border-board-border bg-board-panel">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Time</TableHead>
                  {visibleParameters.map((parameter) => {
                    const Icon = PARAMETER_ICONS[parameter.id] ?? Gauge
                    return (
                      <TableHead key={parameter.id} className="text-right">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <Icon className="size-3 text-board-muted" />
                          {parameter.label}
                        </span>
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pivotedRows.map((row) => (
                  <PivotedRow
                    key={row.recordedAt}
                    row={row}
                    now={now}
                    parameters={visibleParameters}
                    thresholds={pond.thresholds}
                  />
                ))}
              </TableBody>
            </Table>

            <div className="board-groove flex items-center justify-between gap-2 px-3 py-2">
              <p className="font-heading text-xs text-board-muted tabular-nums">
                Showing {rangeStart}–{rangeEnd}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Newer readings"
                  disabled={pageIndex === 0}
                  onClick={goNewer}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Older readings"
                  disabled={!readingsPage.nextCursor}
                  onClick={goOlder}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ExportReadingsDialog
        pondId={pondId}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />
      <ReadingsFilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        filters={{ parameter: parameterFilter }}
        onApply={(next) => setParameterFilter(next.parameter)}
      />
    </div>
  )
}

function PivotedRow({
  row,
  now,
  parameters,
  thresholds,
}: {
  row: PivotRow
  now: number
  parameters: ParameterConfig[]
  // Resolved for this pond's type by the server, so a historical row is colored by the same band
  // that would have alerted on it.
  thresholds: Record<string, Threshold>
}) {
  const t = Date.parse(row.recordedAt)

  return (
    <TableRow>
      <TableCell className="font-heading text-xs tabular-nums">
        {formatClock(t)}
        <p className="font-sans text-[0.7rem] text-board-muted">
          {formatRelative(t, now)}
        </p>
      </TableCell>
      {parameters.map((parameter) => {
        const value = row.values[parameter.id]
        const threshold = thresholds[parameter.id]
        if (value === undefined || !threshold) {
          return (
            <TableCell
              key={parameter.id}
              className="text-right font-heading text-xs text-board-muted/50 tabular-nums"
            >
              —
            </TableCell>
          )
        }
        const severity = severityFor(threshold, value)
        return (
          <TableCell
            key={parameter.id}
            className={cn(
              "text-right font-heading text-xs tabular-nums",
              STATUS_STYLES[severity].value
            )}
          >
            {value.toFixed(parameter.precision)} {parameter.unit}
            <span className="sr-only"> — {STATUS_LABELS[severity]}</span>
          </TableCell>
        )
      })}
    </TableRow>
  )
}
