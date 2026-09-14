import * as React from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  Filter,
  Gauge,
  WifiOff,
  X,
} from "lucide-react"
import { Link, useParams } from "react-router"
import { cn } from "cn"
import { BoardEmptyState } from "@/components/board-empty-state"
import { ParameterTile } from "@/components/dashboard/parameter-tile"
import { ExportReadingsDialog } from "@/components/ponds/export-readings-dialog"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  READINGS_PAGE_SIZE,
  usePond,
  usePondReadingsPage,
  usePondSeries,
} from "@/hooks/use-ponds"
import { useNow } from "@/hooks/use-now"
import { ApiError } from "@/lib/api"
import { formatClock, formatRelative } from "@/lib/format-time"
import {
  PARAMETER_ICONS,
  PARAMETERS,
  severityFor,
  toReadingState,
  type ParameterConfig,
  type ReadingPoint,
} from "@/lib/parameters"
import { isDeviceOnline } from "@/lib/pond-status"
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"

const PARAMETER_FILTER_ITEMS = [
  { value: "all", label: "All parameters" },
  ...PARAMETERS.map((parameter) => ({
    value: parameter.id,
    label: parameter.label,
  })),
]

type PivotRow = { recordedAt: string; values: Partial<Record<string, number>> }

export function PondDetailPage() {
  const { pondId = "" } = useParams()
  const { data: pond, error } = usePond(pondId)
  const { data: series } = usePondSeries(pondId)
  const now = useNow()

  const historyByParameter = React.useMemo(() => {
    const byParameter = new Map<string, ReadingPoint[]>()
    for (const point of series?.points ?? []) {
      const history = byParameter.get(point.parameter) ?? []
      history.push({ t: Date.parse(point.t), v: point.avg })
      byParameter.set(point.parameter, history)
    }
    return byParameter
  }, [series])

  // Newest-first, keyset-paginated pages from the server (see usePondReadingsPage): `cursorHistory[0]` is
  // always the newest page, and each Older click appends the cursor that page handed back so Newer can pop
  // to the page before it without re-deriving anything.
  const [cursorHistory, setCursorHistory] = React.useState<
    (string | undefined)[]
  >([undefined])
  const [pageIndex, setPageIndex] = React.useState(0)
  const [parameterFilter, setParameterFilter] = React.useState("all")
  // datetime-local values ("" when unset), in the browser's own timezone — converted to UTC ISO only when
  // actually sent to the API (see fromIso/toIso below).
  const [fromFilter, setFromFilter] = React.useState("")
  const [toFilter, setToFilter] = React.useState("")
  const hasActiveFilter =
    parameterFilter !== "all" || fromFilter !== "" || toFilter !== ""

  // A fresh pond, or a changed filter, invalidates whatever page/cursor was scrolled to — a cursor encodes a
  // position within one (pond, parameter, range) scan and can't carry over to another.
  const pageResetKey = `${pondId}:${parameterFilter}:${fromFilter}:${toFilter}`
  const [pageResetFor, setPageResetFor] = React.useState(pageResetKey)
  if (pageResetKey !== pageResetFor) {
    setPageResetFor(pageResetKey)
    setCursorHistory([undefined])
    setPageIndex(0)
  }

  const fromIso = fromFilter ? new Date(fromFilter).toISOString() : undefined
  const toIso = toFilter ? new Date(toFilter).toISOString() : undefined
  const invalidRange = Boolean(fromFilter && toFilter && fromFilter > toFilter)

  const { data: readingsPage, error: readingsError } = usePondReadingsPage(
    pondId,
    {
      before: cursorHistory[pageIndex],
      parameter: parameterFilter === "all" ? undefined : parameterFilter,
      from: invalidRange ? undefined : fromIso,
      to: invalidRange ? undefined : toIso,
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

  const device = pond.device
  const deviceOnline = device ? isDeviceOnline(device.lastSeenAt, now) : false

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
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-sans text-xs text-board-muted">
          {device ? (
            <>
              <Cpu className="size-3" />
              <span className="font-heading">{device.serial}</span>
              {device.hardwareModel ? (
                <span>· {device.hardwareModel}</span>
              ) : null}
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  !deviceOnline && "text-board-stale"
                )}
              >
                · {deviceOnline ? null : <WifiOff className="size-3" />}
                {device.lastSeenAt
                  ? `last seen ${formatRelative(Date.parse(device.lastSeenAt), now)}`
                  : "never connected"}
              </span>
            </>
          ) : (
            "No monitoring device assigned — assign one from the Devices page."
          )}
        </p>
        {pond.notes ? (
          <p className="font-sans text-xs text-board-muted">{pond.notes}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PARAMETERS.map((parameter) => {
          let history = historyByParameter.get(parameter.id) ?? []
          const latest = pond.latest[parameter.id]
          // A device silent for longer than the history window still has a last known value; show it
          // (it will read as stale) rather than claiming the pond has no data.
          if (history.length === 0 && latest) {
            history = [{ t: Date.parse(latest.recordedAt), v: latest.value }]
          }
          const reading = toReadingState(parameter, history, now)
          return reading ? (
            <ParameterTile
              key={parameter.id}
              reading={reading}
              now={now}
              icon={PARAMETER_ICONS[parameter.id] ?? Gauge}
            />
          ) : (
            <NoDataTile key={parameter.id} parameter={parameter} />
          )
        })}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase">
            Reading history
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportOpen(true)}
          >
            <Download />
            Export
          </Button>
        </div>

        <div className="board-groove flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-board-border bg-board-panel px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 shrink-0 text-board-muted" />
            <Select
              items={PARAMETER_FILTER_ITEMS}
              value={parameterFilter}
              onValueChange={(value) => setParameterFilter(value as string)}
            >
              <SelectTrigger
                size="sm"
                aria-label="Filter by parameter"
                className="w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARAMETER_FILTER_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 shrink-0 text-board-muted" />
            <Input
              type="datetime-local"
              aria-label="From date and time"
              className="h-7 w-[168px] text-xs"
              value={fromFilter}
              max={toFilter || undefined}
              onChange={(event) => setFromFilter(event.target.value)}
            />
            <span className="font-sans text-xs text-board-muted">to</span>
            <Input
              type="datetime-local"
              aria-label="To date and time"
              className="h-7 w-[168px] text-xs"
              value={toFilter}
              min={fromFilter || undefined}
              onChange={(event) => setToFilter(event.target.value)}
            />
          </div>

          {hasActiveFilter ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setParameterFilter("all")
                setFromFilter("")
                setToFilter("")
              }}
            >
              <X />
              Clear filters
            </Button>
          ) : null}
        </div>

        {invalidRange ? (
          <p role="alert" className="font-sans text-xs text-destructive">
            The "from" date must be before the "to" date.
          </p>
        ) : readingsError ? (
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
            <div className="px-2 py-1">
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
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

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
    </div>
  )
}

function PivotedRow({
  row,
  now,
  parameters,
}: {
  row: PivotRow
  now: number
  parameters: ParameterConfig[]
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
        if (value === undefined) {
          return (
            <TableCell
              key={parameter.id}
              className="text-right font-heading text-xs text-board-muted/50 tabular-nums"
            >
              —
            </TableCell>
          )
        }
        const severity = severityFor(parameter, value)
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
