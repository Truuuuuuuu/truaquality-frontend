import { Link } from "react-router"
import { cn } from "cn"
import type { AppNotification } from "@/lib/api"
import { formatRelative } from "@/lib/format-time"
import { describeNotification, notificationPond } from "@/lib/notifications"
import { STATUS_STYLES } from "@/lib/status-styles"

type NotificationListItemProps = {
  notification: AppNotification
  now: number
  // Called when the row is followed to its pond, before navigation — marks it read, closes a popover, etc.
  onSelect?: (notification: AppNotification) => void
  className?: string
}

export function NotificationListItem({
  notification,
  now,
  onSelect,
  className,
}: NotificationListItemProps) {
  const { title, reading, status } = describeNotification(notification)
  const styles = STATUS_STYLES[status]
  const isUnread = notification.readAt === null
  const pond = notificationPond(notification)
  // DEVICE_* notifications have no reading, so there's no recordedAt to show — the time we noticed is the
  // next best thing.
  const timestamp = notification.recordedAt ?? notification.createdAt
  const recordedAt = Date.parse(timestamp)

  return (
    <Link
      to={`/ponds/${pond.id}`}
      onClick={() => onSelect?.(notification)}
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors outline-none hover:bg-board-panel-raised focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          styles.led,
          !isUnread && "opacity-40"
        )}
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              "truncate font-sans text-sm",
              isUnread
                ? "font-semibold text-board-fg"
                : "font-medium text-board-muted"
            )}
          >
            {isUnread ? <span className="sr-only">Unread: </span> : null}
            {title}
          </span>
          <time
            dateTime={timestamp}
            title={new Date(recordedAt).toLocaleString()}
            className="shrink-0 font-heading text-[0.65rem] text-board-muted"
          >
            {formatRelative(recordedAt, now)}
          </time>
        </span>
        <span className="flex min-w-0 items-baseline gap-1.5 font-sans text-xs text-board-muted">
          <span className="truncate">{pond.name}</span>
          <span aria-hidden="true">·</span>
          <span
            className={cn(
              "shrink-0 font-heading tabular-nums",
              isUnread ? styles.value : undefined
            )}
          >
            {reading}
          </span>
        </span>
      </span>
    </Link>
  )
}
