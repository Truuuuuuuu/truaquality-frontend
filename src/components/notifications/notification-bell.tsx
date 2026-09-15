import * as React from "react"
import { Bell, CheckCheck } from "lucide-react"
import { Link } from "react-router"
import { cn } from "cn"
import { NotificationListItem } from "@/components/notifications/notification-list-item"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationFeed,
} from "@/hooks/use-notifications"
import { useNow } from "@/hooks/use-now"
import type { AppNotification } from "@/lib/api"
import { notificationStatus } from "@/lib/notifications"

type NotificationBellProps = {
  className?: string
  side?: "bottom" | "right"
  align?: "start" | "end"
}

// The badge takes the color of the worst unread alert still in the feed, so a critical one stands out from
// a pile of resolved ones; with nothing alarming unread it stays neutral.
function badgeTone(notifications: AppNotification[]) {
  const statuses = notifications
    .filter((notification) => notification.readAt === null)
    .map(notificationStatus)
  if (statuses.includes("critical")) return "bg-board-critical"
  if (statuses.includes("warning")) return "bg-board-warn"
  return "bg-board-fg"
}

export function NotificationBell({
  className,
  side = "bottom",
  align = "end",
}: NotificationBellProps) {
  const [open, setOpen] = React.useState(false)
  const { data, error } = useNotificationFeed()
  const { mutate: markRead } = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const now = useNow(30_000)

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  function handleSelect(notification: AppNotification) {
    if (notification.readAt === null) markRead(notification.id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center rounded-lg text-board-muted transition-colors outline-none hover:bg-board-panel-raised hover:text-board-fg focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-board-panel-raised data-popup-open:text-board-fg",
          className
        )}
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-heading text-[0.6rem] leading-none font-medium text-board-bg tabular-nums",
              badgeTone(notifications)
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        sideOffset={side === "right" ? 12 : 6}
        className="w-[min(24rem,calc(100vw-2rem))] gap-0 overflow-hidden bg-board-panel p-0 text-board-fg ring-board-border-strong"
      >
        <div className="board-groove flex items-center justify-between gap-3 border-b border-board-border px-4 py-3">
          <PopoverTitle className="font-sans text-sm font-semibold">
            Notifications
            {unreadCount > 0 ? (
              <span className="ml-1.5 font-heading text-xs font-normal text-board-muted">
                {unreadCount} unread
              </span>
            ) : null}
          </PopoverTitle>
          <Button
            variant="ghost"
            size="xs"
            className="-mr-1.5 text-board-muted"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck />
            Mark all read
          </Button>
        </div>

        <div className="max-h-[min(26rem,65vh)] overflow-y-auto p-1.5">
          {!data ? (
            <p className="px-3 py-6 text-center font-sans text-xs text-board-muted">
              {error
                ? `Couldn't load notifications: ${error.message}`
                : "Loading notifications…"}
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-8 text-center font-sans text-xs text-board-muted">
              No notifications yet. You'll be alerted here when a pond reading
              leaves its safe range.
            </p>
          ) : (
            notifications.map((notification) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                now={now}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>

        <div className="board-groove border-t border-board-border p-1.5">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="flex justify-center rounded-lg px-3 py-2 font-sans text-xs font-medium text-board-muted transition-colors outline-none hover:bg-board-panel-raised hover:text-board-fg focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
