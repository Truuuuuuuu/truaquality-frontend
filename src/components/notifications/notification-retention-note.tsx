import { Info } from "lucide-react"

export function NotificationRetentionNote() {
  return (
    <p className="flex items-start justify-center gap-2 font-sans text-xs text-board-muted">
      <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>Notifications older than 60 days are automatically deleted.</span>
    </p>
  )
}
