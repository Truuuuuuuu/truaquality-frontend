import type { Threshold } from "@/lib/parameters"

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
  return err instanceof ApiError
    ? err.message
    : "Something went wrong. Please try again."
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string
}

async function request<T>(
  path: string,
  { method = "GET", body, token }: RequestOptions = {}
): Promise<T> {
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
    const message =
      (data as { error?: string } | undefined)?.error ?? res.statusText
    throw new ApiError(
      message,
      res.status,
      (data as { details?: unknown } | undefined)?.details
    )
  }

  return data as T
}

export type Profile = {
  id: string
  email: string
  fullName: string
  systemRole: "ADMIN" | "USER"
  status: "INVITED" | "ACTIVE" | "DISABLED"
  createdAt: string
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
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  })
}

export function refreshSession(refreshToken: string) {
  return request<LoginResponse>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  })
}

export function logoutSession(token: string) {
  return request<void>("/auth/logout", { method: "POST", token })
}

export function getMe(token: string) {
  return request<{ profile: Profile }>("/me", { token })
}

export function deleteAccount(token: string, password: string) {
  return request<void>("/me", {
    method: "DELETE",
    body: { password },
    token,
  })
}

export type PondStatus = "ACTIVE" | "ARCHIVED"
export type PondType = "FRESHWATER" | "BRACKISH" | "SALTWATER"
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

export type Device = DeviceSummary & {
  pond: { id: string; name: string } | null
}

export type Pond = {
  id: string
  name: string
  notes: string | null
  // Both optional: a pond can be registered before its stocking is decided, and filled in later.
  fishSpecies: string | null
  pondType: PondType | null
  status: PondStatus
  createdAt: string
  updatedAt: string
  device: DeviceSummary | null
  // Keyed by parameter id; a parameter the pond has never reported is absent.
  latest: Record<string, LatestReading>
  // The safe/critical band for each parameter, already resolved for this pond's type by the server —
  // the same numbers its alerts are raised from, so the board can't disagree with a notification.
  thresholds: Record<string, Threshold>
}

export type ApiReading = {
  parameter: string
  value: number
  recordedAt: string
}

// avg === min === max at "raw" resolution (one reading per point); "hour"/"day" are true aggregates.
export type SeriesResolution = "raw" | "hour" | "day"
export type SeriesPoint = {
  parameter: string
  t: string
  avg: number
  min: number
  max: number
}

export function listPonds(token: string) {
  return request<{ ponds: Pond[] }>("/ponds", { token })
}

export function getPond(token: string, id: string) {
  return request<{ pond: Pond }>(`/ponds/${id}`, { token })
}

// Newest-first page of raw readings. Pass a previous response's `nextCursor` as `before` for the next page;
// `nextCursor` is null once there's nothing older left in the retention window. `from`/`to` narrow the scan
// to a date/time range.
export function getPondReadingsPage(
  token: string,
  id: string,
  params: {
    parameter?: string
    before?: string
    from?: string
    to?: string
    limit?: number
  } = {}
) {
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(
        (entry): entry is [string, string | number] => entry[1] !== undefined
      )
      .map(([key, value]) => [key, String(value)])
  )
  return request<{ readings: ApiReading[]; nextCursor: string | null }>(
    `/ponds/${id}/readings?${query}`,
    { token }
  )
}

// A chart-ready series over an arbitrary range; the server picks raw/hourly/daily resolution based on how
// wide `from`..`to` is.
export function getPondSeries(
  token: string,
  id: string,
  params: { from: string; to?: string; parameter?: string }
) {
  const query = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  )
  return request<{ resolution: SeriesResolution; points: SeriesPoint[] }>(
    `/ponds/${id}/series?${query}`,
    { token }
  )
}

// Downloads an .xlsx workbook of a pond's readings for the given range. Returns the blob and the filename
// the server suggested, so the caller can save it — unlike a plain link, this needs the Authorization
// header attached.
export async function exportPondReadings(
  token: string,
  id: string,
  params: {
    from: string
    to?: string
    parameter?: string
    resolution?: "raw" | "hour"
  }
) {
  const query = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  )
  const res = await fetch(`${API_URL}/ponds/${id}/readings/export?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const data = res.headers.get("content-type")?.includes("application/json")
      ? await res.json()
      : undefined
    throw new ApiError(
      (data as { error?: string } | undefined)?.error ?? res.statusText,
      res.status
    )
  }
  const disposition = res.headers.get("content-disposition") ?? ""
  const filename =
    /filename="([^"]+)"/.exec(disposition)?.[1] ?? `pond-${id}-readings.xlsx`
  return { blob: await res.blob(), filename }
}

export function listDevices(token: string) {
  return request<{ devices: Device[] }>("/devices", { token })
}

export type CreatePondInput = {
  name: string
  notes?: string
  fishSpecies?: string
  pondType?: PondType
}
export type UpdatePondInput = {
  name?: string
  notes?: string | null
  fishSpecies?: string | null
  pondType?: PondType | null
  status?: PondStatus
}

export function createPond(token: string, body: CreatePondInput) {
  return request<{ pond: Omit<Pond, "device" | "latest" | "thresholds"> }>(
    "/admin/ponds",
    {
      method: "POST",
      body,
      token,
    }
  )
}

export function updatePond(token: string, id: string, body: UpdatePondInput) {
  return request<{ pond: Omit<Pond, "device" | "latest" | "thresholds"> }>(
    `/admin/ponds/${id}`,
    { method: "PATCH", body, token }
  )
}

export type CreateDeviceInput = {
  serial: string
  hardwareModel?: string
  label?: string
  pondId?: string
}
export type UpdateDeviceInput = {
  hardwareModel?: string | null
  label?: string | null
  status?: DeviceStatus
  pondId?: string | null
}

// What a technician enters on the unit's setup portal (see DeviceCredentialsNotice). The backend only returns
// it here and from rotateDeviceSecret.
export type DeviceCredentials = {
  deviceId: string
  deviceSecret: string
  topic: string
}

export function createDevice(token: string, body: CreateDeviceInput) {
  return request<{ device: Device; credentials: DeviceCredentials }>(
    "/admin/devices",
    { method: "POST", body, token }
  )
}

export function updateDevice(
  token: string,
  id: string,
  body: UpdateDeviceInput
) {
  return request<{ device: Device }>(`/admin/devices/${id}`, {
    method: "PATCH",
    body,
    token,
  })
}

export function rotateDeviceSecret(token: string, id: string) {
  return request<{ device: Device; credentials: DeviceCredentials }>(
    `/admin/devices/${id}/rotate-secret`,
    {
      method: "POST",
      token,
    }
  )
}

export function listUsers(token: string) {
  return request<{ profiles: Profile[] }>("/admin/users", { token })
}

export type InviteUserInput = {
  email: string
  fullName: string
  systemRole: "ADMIN" | "USER"
}

export function inviteUser(token: string, body: InviteUserInput) {
  return request<{ profile: Profile }>("/admin/users", {
    method: "POST",
    body,
    token,
  })
}

export function updateUserStatus(
  token: string,
  id: string,
  status: "ACTIVE" | "DISABLED"
) {
  return request<{ profile: Profile }>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: { status },
    token,
  })
}

export function resendInvite(token: string, id: string) {
  return request<{ ok: true }>(`/admin/users/${id}/resend-invite`, {
    method: "POST",
    token,
  })
}

// One recorded admin action. `actor` is null when the profile that performed it is gone — the row
// deliberately outlives it, so the raw `actorId` is still there. `action` and `targetType` are open
// strings because the log holds history, including actions the code no longer has (`office.create`).
export type AuditEntry = {
  id: string
  action: string
  targetType: string
  targetId: string
  metadata: Record<string, unknown> | null
  createdAt: string
  actorId: string | null
  actor: { id: string; fullName: string; email: string } | null
}

export type AuditPage = {
  entries: AuditEntry[]
  nextCursor: string | null
  // Everything the filters match, not just what's left after this page — lets the page show
  // "12–22 of 33" and a real Previous/Next pager instead of an unbounded "load more" feed.
  total: number
}

export type AuditFilters = {
  action?: string
  targetType?: string
  actorId?: string
  from?: string
  to?: string
}

// Newest-first page of the audit trail. Pass a previous response's `nextCursor` as `before` for the
// next page.
export function listAuditLog(
  token: string,
  params: AuditFilters & { before?: string; limit?: number } = {}
) {
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(
        (entry): entry is [string, string | number] => entry[1] !== undefined
      )
      .map(([key, value]) => [key, String(value)])
  )
  return request<AuditPage>(`/admin/audit?${query}`, { token })
}

export type AlertSeverity = "WARNING" | "CRITICAL"
export type NotificationKind =
  | "ALERT_OPENED"
  | "ALERT_ESCALATED"
  | "ALERT_RESOLVED"
  | "DEVICE_OFFLINE"
  | "DEVICE_ONLINE"

// One event for either an out-of-range episode for a pond's parameter (ALERT_*) or a device that went
// offline/came back (DEVICE_*). Exactly one of `alert`/`device` is set, matching which kind this is; value
// and recordedAt are the reading that caused an ALERT_* event and are null for a DEVICE_* one, which has no
// reading to attach.
export type AppNotification = {
  id: string
  kind: NotificationKind
  severity: AlertSeverity
  value: number | null
  recordedAt: string | null
  readAt: string | null
  createdAt: string
  // Whether the reading sat below or above its safe range. Decided by the server, which is the only
  // side that knows the pond's thresholds. Null for a DEVICE_* event.
  direction: "low" | "high" | null
  alert: {
    id: string
    parameter: string
    resolvedAt: string | null
    pond: { id: string; name: string; pondType: PondType | null }
  } | null
  device: {
    id: string
    label: string | null
    serial: string
    pond: { id: string; name: string }
  } | null
}

export type NotificationsPage = {
  notifications: AppNotification[]
  // The caller's unread total across all notifications, not just this page.
  unreadCount: number
  nextCursor: string | null
}

// Newest-first page of the signed-in user's notifications. Pass a previous response's `nextCursor` as
// `before` for the next page.
export function listNotifications(
  token: string,
  params: { before?: string; limit?: number; unread?: boolean } = {}
) {
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(
        (entry): entry is [string, string | number | boolean] =>
          entry[1] !== undefined
      )
      .map(([key, value]) => [key, String(value)])
  )
  return request<NotificationsPage>(`/notifications?${query}`, { token })
}

export function markNotificationRead(token: string, id: string) {
  return request<{ ok: true }>(`/notifications/${id}/read`, {
    method: "POST",
    token,
  })
}

export function markAllNotificationsRead(token: string) {
  return request<{ updated: number }>("/notifications/read-all", {
    method: "POST",
    token,
  })
}
