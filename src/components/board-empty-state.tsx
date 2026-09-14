import type { ComponentType, ReactNode } from "react"
import { cn } from "cn"

type BoardEmptyStateProps = {
  icon: ComponentType<{ className?: string }>
  children: ReactNode
  action?: ReactNode
  tone?: "muted" | "error"
}

export function BoardEmptyState({
  icon: Icon,
  children,
  action,
  tone = "muted",
}: BoardEmptyStateProps) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "board-groove flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-board-panel/60 px-6 py-16 text-center",
        tone === "error"
          ? "border-board-critical/50"
          : "border-board-border-strong"
      )}
    >
      <Icon
        className={cn(
          "size-6",
          tone === "error" ? "text-board-critical" : "text-board-muted"
        )}
      />
      <div className="max-w-sm font-sans text-sm text-board-muted">
        {children}
      </div>
      {action}
    </div>
  )
}
