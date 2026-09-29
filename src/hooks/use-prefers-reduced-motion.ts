import * as React from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

// Subscribes to the OS setting, so toggling it mid-session stops a looping SVG animation (which CSS
// media queries can't reach for SMIL `<animate>`) without a reload.
export function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(QUERY)
      query.addEventListener("change", onChange)
      return () => query.removeEventListener("change", onChange)
    },
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}
