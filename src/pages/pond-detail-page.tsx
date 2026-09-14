import * as React from "react"
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  Gauge,
  WifiOff,
} from "lucide-react"
import { Link, useParams } from "react-router"
import { cn } from "cn"
import { BoardEmptyState } from "@/components/board-empty-state"
import { ParameterTile } from "@/components/dashboard/parameter-tile"
import { ExportReadingsDialog } from "@/components/ponds/export-readings-dialog"
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
import { usePond, usePondReadingsPage, usePondSeries } from "@/hooks/use-ponds"
import { useNow } from "@/hooks/use-now"
import { ApiError, type ApiReading } from "@/lib/api"
import { formatClock, formatRelative } from "@/lib/format-time"
import {
  PARAMETER_BY_ID,
  PARAMETER_ICONS,
  PARAMETERS,
  severityFor,
  toReadingState,
  type ParameterConfig,
  type ReadingPoint,
} from "@/lib/parameters"
import { isDeviceOnline } from "@/lib/pond-status"
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"

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
  // A fresh pond's history has nothing to do with whatever page was scrolled to on the last one.
  const [pageResetFor, setPageResetFor] = React.useState(pondId)
  if (pondId !== pageResetFor) {
    setPageResetFor(pondId)
    setCursorHistory([undefined])
    setPageIndex(0)
  }

  const { data: readingsPage } = usePondReadingsPage(
    pondId,
    cursorHistory[pageIndex]
  )
  const pageReadings = readingsPage?.readings ?? []

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

      <div className="flex flex-col gap-2">
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

        {!readingsPage ? (
          <p className="font-sans text-sm text-board-muted">
            Loading readings…
          </p>
        ) : pageReadings.length === 0 && pageIndex === 0 ? (
          <BoardEmptyState icon={Gauge}>No readings yet.</BoardEmptyState>
        ) : (
          <>
            <div className="board-groove rounded-xl border border-board-border bg-board-panel px-2 py-1">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Time</TableHead>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageReadings.map((reading, index) => (
                    <ReadingRow
                      // recordedAt isn't guaranteed unique across parameters reported in the same tick.
                      key={`${reading.parameter}-${reading.recordedAt}-${index}`}
                      reading={reading}
                      now={now}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-end gap-2">
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
          </>
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

function ReadingRow({ reading, now }: { reading: ApiReading; now: number }) {
  const parameter = PARAMETER_BY_ID[reading.parameter]
  const t = Date.parse(reading.recordedAt)
  if (!parameter) return null

  const Icon = PARAMETER_ICONS[parameter.id] ?? Gauge
  const severity = severityFor(parameter, reading.value)

  return (
    <TableRow>
      <TableCell className="font-heading text-xs tabular-nums">
        {formatClock(t)}
        <p className="font-sans text-[0.7rem] text-board-muted">
          {formatRelative(t, now)}
        </p>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 font-sans text-xs text-board-fg">
          <Icon className="size-3 text-board-muted" />
          {parameter.label}
        </span>
      </TableCell>
      <TableCell
        className={cn(
          "font-heading text-xs tabular-nums",
          STATUS_STYLES[severity].value
        )}
      >
        {reading.value.toFixed(parameter.precision)} {parameter.unit}
        <span className="sr-only"> — {STATUS_LABELS[severity]}</span>
      </TableCell>
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
