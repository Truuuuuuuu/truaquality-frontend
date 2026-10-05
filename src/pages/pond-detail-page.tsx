import * as React from "react"
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  Filter,
  Gauge,
  Waves,
  Wifi,
  X,
} from "lucide-react"
import { Link, useParams } from "react-router"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { BoardEmptyState } from "@/components/board-empty-state"
import { OpenAlertsChip } from "@/components/open-alerts-chip"
import { ExportReadingsDialog } from "@/components/ponds/export-readings-dialog"
import { HistoryRangePicker } from "@/components/ponds/history-range-picker"
import { HistorySummary } from "@/components/ponds/history-summary"
import { PondConnectionStatus } from "@/components/ponds/pond-device-meta"
import { PondHistoryCharts } from "@/components/ponds/pond-history-charts"
import { PondLiveReadings } from "@/components/ponds/pond-live-readings"
import { ReadingsFilterDialog } from "@/components/ponds/readings-filter-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import { ApiError, type Pond } from "@/lib/api"
import { formatClock, formatRelative } from "@/lib/format-time"
import { formatReading } from "@/lib/reading-format"
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
import {
  isDeviceOnline,
  lastReadingAt,
  openAlertSummary,
  pondConnectionLabel,
  pondStatus,
} from "@/lib/pond-status"
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
          <PondDetailSkeleton />
        )}
      </div>
    )
  }

  const pondType = pondTypeLabel(pond.pondType)

  return (
    <div className="flex flex-col gap-8">
      {/* Split title bar: who the pond is on the left, how it's doing on the right. The question someone
          opens this page with — "is this pond OK, and is its unit still reporting?" — gets its own
          readout instead of a badge tucked beside the name, and the device/network details drop to a
          quiet reference line under the identity. */}
      <header className="flex flex-col gap-3">
        {backLink}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <h1 className="font-sans text-2xl leading-tight font-semibold tracking-tight text-balance text-board-fg">
                {pond.name}
              </h1>
              {pond.fishSpecies || pondType ? (
                <p
                  tabIndex={0}
                  role="group"
                  aria-label={[
                    pond.fishSpecies ? `Species: ${pond.fishSpecies}` : null,
                    pondType ? `Pond type: ${pondType}` : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-sm"
                >
                  {/* The icons carry the "species" / "pond type" labels, so the two values read as two
                      distinct facts without a separator dot between them. */}
                  {pond.fishSpecies ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-board-fg">
                      <FishIcon
                        className="size-4 shrink-0 text-board-muted"
                        aria-hidden="true"
                      />
                      {pond.fishSpecies}
                    </span>
                  ) : null}
                  {pondType ? (
                    <span className="inline-flex items-center gap-1.5 text-board-muted">
                      <Waves className="size-4 shrink-0" aria-hidden="true" />
                      {pondType} pond
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>

            {pond.notes ? (
              <p
                tabIndex={0}
                role="group"
                aria-label={`Notes: ${pond.notes}`}
                className="max-w-[65ch] font-sans text-xs leading-relaxed text-pretty text-board-muted"
              >
                {pond.notes}
              </p>
            ) : null}

            {pond.device ? <DeviceDisclosure pond={pond} now={now} /> : null}
          </div>

          <PondStatusReadout pond={pond} now={now} />
        </div>
      </header>

      <PondLiveReadings pond={pond} now={now} />

      {/* One range governs the summary, the charts and the table below, so its picker sits at the top of
          them all, in the Summary header. Export stays with History, next to the data it exports. */}
      <HistorySummary
        pond={pond}
        range={historyRange}
        rangeControl={
          <HistoryRangePicker value={historyRange} onChange={setHistoryRange} />
        }
      />

      <section
        aria-labelledby="pond-history-title"
        className="flex flex-col gap-4 border-t border-board-border pt-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="pond-history-title"
            className="font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase"
          >
            Historical trends
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

        <PondHistoryCharts pond={pond} now={now} range={historyRange} />
      </section>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase">
            Reading history
          </h3>
          <div className="flex items-center gap-2">
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
          <ReadingsTableSkeleton parameters={visibleParameters} />
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
        const shown = formatReading(parameter, value)
        return (
          <TableCell
            key={parameter.id}
            className={cn(
              "text-right font-heading text-xs tabular-nums",
              STATUS_STYLES[severity].value
            )}
          >
            {shown.prefix ? (
              // "≈" and "≥" read inconsistently in screen readers, so the spoken form replaces the glyphs.
              <>
                <span aria-hidden="true">{shown.text}</span>
                <span className="sr-only">
                  {shown.spoken}, {STATUS_LABELS[severity]}
                </span>
              </>
            ) : (
              <>
                {shown.number} {shown.unit}
                <span className="sr-only"> — {STATUS_LABELS[severity]}</span>
              </>
            )}
          </TableCell>
        )
      })}
    </TableRow>
  )
}

// The right half of the pond header: the pond's condition as one flooded readout, the same whole-region
// state color the parameter tiles use, so "Warning" here and a warning tile below read as one signal. The
// second line answers the other half of "can I trust this?" — whether the unit is still reporting.
function PondStatusReadout({ pond, now }: { pond: Pond; now: number }) {
  const archived = pond.status === "ARCHIVED"
  const status = archived ? "stale" : pondStatus(pond, now)
  const label = archived
    ? "Archived"
    : (pondConnectionLabel(pond, now) ?? STATUS_LABELS[status])
  const styles = STATUS_STYLES[status]
  const lastReading = lastReadingAt(pond)
  const openAlerts = openAlertSummary(pond)

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={[
        `Pond condition: ${label}`,
        openAlerts?.spoken,
        pond.device
          ? pond.device.lastSeenAt
            ? `device last seen ${formatRelative(Date.parse(pond.device.lastSeenAt), now)}`
            : "device never connected"
          : "no device assigned",
        lastReading ? `last reading at ${formatClock(lastReading)}` : null,
      ]
        .filter(Boolean)
        .join(", ")}
      className={cn(
        "board-groove flex shrink-0 flex-col gap-2 rounded-xl border px-4 py-3 transition-colors duration-500 lg:min-w-60",
        styles.tile
      )}
    >
      <div className={cn("flex items-center gap-2.5", styles.label)}>
        <span
          className={cn("size-2.5 shrink-0 rounded-full", styles.led)}
          aria-hidden="true"
        />
        <span className="font-sans text-sm font-semibold tracking-[0.08em] uppercase">
          {label}
        </span>
      </div>
      {openAlerts ? (
        <div className="pl-5">
          <OpenAlertsChip pond={pond} />
        </div>
      ) : null}
      <div className="flex flex-col gap-0.5 pl-5 font-sans text-xs text-board-muted">
        {pond.device ? (
          <span className="inline-flex items-center gap-1">
            {isDeviceOnline(pond.device.lastSeenAt, now) ? (
              <Wifi className="size-3" aria-hidden="true" />
            ) : null}
            <PondConnectionStatus pond={pond} now={now} />
          </span>
        ) : (
          <span>
            No device assigned ·{" "}
            <Link
              to="/devices"
              className="text-board-fg underline decoration-board-border-strong underline-offset-2 hover:decoration-board-fg"
            >
              Devices
            </Link>
          </span>
        )}
        {lastReading ? (
          <span className="font-heading tabular-nums">
            Last reading {formatClock(lastReading)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

// Lucide's Fish is too busy at 16px (scales, fins) and its FishSymbol too abstract to read as a fish, so
// this is a plain side-on fish drawn to lucide's grid and stroke (24 px box, 2 px round stroke): an oval
// body, a forked tail, and an eye — just enough to be unmistakable next to the Waves icon.
function FishIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12c2.5-4 5.5-6 9-6s5.5 2.5 7 6c-1.5 3.5-3.5 6-7 6s-6.5-2-9-6Z" />
      <path d="M18 12l4-4v8l-4-4" />
      <path d="M6.5 11h.01" />
    </svg>
  )
}

// The unit reporting from this pond, reduced to its name by default: the model and WiFi network are
// reference detail someone reaches for when troubleshooting, not something to read on every visit. A plain
// disclosure button (aria-expanded + aria-controls) rather than a popover, so the detail pushes content down
// in place and stays readable while someone compares it against the unit in the field.
function DeviceDisclosure({ pond, now }: { pond: Pond; now: number }) {
  const [open, setOpen] = React.useState(false)
  const detailsId = React.useId()
  const device = pond.device
  if (!device) return null

  const name = device.label ?? device.serial
  // The SSID is the last network the unit reported, so once it's offline the value is history.
  const online = isDeviceOnline(device.lastSeenAt, now)
  const details = [
    device.label ? { label: "Serial", value: device.serial, mono: true } : null,
    {
      label: "Model",
      value: device.hardwareModel ?? "Not reported",
      mono: false,
    },
    {
      label: online || !device.wifiSsid ? "WiFi" : "Last known WiFi",
      value: device.wifiSsid ?? "Not reported yet",
      mono: false,
    },
  ].filter((detail) => detail !== null)

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        aria-label={`Device ${name}, ${open ? "hide" : "show"} device details`}
        onClick={() => setOpen((value) => !value)}
        className="group -mx-1.5 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 font-sans text-xs text-board-muted transition-colors hover:bg-board-panel-raised hover:text-board-fg"
      >
        <Cpu className="size-3.5 shrink-0" aria-hidden="true" />
        <span className={cn(device.label ? "font-medium" : "font-heading")}>
          {name}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 motion-safe:transition-transform motion-safe:duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      <dl
        id={detailsId}
        hidden={!open}
        className="grid w-fit grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-l border-board-border-strong pl-3 font-sans text-xs"
      >
        {details.map((detail) => (
          <React.Fragment key={detail.label}>
            <dt className="text-board-muted">{detail.label}</dt>
            <dd
              className={cn(
                "text-board-fg",
                detail.mono && "font-heading",
                detail.label === "Last known WiFi" && "text-board-stale"
              )}
            >
              {detail.value}
            </dd>
          </React.Fragment>
        ))}
        <dd className="col-span-2 pt-1">
          <Link
            to={`/devices/${device.id}`}
            className="inline-flex items-center gap-1 font-medium text-board-fg underline decoration-board-border-strong underline-offset-2 hover:decoration-board-fg"
          >
            View details
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        </dd>
      </dl>
    </div>
  )
}

// Mirrors the loaded page's top — split title bar, then one live-reading tile per parameter — so the
// header and tiles don't jump when the pond lands. The back link stays real above it.
function PondDetailSkeleton() {
  return (
    <div
      className="flex flex-col gap-8"
      aria-busy="true"
      aria-label="Loading pond"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex min-w-0 flex-col gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PARAMETERS.map((parameter) => (
          <Skeleton key={parameter.id} className="min-h-44 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

type ReadingsTableSkeletonProps = { parameters: ParameterConfig[] }

// Same wrapper, real headers and pager strip as the loaded table, so column widths and the table's
// height hold steady when a page of readings arrives.
function ReadingsTableSkeleton({ parameters }: ReadingsTableSkeletonProps) {
  return (
    <div
      className="board-groove overflow-hidden rounded-xl border border-board-border bg-board-panel"
      aria-busy="true"
      aria-label="Loading readings"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Time</TableHead>
            {parameters.map((parameter) => {
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
          {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
            <TableRow key={row} className="hover:bg-transparent">
              <TableCell>
                <Skeleton className="h-3 w-28" />
              </TableCell>
              {parameters.map((parameter) => (
                <TableCell key={parameter.id}>
                  <Skeleton className="ml-auto h-3 w-14" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="board-groove flex items-center justify-between gap-2 px-3 py-2">
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="size-7 rounded-md" />
        </div>
      </div>
    </div>
  )
}
