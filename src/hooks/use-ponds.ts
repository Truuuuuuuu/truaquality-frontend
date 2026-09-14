import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/auth-context"
import {
  createDevice,
  createPond,
  getPond,
  getPondReadings,
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

export function usePondReadings(id: string) {
  const { authorizedRequest } = useAuth()
  return useQuery({
    queryKey: ["ponds", id, "readings"],
    queryFn: () => {
      const from = new Date(Date.now() - HISTORY_WINDOW_MS).toISOString()
      return authorizedRequest((token) =>
        getPondReadings(token, id, { from })
      ).then((data) => data.readings)
    },
    refetchInterval: POLL_MS,
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
