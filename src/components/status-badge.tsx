import type { ReactNode } from "react"
import { cn } from "cn"
import type { ReadingStatus } from "@/lib/parameters"
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"

type StatusBadgeProps = {
  status: ReadingStatus
  // Overrides the default label, e.g. "Archived" or "Disabled" rendered in a status's colors.
  children?: ReactNode
  className?: string
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-sans text-[0.65rem] font-medium tracking-wide uppercase",
        STATUS_STYLES[status].stamp,
        className
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", STATUS_STYLES[status].led)}
        aria-hidden="true"
      />
      {children ?? STATUS_LABELS[status]}
    </span>
  )
}
