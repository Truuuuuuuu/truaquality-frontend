import * as React from "react"
import { cn } from "cn"
import type { Pond } from "@/lib/api"
import type { ReadingStatus } from "@/lib/parameters"
import { pondPanelId, pondTabId } from "@/lib/pond-status"
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
//
// Follows the WAI-ARIA tabs pattern's keyboard model, not just its roles: only the selected tab sits
// in the page's Tab order (roving tabindex), and Left/Right/Home/End move focus *and* selection among
// tabs — Tab itself is left free to leave the tablist for the panel below.
export function PondSwitcher({
  entries,
  selectedId,
  onSelect,
}: PondSwitcherProps) {
  const tabRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map())

  if (entries.length <= 1) return null

  const moveTo = (index: number) => {
    const wrapped = (index + entries.length) % entries.length
    const id = entries[wrapped].pond.id
    onSelect(id)
    tabRefs.current.get(id)?.focus()
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault()
        moveTo(index + 1)
        break
      case "ArrowLeft":
        event.preventDefault()
        moveTo(index - 1)
        break
      case "Home":
        event.preventDefault()
        moveTo(0)
        break
      case "End":
        event.preventDefault()
        moveTo(entries.length - 1)
        break
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Pond"
      className="flex gap-5 overflow-x-auto border-b border-board-border"
    >
      {entries.map(({ pond, status }, index) => {
        const isSelected = pond.id === selectedId
        return (
          <button
            key={pond.id}
            ref={(el) => {
              if (el) tabRefs.current.set(pond.id, el)
              else tabRefs.current.delete(pond.id)
            }}
            type="button"
            role="tab"
            id={pondTabId(pond.id)}
            aria-controls={pondPanelId(pond.id)}
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(pond.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
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
