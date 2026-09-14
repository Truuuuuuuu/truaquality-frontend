import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useAuth } from "@/context/auth-context"
import {
  createDevice,
  createPond,
  getPond,
  getPondReadingsPage,
  getPondSeries,
  listDevices,
  listPonds,
  rotateDeviceSecret,
  updateDevice,
  updatePond,
  type CreateDeviceInput,
  type CreatePondInput,
  type UpdateDeviceInput,
  type UpdatePondInput,
} from "@/lib/api"

// Devices report about once a minute; polling a few times per report keeps tiles current without a push channel.
const POLL_MS = 30_000
const HISTORY_WINDOW_MS = 2 * 60 * 60 * 1000

export function usePonds() {
  const { authorizedRequest } = useAuth()
  return useQuery({
    queryKey: ["ponds"],
    queryFn: () => authorizedRequest(listPonds).then((data) => data.ponds),
    refetchInterval: POLL_MS,
  })
}

export function usePond(id: string) {
  const { authorizedRequest } = useAuth()
  return useQuery({
    queryKey: ["ponds", id],
    queryFn: () =>
      authorizedRequest((token) => getPond(token, id)).then(
        (data) => data.pond
      ),
    refetchInterval: POLL_MS,
  })
}

// Tiles' 2 h trend. Goes through /series (not /readings) so it keeps working once raw rows for that window
// have aged past retention — the server falls back to hourly points itself; a 2 h window never actually
// needs to, but this is the same call a future "24 h" / "7 d" trend picker would make with a wider range.
export function usePondSeries(id: string) {
  const { authorizedRequest } = useAuth()
  return useQuery({
    queryKey: ["ponds", id, "series", HISTORY_WINDOW_MS],
    queryFn: () => {
      const from = new Date(Date.now() - HISTORY_WINDOW_MS).toISOString()
      return authorizedRequest((token) => getPondSeries(token, id, { from }))
    },
    refetchInterval: POLL_MS,
  })
}

export const READINGS_PAGE_SIZE = 20

// One page of the reading-history table, newest-first, optionally narrowed to one parameter and/or a
// date/time range. Pass the `nextCursor` from the current page as `before` to view the next-older page;
// omit it to view the newest page. Only the newest, unfiltered-by-range page polls — a page a user paged
// back to, or a fixed `to` in the past, is a snapshot that shouldn't shift under them.
export function usePondReadingsPage(
  id: string,
  {
    before,
    parameter,
    from,
    to,
  }: { before?: string; parameter?: string; from?: string; to?: string } = {}
) {
  const { authorizedRequest } = useAuth()
  return useQuery({
    queryKey: [
      "ponds",
      id,
      "readings",
      parameter ?? "all",
      from ?? "-",
      to ?? "-",
      before ?? "latest",
    ],
    queryFn: () =>
      authorizedRequest((token) =>
        getPondReadingsPage(token, id, {
          parameter,
          before,
          from,
          to,
          limit: READINGS_PAGE_SIZE,
        })
      ),
    refetchInterval: before || to ? false : POLL_MS,
    placeholderData: keepPreviousData,
  })
}

export function useDevices() {
  const { authorizedRequest } = useAuth()
  return useQuery({
    queryKey: ["devices"],
    queryFn: () => authorizedRequest(listDevices).then((data) => data.devices),
    refetchInterval: POLL_MS,
  })
}

// Pond and device lists embed each other (a pond shows its device, a device its pond), so any
// admin change refreshes both.
function useInvalidateRegistry() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ponds"] }),
      queryClient.invalidateQueries({ queryKey: ["devices"] }),
    ])
}

export function useCreatePond() {
  const { authorizedRequest } = useAuth()
  const invalidate = useInvalidateRegistry()
  return useMutation({
    mutationFn: (input: CreatePondInput) =>
      authorizedRequest((token) => createPond(token, input)),
    onSuccess: invalidate,
  })
}

export function useUpdatePond() {
  const { authorizedRequest } = useAuth()
  const invalidate = useInvalidateRegistry()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdatePondInput & { id: string }) =>
      authorizedRequest((token) => updatePond(token, id, input)),
    onSuccess: invalidate,
  })
}

export function useCreateDevice() {
  const { authorizedRequest } = useAuth()
  const invalidate = useInvalidateRegistry()
  return useMutation({
    mutationFn: (input: CreateDeviceInput) =>
      authorizedRequest((token) => createDevice(token, input)),
    onSuccess: invalidate,
  })
}

export function useUpdateDevice() {
  const { authorizedRequest } = useAuth()
  const invalidate = useInvalidateRegistry()
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateDeviceInput & { id: string }) =>
      authorizedRequest((token) => updateDevice(token, id, input)),
    onSuccess: invalidate,
  })
}

export function useRotateDeviceSecret() {
  const { authorizedRequest } = useAuth()
  const invalidate = useInvalidateRegistry()
  return useMutation({
    mutationFn: (id: string) =>
      authorizedRequest((token) => rotateDeviceSecret(token, id)),
    onSuccess: invalidate,
  })
}
