import * as React from "react"
import { ListFilter, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"

/**
 * The primary axis of a registry. Each option carries how many rows it would show, so the state of
 * the fleet is still legible from inside the filter panel. Options stay achromatic — the board
 * reserves green/amber/red for readings themselves, and the row badges already carry that color.
 */
type ChipFilter<T extends string> = {
  /** Names the axis for screen readers, e.g. "Filter by status". */
  label: string
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string; count: number }[]
}

/** A secondary axis. Its first option is the "no filter" value, as with `chips`. */
type SelectFilter<T extends string> = {
  label: string
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
}

type RegistryToolbarProps<
  C extends string,
  S extends string,
  T extends string,
> = {
  search: string
  onSearchChange: (search: string) => void
  /** Shown in the field and read to screen readers — name the columns it actually searches. */
  searchLabel: string
  chips: ChipFilter<C>
  select?: SelectFilter<S>
  /** A second secondary axis, listed before `select` in the panel. */
  extraSelect?: SelectFilter<T>
  /** Rows the current search and filters leave, shown on the mobile sheet's close button. */
  resultCount: number
}

type Axis = {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly { value: string; label: string; count?: number }[]
}

// "Filter by pond type" → "Pond type": the aria label already names each axis, so the panel's
// section headings are derived from it rather than passed separately.
function axisTitle(label: string) {
  const bare = label.replace(/^Filter by /i, "")
  return bare.charAt(0).toUpperCase() + bare.slice(1)
}

function AxisOptions({ axis }: { axis: Axis }) {
  const titleId = React.useId()
  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-col gap-2">
      <span
        id={titleId}
        className="font-sans text-[0.7rem] font-medium tracking-wide text-board-muted uppercase"
      >
        {axisTitle(axis.label)}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {axis.options.map((option) => {
          const active = axis.value === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => axis.onChange(option.value)}
              className={cn(
                "flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 font-sans text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "border-board-fg bg-board-fg text-board-bg"
                  : "border-board-border bg-board-panel text-board-muted hover:text-board-fg"
              )}
            >
              {option.label}
              {option.count !== undefined ? (
                <span
                  className={cn(
                    "font-heading text-[0.7rem] tabular-nums",
                    active ? "text-board-bg/80" : "text-board-muted"
                  )}
                >
                  {option.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function RegistryToolbar<
  C extends string,
  S extends string = string,
  T extends string = string,
>({
  search,
  onSearchChange,
  searchLabel,
  chips,
  select,
  extraSelect,
  resultCount,
}: RegistryToolbarProps<C, S, T>) {
  const [open, setOpen] = React.useState(false)
  // Matches the toolbar's own `sm:` breakpoint: a floating panel beside the button once there's
  // room, a bottom sheet within thumb reach on a phone.
  const isDesktop = useMediaQuery("(min-width: 640px)")

  const axes = [chips, extraSelect, select].filter(
    (axis): axis is NonNullable<typeof axis> => axis !== undefined
  ) as unknown as Axis[]
  const activeCount = axes.filter(
    (axis) => axis.value !== axis.options[0].value
  ).length

  // Resets the panel's axes only — the search field sits outside it and has its own clear button.
  function resetFilters() {
    for (const axis of axes) {
      if (axis.value !== axis.options[0].value)
        axis.onChange(axis.options[0].value)
    }
  }

  const triggerLabel =
    activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"

  const trigger = (
    <Button
      variant="outline"
      size="icon"
      aria-label={triggerLabel}
      className={cn(
        "relative shrink-0",
        activeCount > 0 && "border-board-fg text-board-fg"
      )}
    >
      <ListFilter />
      {activeCount > 0 ? (
        <span
          aria-hidden
          className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-board-fg font-heading text-[0.625rem] text-board-bg tabular-nums"
        >
          {activeCount}
        </span>
      ) : null}
    </Button>
  )

  const body = (
    <div className="flex flex-col gap-4">
      {axes.map((axis) => (
        <AxisOptions key={axis.label} axis={axis} />
      ))}
    </div>
  )

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:w-100 sm:flex-none">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-board-muted" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          // Escape clears the field the way it dismisses anything else on the board, so a stale
          // query is never the reason a row seems to be missing.
          onKeyDown={(event) => {
            if (event.key === "Escape") onSearchChange("")
          }}
          placeholder={searchLabel}
          aria-label={searchLabel}
          className={cn("pl-8", search && "pr-8")}
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1 text-board-muted transition-colors outline-none hover:text-board-fg focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <X className="size-3.5" />
            <span className="sr-only">Clear search</span>
          </button>
        ) : null}
      </div>

      {isDesktop ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={trigger} />
          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-80 gap-4 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <PopoverTitle className="font-heading text-sm">
                Filters
              </PopoverTitle>
              <Button
                variant="ghost"
                size="xs"
                onClick={resetFilters}
                disabled={activeCount === 0}
              >
                Reset
              </Button>
            </div>
            {body}
          </PopoverContent>
        </Popover>
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={trigger} />
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="max-h-[85dvh] gap-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
          >
            <div
              aria-hidden
              className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-board-border"
            />
            <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
              <SheetTitle className="text-base">Filters</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                disabled={activeCount === 0}
              >
                Reset
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
              {body}
            </div>
            <div className="border-t border-board-border p-4">
              <SheetClose render={<Button className="h-10 w-full" />}>
                {resultCount === 1
                  ? "Show 1 result"
                  : `Show ${resultCount} results`}
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
