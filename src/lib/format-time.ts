export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function formatRelative(
  timestamp: number,
  now: number = Date.now()
): string {
  const diffMs = now - timestamp
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// Compact "Sep 1" / "Sep 1, 8:30 AM" stamp for a filter chip — the time only appears when the underlying
// datetime-local value actually carries one (not midnight), so an all-day date filter doesn't show a
// misleading "12:00 AM".
export function formatDateTimeShort(timestamp: number): string {
  const date = new Date(timestamp)
  const datePart = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
  if (date.getHours() === 0 && date.getMinutes() === 0) return datePart
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
  return `${datePart}, ${timePart}`
}

// "12 min" / "2 h 5 min" / "3 days" — reads after "No reading for", unlike formatRelative's "12m ago".
export function formatSilentDuration(ms: number): string {
  const minutes = Math.max(1, Math.floor(ms / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    const rest = minutes % 60
    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
  }
  const days = Math.floor(hours / 24)
  return days === 1 ? "1 day" : `${days} days`
}
