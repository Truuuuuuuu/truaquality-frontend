import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useAuth } from "@/context/auth-context"
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api"

// Faster than the pond/device poll: this is how a new alert reaches someone, and the request is small.
const POLL_MS = 15_000
const FEED_SIZE = 20
const PAGE_SIZE = 30

// The newest notifications plus the unread total. One polled query drives the bell badge, its dropdown, and
// the toasts for newly arrived alerts, so they never disagree with each other.
export function useNotificationFeed() {
  const { authorizedRequest } = useAuth()
  return useQuery({
    queryKey: ["notifications", "feed"],
    queryFn: () =>
      authorizedRequest((token) =>
        listNotifications(token, { limit: FEED_SIZE })
      ),
    refetchInterval: POLL_MS,
  })
}

// The full, "load more"-paginated list on the Notifications page.
export function useNotificationsPage({ unread }: { unread: boolean }) {
  const { authorizedRequest } = useAuth()
  return useInfiniteQuery({
    queryKey: ["notifications", "page", unread ? "unread" : "all"],
    queryFn: ({ pageParam }) =>
      authorizedRequest((token) =>
        listNotifications(token, {
          before: pageParam,
          limit: PAGE_SIZE,
          unread,
        })
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: POLL_MS,
  })
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
}

export function useMarkNotificationRead() {
  const { authorizedRequest } = useAuth()
  const invalidate = useInvalidateNotifications()
  return useMutation({
    mutationFn: (id: string) =>
      authorizedRequest((token) => markNotificationRead(token, id)),
    onSuccess: invalidate,
  })
}

export function useMarkAllNotificationsRead() {
  const { authorizedRequest } = useAuth()
  const invalidate = useInvalidateNotifications()
  return useMutation({
    mutationFn: () => authorizedRequest(markAllNotificationsRead),
    onSuccess: invalidate,
  })
}
