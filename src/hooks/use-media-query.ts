import * as React from "react"

// Subscribed rather than read once, so rotating a tablet or resizing the window swaps a layout that
// depends on it (e.g. popover vs. bottom sheet) without a reload.
export function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}
