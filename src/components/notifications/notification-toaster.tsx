import * as React from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import {
  useMarkNotificationRead,
  useNotificationFeed,
} from "@/hooks/use-notifications"
import { formatClock } from "@/lib/format-time"
import { describeNotification, notificationPond } from "@/lib/notifications"
import { STATUS_STYLES } from "@/lib/status-styles"

// Beyond this many new notifications in one poll, the rest collapse into a single "N more" toast.
const MAX_TOASTS_PER_POLL = 3

const SHOW_TOAST = {
  critical: toast.error,
  warning: toast.warning,
  nominal: toast.success,
} as const

// Pops a toast for each notification that shows up in the feed while the app is open. Renders nothing itself.
export function NotificationToaster() {
  const { data } = useNotificationFeed()
  const { mutate: markRead } = useMarkNotificationRead()
  const navigate = useNavigate()
  // null until the first successful load; whatever is already in the feed then is backlog for the bell,
  // not news, so it never toasts.
  const seenIdsRef = React.useRef<Set<string> | null>(null)

  React.useEffect(() => {
    if (!data) return
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(data.notifications.map((n) => n.id))
      return
    }

    const seenIds = seenIdsRef.current
    const fresh = data.notifications.filter((n) => !seenIds.has(n.id))
    for (const notification of fresh) seenIds.add(notification.id)

    // Read already (e.g. in another tab) isn't news either.
    const unread = fresh.filter((n) => n.readAt === null)
    // The feed is newest-first; toast oldest-first so the newest ends up on top of the stack.
    for (const notification of unread.slice(0, MAX_TOASTS_PER_POLL).reverse()) {
      const { title, reading, status } = describeNotification(notification)
      const pond = notificationPond(notification)
      // DEVICE_* notifications have no recordedAt (no reading caused them) — the time we noticed stands in.
      const when = formatClock(
        Date.parse(notification.recordedAt ?? notification.createdAt)
      )
      const description = notification.recordedAt
        ? `${reading} · recorded ${when}`
        : `${reading} · ${when}`
      SHOW_TOAST[status](`${pond.name}: ${title}`, {
        id: notification.id,
        description,
        // A critical alert stays up long enough to be noticed by someone glancing back at the screen.
        duration: status === "critical" ? 20_000 : 8_000,
        classNames: { icon: STATUS_STYLES[status].value },
        action: {
          label: "View",
          onClick: () => {
            markRead(notification.id)
            navigate(`/ponds/${pond.id}`)
          },
        },
      })
    }

    const overflow = unread.length - MAX_TOASTS_PER_POLL
    if (overflow > 0) {
      toast(`${overflow} more ${overflow === 1 ? "alert" : "alerts"}`, {
        action: {
          label: "View all",
          onClick: () => navigate("/notifications"),
        },
      })
    }
  }, [data, markRead, navigate])

  return null
}
