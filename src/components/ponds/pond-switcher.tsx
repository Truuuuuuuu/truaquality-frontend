import { cn } from "cn"
import type { Pond } from "@/lib/api"
import type { ReadingStatus } from "@/lib/parameters"
import { STATUS_STYLES } from "@/lib/status-styles"

type PondSwitcherProps = {
  entries: { pond: Pond; status: ReadingStatus }[]
  selectedId: string
  onSelect: (id: string) => void
}

// A channel-select strip, not a card list: one underlined tab per pond, LED-dotted by that pond's
// status. The underline marks "selected" the same neutral way the sidebar's inverted block does —
// in board-fg ink, never a status color, so "which pond am I looking at" never reads as "which pond
// is nominal." Renders nothing for a single-pond board — there's nothing to switch between.
export function PondSwitcher({
  entries,
  selectedId,
  onSelect,
}: PondSwitcherProps) {
  if (entries.length <= 1) return null

  return (
    <div
      role="tablist"
      aria-label="Pond"
      className="flex gap-5 overflow-x-auto border-b border-board-border"
    >
      {entries.map(({ pond, status }) => {
        const isSelected = pond.id === selectedId
        return (
          <button
            key={pond.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(pond.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 border-b-2 pb-2.5 font-sans text-xs font-medium transition-colors",
              isSelected
                ? "border-board-fg text-board-fg"
                : "border-transparent text-board-muted hover:border-board-border-strong hover:text-board-fg"
            )}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                STATUS_STYLES[status].led
              )}
              aria-hidden="true"
            />
            <span className="max-w-40 truncate">{pond.name}</span>
          </button>
        )
      })}
    </div>
  )
}
