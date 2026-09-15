import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/auth-context"
import {
  inviteUser,
  listUsers,
  resendInvite,
  updateUserStatus,
  type InviteUserInput,
} from "@/lib/api"

// Admins don't need second-by-second freshness here, but polling keeps another admin's invite or
// status change visible without a manual refresh.
const POLL_MS = 30_000

// Only admins can call this endpoint; `enabled` lets the Users page skip the request entirely for
// a non-admin about to be redirected, rather than firing a call that's known to 403.
export function useUsers({ enabled = true }: { enabled?: boolean } = {}) {
  const { authorizedRequest } = useAuth()
  return useQuery({
    queryKey: ["users"],
    queryFn: () => authorizedRequest(listUsers).then((data) => data.profiles),
    refetchInterval: POLL_MS,
    enabled,
  })
}

function useInvalidateUsers() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ["users"] })
}

export function useInviteUser() {
  const { authorizedRequest } = useAuth()
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: (input: InviteUserInput) =>
      authorizedRequest((token) => inviteUser(token, input)),
    onSuccess: invalidate,
  })
}

export function useUpdateUserStatus() {
  const { authorizedRequest } = useAuth()
  const invalidate = useInvalidateUsers()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: "ACTIVE" | "DISABLED"
    }) => authorizedRequest((token) => updateUserStatus(token, id, status)),
    onSuccess: invalidate,
  })
}

export function useResendInvite() {
  const { authorizedRequest } = useAuth()
  return useMutation({
    mutationFn: (id: string) =>
      authorizedRequest((token) => resendInvite(token, id)),
  })
}
