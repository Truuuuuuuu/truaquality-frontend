import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type BoardPagerProps = {
  /** 1-based. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** What is being counted, plural — completes "… of 42 <noun>". */
  noun: string
}

/**
 * Range stamp plus step controls for a paged list. The board never shows a value without stating
 * how it was measured, so a paged list states which slice of the whole it is showing rather than
 * offering bare page numbers — the size of the full set is the part an operator actually needs.
 * A list that fits on one page drops the range and the steppers and just states its size.
 */
export function BoardPager({
  page,
  pageSize,
  total,
  onPageChange,
  noun,
}: BoardPagerProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  // Zero-pad every figure to the total's width so stepping through pages never shifts the row.
  const pad = (value: number) =>
    String(value).padStart(String(total).length, "0")

  return (
    <div className="flex items-center justify-between gap-3">
      <p aria-live="polite" className="font-sans text-xs text-board-muted">
        {pageCount > 1 ? (
          <>
            <span className="font-heading text-board-fg tabular-nums">
              {pad(first)}–{pad(last)}
            </span>{" "}
            of{" "}
          </>
        ) : null}
        <span className="font-heading text-board-fg tabular-nums">{total}</span>{" "}
        {noun}
      </p>

      {pageCount > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft />
            <span className="sr-only">Previous page</span>
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
