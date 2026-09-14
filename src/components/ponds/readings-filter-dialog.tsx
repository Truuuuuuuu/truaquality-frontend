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
import { PARAMETER_FILTER_ITEMS } from "@/lib/parameters"

export type ReadingsFilters = {
  parameter: string
  from: string
  to: string
}

const EMPTY_FILTERS: ReadingsFilters = { parameter: "all", from: "", to: "" }

type ReadingsFilterDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: ReadingsFilters
  onApply: (filters: ReadingsFilters) => void
}

// Every filter for the reading-history table lives behind one "Filter" button rather than a permanent row
// of controls next to "Reading history"; the applied filters then surface as removable badges (see
// pond-detail-page.tsx). Draft state here is separate from the applied filters so Cancel/closing the
// dialog never mutates the table until "Apply filters" is pressed.
export function ReadingsFilterDialog({
  open,
  onOpenChange,
  filters,
  onApply,
}: ReadingsFilterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <ReadingsFilterForm
          key={open ? "open" : "closed"}
          filters={filters}
          onApply={(next) => {
            onApply(next)
            onOpenChange(false)
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function ReadingsFilterForm({
  filters,
  onApply,
  onCancel,
}: {
  filters: ReadingsFilters
  onApply: (filters: ReadingsFilters) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = React.useState(filters)
  const invalidRange = Boolean(draft.from && draft.to && draft.from > draft.to)
  const isDirty =
    draft.parameter !== "all" || draft.from !== "" || draft.to !== ""

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Filter readings</DialogTitle>
        <DialogDescription>
          Narrow the reading history table by parameter or date range.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-parameter">Parameter</Label>
        <Select
          items={PARAMETER_FILTER_ITEMS}
          value={draft.parameter}
          onValueChange={(value) =>
            setDraft((current) => ({ ...current, parameter: value as string }))
          }
        >
          <SelectTrigger id="filter-parameter" className="w-full">
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-from">Date range</Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            id="filter-from"
            type="datetime-local"
            aria-label="From date and time"
            className="sm:w-[172px]"
            value={draft.from}
            max={draft.to || undefined}
            onChange={(event) =>
              setDraft((current) => ({ ...current, from: event.target.value }))
            }
          />
          <span className="font-sans text-xs text-muted-foreground">to</span>
          <Input
            type="datetime-local"
            aria-label="To date and time"
            className="sm:w-[172px]"
            value={draft.to}
            min={draft.from || undefined}
            onChange={(event) =>
              setDraft((current) => ({ ...current, to: event.target.value }))
            }
          />
        </div>
        {invalidRange ? (
          <p role="alert" className="text-xs text-destructive">
            The &quot;from&quot; date must be before the &quot;to&quot; date.
          </p>
        ) : null}
      </div>

      <DialogFooter className="sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!isDirty}
          onClick={() => setDraft(EMPTY_FILTERS)}
        >
          Reset
        </Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={invalidRange}
            onClick={() => onApply(draft)}
          >
            Apply filters
          </Button>
        </div>
      </DialogFooter>
    </div>
  )
}
