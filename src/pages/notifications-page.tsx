import * as React from "react"
import { AlertTriangle, BellOff, CheckCheck } from "lucide-react"
import { cn } from "cn"
import { BoardEmptyState } from "@/components/board-empty-state"
import { NotificationListItem } from "@/components/notifications/notification-list-item"
import { Button } from "@/components/ui/button"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsPage,
} from "@/hooks/use-notifications"
import { useNow } from "@/hooks/use-now"
import type { AppNotification } from "@/lib/api"

const FILTERS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
] as const

type Filter = (typeof FILTERS)[number]["value"]

export function NotificationsPage() {
  const [filter, setFilter] = React.useState<Filter>("all")
  const now = useNow(30_000)
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotificationsPage({ unread: filter === "unread" })
  const { mutate: markRead } = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data?.pages.flatMap((page) => page.notifications) ?? []
  const unreadCount = data?.pages[0]?.unreadCount ?? 0

  function handleSelect(notification: AppNotification) {
    if (notification.readAt === null) markRead(notification.id)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
            Notifications
          </h1>
          <p className="font-sans text-xs text-board-muted">
            Raised when a pond reading leaves its safe range or a device goes
            offline, and again when it recovers
            {data ? ` · ${unreadCount} unread` : null}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={unreadCount === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheck />
          Mark all as read
        </Button>
      </div>

      <div
        role="group"
        aria-label="Filter notifications"
        className="flex gap-1 self-start rounded-lg border border-board-border bg-board-panel p-0.5"
      >
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "rounded-md px-3 py-1 font-sans text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              filter === option.value
                ? "bg-board-fg text-board-bg"
                : "text-board-muted hover:text-board-fg"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!data ? (
        error ? (
          <BoardEmptyState icon={AlertTriangle} tone="error">
            Couldn't load notifications: {error.message}
          </BoardEmptyState>
        ) : (
          <p className="font-sans text-sm text-board-muted">
            Loading notifications…
          </p>
        )
      ) : notifications.length === 0 ? (
        <BoardEmptyState icon={BellOff}>
          {filter === "unread"
            ? "You're all caught up — no unread notifications."
            : "No notifications yet. You'll be alerted here when a pond reading leaves its safe range, or a device goes offline."}
        </BoardEmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="-mx-3 flex flex-col divide-y divide-board-border">
            {notifications.map((notification) => (
              <li key={notification.id} className="py-1">
                <NotificationListItem
                  notification={notification}
                  now={now}
                  onSelect={handleSelect}
                />
              </li>
            ))}
          </ul>
          {hasNextPage ? (
            <Button
              variant="outline"
              size="sm"
              className="self-center"
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? "Loading…" : "Load older notifications"}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}
