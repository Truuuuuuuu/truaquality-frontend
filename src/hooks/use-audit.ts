import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/auth-context"
import { listAuditLog, type AuditFilters } from "@/lib/api"

export const AUDIT_PAGE_SIZE = 20

// The audit log is rendered as a table (like Users/Ponds/Devices), so it pages the same way they
// do — a fixed page with Previous/Next and a "12–22 of 33" count — rather than the Notifications
// feed's "load older" accumulation, which fits a scrolling list better than a table.
//
// The backend only offers keyset ("before this cursor") pagination, since the log grows without
// bound and an offset would get slower the further back you page. Random-access page numbers
// aren't possible on top of that, but sequential Previous/Next is: each page's response carries the
// cursor for the page after it, and `goToPage` records it — only ever moving one page at a time, the
// only thing BoardPager's Previous/Next buttons ever ask for — so stepping back later can reuse it.
export function useAuditPager(
  filters: AuditFilters,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const { authorizedRequest } = useAuth()

  const filterKey = JSON.stringify(filters)
  // Adjusting state during render (not an effect) when a prop changes, same idea as React's own
  // "resetting state when a prop changes" recipe: a filter change means the previously-recorded
  // cursors describe a different result set, so paging must restart at page 1 rather than reuse them.
  const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey)
  const [pageIndex, setPageIndex] = React.useState(0)
  const [cursorStack, setCursorStack] = React.useState<string[]>([])
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey)
    setPageIndex(0)
    setCursorStack([])
  }

  // cursorStack[i] is the `before` value that fetches page i (0-based); index 0 is never read,
  // since the first page takes no cursor.
  const before = pageIndex === 0 ? undefined : cursorStack[pageIndex]
  const query = useQuery({
    queryKey: ["audit", filters, before],
    queryFn: () =>
      authorizedRequest((token) =>
        listAuditLog(token, { ...filters, before, limit: AUDIT_PAGE_SIZE })
      ),
    enabled,
  })

  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE))

  function goToPage(next: number) {
    if (next < 1 || next > pageCount) return
    const nextIndex = next - 1
    if (nextIndex === pageIndex + 1) {
      // Moving one page forward: the cursor for it is this page's nextCursor, which is only ever
      // read here — once this page has already loaded, since Next stays disabled until then (the
      // page count above only grows past pageIndex + 1 once total, and so this page's data, is in).
      const cursor = query.data?.nextCursor
      if (!cursor) return
      setCursorStack((current) => {
        const copy = [...current]
        copy[nextIndex] = cursor
        return copy
      })
    }
    setPageIndex(nextIndex)
  }

  return {
    entries: query.data?.entries ?? [],
    total,
    page: pageIndex + 1,
    pageCount,
    pageSize: AUDIT_PAGE_SIZE,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    goToPage,
  }
}
