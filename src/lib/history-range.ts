// A pond detail page's selected reading-history window: either a rolling preset that always runs through
// "now" (and keeps polling), or a custom from/to picked by the user (a frozen snapshot that doesn't poll).
export type HistoryRangeValue =
  | { kind: "rolling"; windowMs: number; label: string }
  | { kind: "fixed"; from: string; to: string; label: string }

export const HISTORY_RANGE_PRESETS = [
  { windowMs: 2 * 60 * 60 * 1000, label: "Last 2h" },
  { windowMs: 24 * 60 * 60 * 1000, label: "Last 24h" },
  { windowMs: 7 * 24 * 60 * 60 * 1000, label: "Last 7d" },
] as const

export const DEFAULT_HISTORY_RANGE: HistoryRangeValue = {
  kind: "rolling",
  windowMs: HISTORY_RANGE_PRESETS[0].windowMs,
  label: HISTORY_RANGE_PRESETS[0].label,
}

// Resolves a range to the `from`/`to` the API expects, as of `nowMs`. A rolling range never returns `to` —
// callers rely on that to decide whether a query should keep polling (only an open-ended range is "live").
export function resolveHistoryRange(
  range: HistoryRangeValue,
  nowMs: number
): { from: string; to?: string } {
  return range.kind === "rolling"
    ? { from: new Date(nowMs - range.windowMs).toISOString() }
    : { from: range.from, to: range.to }
}

// The equal-length window just before a range, for comparing a range's average against the one before it.
// Same width means the server picks the same series resolution, so the two averages compare like with like.
export function resolvePreviousHistoryRange(
  range: HistoryRangeValue,
  nowMs: number
): { from: string; to: string } {
  const end =
    range.kind === "rolling" ? nowMs - range.windowMs : Date.parse(range.from)
  const width =
    range.kind === "rolling"
      ? range.windowMs
      : Date.parse(range.to) - Date.parse(range.from)
  return {
    from: new Date(end - width).toISOString(),
    to: new Date(end).toISOString(),
  }
}

// A stable, serializable identity for a range — safe to use inside a TanStack Query key. Two rolling ranges
// with the same window are the same query even though `resolveHistoryRange` returns a different `from` each
// time it's called; two fixed ranges are the same query only if their from/to match exactly.
export function historyRangeKey(range: HistoryRangeValue): string {
  return range.kind === "rolling"
    ? `rolling:${range.windowMs}`
    : `fixed:${range.from}:${range.to}`
}
