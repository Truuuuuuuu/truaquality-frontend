const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

export function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again."
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string
}

async function request<T>(path: string, { method = "GET", body, token }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get("content-type")?.includes("application/json")
  const data = isJson ? await res.json() : undefined

  if (!res.ok) {
    const message = (data as { error?: string } | undefined)?.error ?? res.statusText
    throw new ApiError(message, res.status, (data as { details?: unknown } | undefined)?.details)
  }

  return data as T
}

export type Profile = {
  id: string
  email: string
  fullName: string
  systemRole: "ADMIN" | "USER"
  status: "INVITED" | "ACTIVE" | "DISABLED"
}

type LoginResponse = {
  user: unknown
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
}

export function login(email: string, password: string) {
  return request<LoginResponse>("/auth/login", { method: "POST", body: { email, password } })
}

export function refreshSession(refreshToken: string) {
  return request<LoginResponse>("/auth/refresh", { method: "POST", body: { refreshToken } })
}

export function logoutSession(token: string) {
  return request<void>("/auth/logout", { method: "POST", token })
}

export function getMe(token: string) {
  return request<{ profile: Profile }>("/me", { token })
}

export type PondStatus = "ACTIVE" | "ARCHIVED"
export type DeviceStatus = "ACTIVE" | "DISABLED"

export type LatestReading = { value: number; recordedAt: string }

export type DeviceSummary = {
  id: string
  serial: string
  hardwareModel: string | null
  label: string | null
  // Bumped each time the device's secret is rotated.
  secretVersion: number
  status: DeviceStatus
  pondId: string | null
  assignedAt: string | null
  firmwareVersion: string | null
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export type Device = DeviceSummary & { pond: { id: string; name: string } | null }

export type Pond = {
  id: string
  name: string
  notes: string | null
  status: PondStatus
  createdAt: string
  updatedAt: string
  device: DeviceSummary | null
  // Keyed by parameter id; a parameter the pond has never reported is absent.
  latest: Record<string, LatestReading>
}

export type ApiReading = { parameter: string; value: number; recordedAt: string }

export function listPonds(token: string) {
  return request<{ ponds: Pond[] }>("/ponds", { token })
}

export function getPond(token: string, id: string) {
  return request<{ pond: Pond }>(`/ponds/${id}`, { token })
}

export function getPondReadings(token: string, id: string, params: { from?: string; to?: string; parameter?: string } = {}) {
  const query = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined))
  return request<{ from: string; to: string; readings: ApiReading[] }>(`/ponds/${id}/readings?${query}`, { token })
}

export function listDevices(token: string) {
  return request<{ devices: Device[] }>("/devices", { token })
}

export type CreatePondInput = { name: string; notes?: string }
export type UpdatePondInput = { name?: string; notes?: string | null; status?: PondStatus }

export function createPond(token: string, body: CreatePondInput) {
  return request<{ pond: Omit<Pond, "device" | "latest"> }>("/admin/ponds", { method: "POST", body, token })
}

export function updatePond(token: string, id: string, body: UpdatePondInput) {
  return request<{ pond: Omit<Pond, "device" | "latest"> }>(`/admin/ponds/${id}`, { method: "PATCH", body, token })
}

export type CreateDeviceInput = { serial: string; hardwareModel?: string; label?: string; pondId?: string }
export type UpdateDeviceInput = {
  hardwareModel?: string | null
  label?: string | null
  status?: DeviceStatus
  pondId?: string | null
}

// What gets flashed into a unit's unit_config.h. The backend only returns it here and from rotateDeviceSecret.
export type DeviceCredentials = { deviceId: string; deviceSecret: string; topic: string }

export function createDevice(token: string, body: CreateDeviceInput) {
  return request<{ device: Device; credentials: DeviceCredentials }>("/admin/devices", { method: "POST", body, token })
}

export function updateDevice(token: string, id: string, body: UpdateDeviceInput) {
  return request<{ device: Device }>(`/admin/devices/${id}`, { method: "PATCH", body, token })
}

export function rotateDeviceSecret(token: string, id: string) {
  return request<{ device: Device; credentials: DeviceCredentials }>(`/admin/devices/${id}/rotate-secret`, {
    method: "POST",
    token,
  })
}
