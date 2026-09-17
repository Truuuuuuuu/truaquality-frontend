import * as React from "react"
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
import {
  DEFAULT_HISTORY_RANGE,
  HISTORY_RANGE_PRESETS,
  historyRangeKey,
  resolveHistoryRange,
  type HistoryRangeValue,
} from "@/lib/history-range"
import type { ReadingPoint } from "@/lib/parameters"

// Devices report about once a minute; polling a few times per report keeps tiles current without a push channel.
const POLL_MS = 30_000
export const HISTORY_WINDOW_MS = HISTORY_RANGE_PRESETS[0].windowMs

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

// A chart-ready series over a history range. `from`/`to` are resolved off `Date.now()` inside `queryFn`
// rather than passed in already-resolved, so a rolling range's query key stays stable across polls instead
// of changing (and refetching) on every tick.
export function usePondSeriesRange(id: string, range: HistoryRangeValue) {
  const { authorizedRequest } = useAuth()
  return useQuery({
    queryKey: ["ponds", id, "series", historyRangeKey(range)],
    queryFn: () => {
      const { from, to } = resolveHistoryRange(range, Date.now())
      return authorizedRequest((token) =>
        getPondSeries(token, id, { from, to })
      )
    },
    refetchInterval: range.kind === "rolling" ? POLL_MS : false,
  })
}

// Tiles' 2 h trend, and the default for the pond detail page's history range picker. Goes through /series
// (not /readings) so it keeps working once raw rows for that window have aged past retention — the server
// falls back to hourly points itself.
export function usePondSeries(id: string) {
  return usePondSeriesRange(id, DEFAULT_HISTORY_RANGE)
}

function seriesPointsToHistoryMap(
  points: { parameter: string; t: string; avg: number }[]
): Map<string, ReadingPoint[]> {
  const byParameter = new Map<string, ReadingPoint[]>()
  for (const point of points) {
    const history = byParameter.get(point.parameter) ?? []
    history.push({ t: Date.parse(point.t), v: point.avg })
    byParameter.set(point.parameter, history)
  }
  return byParameter
}

// A pond's history, keyed by parameter id — the shared shape both the per-parameter tile grid and any
// combined trend chart plot from, so callers never build it two different ways.
export function usePondHistoryRange(id: string, range: HistoryRangeValue) {
  const { data: series } = usePondSeriesRange(id, range)
  return React.useMemo(
    () => seriesPointsToHistoryMap(series?.points ?? []),
    [series]
  )
}

export function usePondHistory(id: string) {
  return usePondHistoryRange(id, DEFAULT_HISTORY_RANGE)
}

export const READINGS_PAGE_SIZE = 20

// One page of the reading-history table, newest-first, optionally narrowed to one parameter and always
// scoped to a history range. Pass the `nextCursor` from the current page as `before` to view the next-older
// page; omit it to view the newest page. Only the newest page of a rolling range polls — a page a user paged
// back to, or a fixed range in the past, is a snapshot that shouldn't shift under them. `from`/`to` are
// resolved off `Date.now()` inside `queryFn` for the same reason as `usePondSeriesRange`.
export function usePondReadingsPage(
  id: string,
  {
    before,
    parameter,
    range,
  }: {
    before?: string
    parameter?: string
    range: HistoryRangeValue
  }
) {
  const { authorizedRequest } = useAuth()
  return useQuery({
    queryKey: [
      "ponds",
      id,
      "readings",
      parameter ?? "all",
      historyRangeKey(range),
      before ?? "latest",
    ],
    queryFn: () => {
      const { from, to } = resolveHistoryRange(range, Date.now())
      return authorizedRequest((token) =>
        getPondReadingsPage(token, id, {
          parameter,
          before,
          from,
          to,
          limit: READINGS_PAGE_SIZE,
        })
      )
    },
    refetchInterval: before || range.kind === "fixed" ? false : POLL_MS,
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
