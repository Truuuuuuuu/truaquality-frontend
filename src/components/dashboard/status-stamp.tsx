import { AlertTriangle, WifiOff } from "lucide-react"
import { cn } from "cn"
import { formatClock, formatRelative } from "@/lib/format-time"
import type { ReadingStatus } from "@/lib/parameters"

type StatusStampProps = {
  status: ReadingStatus
  updatedAt: number
  now: number
  className: string
}

// A stroked-border pill holding a formatted clock time (nominal/warning/critical) or a relative
// time with a wifi-off glyph (stale) — every reading's stamped-value badge, shared by the
// parameter tile and the dashboard's parameter channel group.
export function StatusStamp({
  status,
  updatedAt,
  now,
  className,
}: StatusStampProps) {
  if (status === "stale") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-heading text-[0.65rem] tracking-wide",
          className
        )}
      >
        <WifiOff className="size-3" />
        {formatRelative(updatedAt, now)}
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-heading text-[0.65rem] tracking-wide",
        className
      )}
    >
      {status !== "nominal" ? <AlertTriangle className="size-3" /> : null}
      {formatClock(updatedAt)}
    </span>
  )
}
