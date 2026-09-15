export { cn } from "cn"

// First initial + last initial ("Juan Dela Cruz" -> "JD"); falls back to just the first initial for
// a single-word name so this never renders an empty avatar.
export function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}
