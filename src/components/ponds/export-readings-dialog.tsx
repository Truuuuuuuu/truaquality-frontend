import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { errorMessage, exportPondReadings } from "@/lib/api"

const READING_TYPES = [
  { value: "hour", label: "Hourly summary" },
  { value: "raw", label: "Raw (per-30 seconds)" },
] as const

function todayInputValue(offsetDays: number) {
  return new Date(Date.now() - offsetDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

type ExportReadingsDialogProps = {
  pondId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Confirmation dialog for exporting a pond's readings as a formatted .xlsx workbook, for BFAR reporting
// outside the app. Hourly summaries can cover years; raw export is capped to the server's raw retention
// window (see backend/CLAUDE.md). The pond detail page shows only a plain "Export" button; the date range
// and reading type are chosen here rather than as a permanent row of controls next to "Reading history".
export function ExportReadingsDialog({
  pondId,
  open,
  onOpenChange,
}: ExportReadingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ExportReadingsForm
          key={open ? "open" : "closed"}
          pondId={pondId}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function ExportReadingsForm({
  pondId,
  onDone,
}: {
  pondId: string
  onDone: () => void
}) {
  const { authorizedRequest } = useAuth()
  const [from, setFrom] = React.useState(() => todayInputValue(7))
  const [to, setTo] = React.useState(() => todayInputValue(0))
  const [readingType, setReadingType] = React.useState<"raw" | "hour">("hour")
  const [isExporting, setIsExporting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    try {
      const { blob, filename } = await authorizedRequest((token) =>
        exportPondReadings(token, pondId, {
          from: new Date(`${from}T00:00:00`).toISOString(),
          to: new Date(`${to}T23:59:59`).toISOString(),
          resolution: readingType,
        })
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Export readings</DialogTitle>
        <DialogDescription>
          Choose a date range and reading type, then download an Excel workbook
          of this pond&apos;s readings.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="export-from">Date range</Label>
        <div className="flex items-center gap-1.5">
          <Input
            id="export-from"
            type="date"
            aria-label="From date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
          />
          <span className="font-sans text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            value={to}
            min={from}
            max={todayInputValue(0)}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="export-reading-type">Reading type</Label>
        <Select
          items={READING_TYPES}
          value={readingType}
          onValueChange={(value) => setReadingType(value as "raw" | "hour")}
        >
          <SelectTrigger id="export-reading-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {READING_TYPES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isExporting}
          onClick={onDone}
        >
          Cancel
        </Button>
        <Button type="button" disabled={isExporting} onClick={handleExport}>
          {isExporting ? "Exporting…" : "Export"}
        </Button>
      </DialogFooter>
    </div>
  )
}
