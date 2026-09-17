import * as React from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDateTimeShort } from "@/lib/format-time"
import {
  HISTORY_RANGE_PRESETS,
  type HistoryRangeValue,
} from "@/lib/history-range"

type HistoryRangePickerProps = {
  value: HistoryRangeValue
  onChange: (range: HistoryRangeValue) => void
}

// datetime-local values ("" when unset) in the browser's own timezone, converted to UTC ISO only on Apply —
// same convention readings-filter-dialog.tsx used for its now-removed date inputs.
function toDatetimeLocal(iso: string) {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// Drives both the reading-history table and the combined trend chart on the pond detail page. A preset is a
// rolling window that always runs through "now" and keeps the table/chart polling; "Custom" is a frozen
// snapshot of a past range that doesn't poll (see resolveHistoryRange/usePondReadingsPage).
export function HistoryRangePicker({
  value,
  onChange,
}: HistoryRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [customFrom, setCustomFrom] = React.useState(
    value.kind === "fixed" ? toDatetimeLocal(value.from) : ""
  )
  const [customTo, setCustomTo] = React.useState(
    value.kind === "fixed" ? toDatetimeLocal(value.to) : ""
  )
  const invalidCustomRange = Boolean(
    customFrom && customTo && customFrom > customTo
  )

  function selectPreset(preset: (typeof HISTORY_RANGE_PRESETS)[number]) {
    onChange({
      kind: "rolling",
      windowMs: preset.windowMs,
      label: preset.label,
    })
    setOpen(false)
  }

  function applyCustom() {
    if (!customFrom || !customTo || invalidCustomRange) return
    const from = new Date(customFrom).toISOString()
    const to = new Date(customTo).toISOString()
    onChange({
      kind: "fixed",
      from,
      to,
      label: `${formatDateTimeShort(Date.parse(from))} – ${formatDateTimeShort(Date.parse(to))}`,
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant={value.kind === "fixed" ? "secondary" : "outline"}
            size="sm"
          >
            <Clock />
            {value.label}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-64">
        <div className="flex flex-col gap-1">
          {HISTORY_RANGE_PRESETS.map((preset) => {
            const isSelected =
              value.kind === "rolling" && value.windowMs === preset.windowMs
            return (
              <Button
                key={preset.windowMs}
                type="button"
                variant={isSelected ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => selectPreset(preset)}
              >
                {preset.label}
              </Button>
            )
          })}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
          <Label
            htmlFor="history-range-from"
            className="font-sans text-xs text-muted-foreground"
          >
            Custom range
          </Label>
          <div className="flex flex-col gap-1.5">
            <Input
              id="history-range-from"
              type="datetime-local"
              aria-label="From date and time"
              value={customFrom}
              max={customTo || undefined}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
            <Input
              type="datetime-local"
              aria-label="To date and time"
              value={customTo}
              min={customFrom || undefined}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </div>
          {invalidCustomRange ? (
            <p role="alert" className="font-sans text-xs text-destructive">
              The &quot;from&quot; date must be before the &quot;to&quot; date.
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={!customFrom || !customTo || invalidCustomRange}
            onClick={applyCustom}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
