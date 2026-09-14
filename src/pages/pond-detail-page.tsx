import * as React from "react"
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Gauge,
  WifiOff,
} from "lucide-react"
import { Link, useParams } from "react-router"
import { cn } from "cn"
import { BoardEmptyState } from "@/components/board-empty-state"
import { ParameterTile } from "@/components/dashboard/parameter-tile"
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
import { usePond, usePondReadings } from "@/hooks/use-ponds"
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

const PAGE_SIZE = 20

export function PondDetailPage() {
  const { pondId = "" } = useParams()
  const { data: pond, error } = usePond(pondId)
  const { data: readings } = usePondReadings(pondId)
  const now = useNow()

  const historyByParameter = React.useMemo(() => {
    const byParameter = new Map<string, ReadingPoint[]>()
    for (const reading of readings ?? []) {
      const history = byParameter.get(reading.parameter) ?? []
      history.push({ t: Date.parse(reading.recordedAt), v: reading.value })
      byParameter.set(reading.parameter, history)
    }
    return byParameter
  }, [readings])

  // Newest first: this table reads as a log of what the device reported and when, not a per-parameter
  // summary — the tiles above already cover "current value", so this covers "history, in order".
  const sortedReadings = React.useMemo(
    () =>
      [...(readings ?? [])].sort(
        (a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt)
      ),
    [readings]
  )

  const [page, setPage] = React.useState(1)
  // A fresh pond's history has nothing to do with whatever page was scrolled to on the last one.
  const [pageResetFor, setPageResetFor] = React.useState(pondId)
  if (pondId !== pageResetFor) {
    setPageResetFor(pondId)
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(sortedReadings.length / PAGE_SIZE))
  // The 2 h window rolls forward as time passes, so a page an older fetch had can quietly disappear —
  // clamp rather than let "page" point past the end.
  const currentPage = Math.min(page, pageCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageReadings = sortedReadings.slice(pageStart, pageStart + PAGE_SIZE)

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
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase">
            Reading history
          </h2>
          <p className="font-sans text-[0.7rem] text-board-muted">
            Last 2 hours
          </p>
        </div>

        {!readings ? (
          <p className="font-sans text-sm text-board-muted">
            Loading readings…
          </p>
        ) : sortedReadings.length === 0 ? (
          <BoardEmptyState icon={Gauge}>
            No readings in the last 2 hours.
          </BoardEmptyState>
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

            <div className="flex items-center justify-between gap-2">
              <p className="font-sans text-[0.7rem] text-board-muted">
                Showing {pageStart + 1}–
                {Math.min(pageStart + PAGE_SIZE, sortedReadings.length)} of{" "}
                {sortedReadings.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous page"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft />
                </Button>
                <span className="font-heading text-xs text-board-muted tabular-nums">
                  {currentPage} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next page"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
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
