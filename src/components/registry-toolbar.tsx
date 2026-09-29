import { Search, X } from "lucide-react"
import { cn } from "cn"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * The primary axis of a registry: kept visible as chips rather than folded into a menu, each
 * carrying how many rows it would show, so the state of the fleet is legible without selecting
 * anything. Chips stay achromatic — the board reserves green/amber/red for readings themselves,
 * and the row badges already carry that color.
 */
type ChipFilter<T extends string> = {
  /** Names the axis for screen readers, e.g. "Filter by status". */
  label: string
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string; count: number }[]
}

/** A secondary axis, compact enough to stay out of the way until someone needs it. */
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
  /** A second secondary axis, sitting just before `select` at the right edge. */
  extraSelect?: SelectFilter<T>
}

function SelectControl<S extends string>({
  select,
  className,
}: {
  select: SelectFilter<S>
  className?: string
}) {
  return (
    <Select
      items={select.options.map(({ value, label }) => ({ value, label }))}
      value={select.value}
      onValueChange={(next) =>
        select.onChange((next ?? select.options[0].value) as S)
      }
    >
      <SelectTrigger
        aria-label={select.label}
        className={cn("w-36", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {select.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
}: RegistryToolbarProps<C, S, T>) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="relative w-full sm:w-100">
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

      <div
        role="group"
        aria-label={chips.label}
        className="flex flex-wrap gap-1 rounded-lg border border-board-border bg-board-panel p-0.5"
      >
        {chips.options.map((option) => {
          const active = chips.value === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => chips.onChange(option.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-sans text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "bg-board-fg text-board-bg"
                  : "text-board-muted hover:text-board-fg"
              )}
            >
              {option.label}
              <span
                className={cn(
                  "font-heading text-[0.7rem] tabular-nums",
                  active ? "text-board-bg/80" : "text-board-muted"
                )}
              >
                {option.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Pushed to the right edge only once the toolbar is a single row; stacked, they stay in the
          left-aligned column with the controls above them instead of floating off alone. */}
      {extraSelect ? (
        <SelectControl select={extraSelect} className="sm:ml-auto" />
      ) : null}
      {select ? (
        <SelectControl
          select={select}
          className={extraSelect ? undefined : "sm:ml-auto"}
        />
      ) : null}
    </div>
  )
}
