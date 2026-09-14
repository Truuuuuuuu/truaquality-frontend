import type { ReadingStatus } from "@/lib/parameters"

export const STATUS_STYLES = {
  nominal: {
    tile: "border-board-border bg-board-panel",
    value: "text-board-fg",
    label: "text-board-muted",
    led: "bg-board-accent",
    stamp: "border-board-border-strong text-board-muted",
  },
  warning: {
    tile: "border-board-warn/40 bg-board-warn/10",
    value: "text-board-warn",
    label: "text-board-warn",
    led: "bg-board-warn",
    stamp: "border-board-warn/50 text-board-warn",
  },
  critical: {
    tile: "border-board-critical/50 bg-board-critical/12",
    value: "text-board-critical",
    label: "text-board-critical",
    led: "bg-board-critical",
    stamp: "border-board-critical/60 text-board-critical",
  },
  stale: {
    tile: "border-dashed border-board-border-strong bg-board-panel/60",
    value: "text-board-stale",
    label: "text-board-stale",
    led: "bg-board-stale/50",
    stamp: "border-board-border-strong text-board-stale",
  },
} as const satisfies Record<ReadingStatus, Record<string, string>>

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  nominal: "Normal",
  warning: "Warning",
  critical: "Critical",
  stale: "No recent data",
}
