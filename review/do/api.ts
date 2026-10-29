// Explicit relative imports bypass the review alias, keeping production DTO/error contracts intact.
import { ApiError } from "../../src/lib/api"
import type * as Production from "../../src/lib/api"
import fixtures from "./generated/fixtures.json"
export * from "../../src/lib/api"

const initialOffset = Date.now() - Date.parse(fixtures.generatedAt)
function rebase(value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:/.test(value)) {
    return new Date(Date.parse(value) + initialOffset).toISOString()
  }
  if (Array.isArray(value)) return value.map(rebase)
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, rebase(child)])
    )
  return value
}
// Serialized dates only are rebased once, preserving scenario age/assignment differences.
const scenarios = fixtures.scenarios.map((item) => rebase(item) as typeof item)
let scenarioId = scenarios[0]!.id
export const reviewManifest = {
  generatedAt: fixtures.generatedAt,
  scenarioIds: scenarios.map((item) => item.id),
}
export function selectReviewScenario(id: string) {
  if (!scenarios.some((s) => s.id === id))
    throw new Error("Unknown review scenario")
  scenarioId = id
}
function current() {
  return scenarios.find((s) => s.id === scenarioId)!
}
async function read<T>(value: T): Promise<T> {
  if (scenarioId === "error")
    throw new ApiError("Simulated local read failure", 503)
  if (scenarioId === "loading")
    await new Promise((resolve) => setTimeout(resolve, 8000))
  return structuredClone(value)
}
function requirePond(id: string) {
  if (id !== current().pond.id)
    throw new ApiError("Simulated pond not found", 404)
  return current()
}
function grain(params: {
  from: string
  to?: string
}): Production.SeriesResolution {
  const width =
    Date.parse(params.to ?? new Date().toISOString()) - Date.parse(params.from)
  return width <= 48 * 3600000 ? "raw" : width <= 92 * 86400000 ? "hour" : "day"
}
export const listPonds: typeof Production.listPonds = async () =>
  read({ ponds: [current().pond] as Production.Pond[] })
export const getPond: typeof Production.getPond = async (_token, id) =>
  read({ pond: requirePond(id).pond as Production.Pond })
export const listDevices: typeof Production.listDevices = async () =>
  read({ devices: [current().device] as Production.Device[] })
export const getDeviceDiagnostics: typeof Production.getDeviceDiagnostics =
  async (_token, id) => {
    if (id !== current().device.id)
      throw new ApiError("Simulated device not found", 404)
    return read(current().diagnostics as Production.DeviceDiagnostics)
  }
function filteredPoints(
  id: string,
  params: { from?: string; to?: string; parameter?: string }
) {
  return requirePond(id).points.filter(
    (p) =>
      (!params.parameter || p.parameter === params.parameter) &&
      (!params.from || Date.parse(p.t) >= Date.parse(params.from)) &&
      (!params.to || Date.parse(p.t) <= Date.parse(params.to))
  )
}
export const getPondSeries: typeof Production.getPondSeries = async (
  _token,
  id,
  params
) => read({ resolution: grain(params), points: filteredPoints(id, params) })
export const getPondAnalysis: typeof Production.getPondAnalysis = async (
  _token,
  id,
  params
) => {
  const scenario = requirePond(id)
  const result = structuredClone(
    scenario.analyses[grain(params)]
  ) as Production.PondAnalysis
  // The manifest is a frozen review window; entirely disjoint custom ranges are truly empty.
  if (!filteredPoints(id, params).length) result.parameters = {}
  return read(result)
}
export const getPondReadingsPage: typeof Production.getPondReadingsPage =
  async (_token, id, params = {}) => {
    const rows = filteredPoints(id, params)
      .map((p) => ({ parameter: p.parameter, value: p.avg, recordedAt: p.t }))
      .sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))
    const start = params.before ? Number(params.before) : 0
    const size = params.limit ?? 20
    return read({
      readings: rows.slice(start, start + size),
      nextCursor: start + size < rows.length ? String(start + size) : null,
    })
  }
export const exportPondReadings: typeof Production.exportPondReadings = async (
  _token,
  id,
  params
) => {
  const scenario = requirePond(id)
  const workbook = scenario.workbooks.find(
    (w) =>
      w.resolution === (params.resolution ?? "raw") &&
      w.parameter === (params.parameter ?? null)
  )
  if (!workbook)
    throw new ApiError(
      "Review downloads support All parameters or Dissolved oxygen",
      400
    )
  const bytes = Uint8Array.from(atob(workbook.base64), (char) =>
    char.charCodeAt(0)
  )
  return {
    blob: new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename: workbook.filename,
  }
}
export const listNotifications: typeof Production.listNotifications = async (
  _token,
  params = {}
) => {
  const notifications = current().notifications as Production.AppNotification[]
  return read({
    notifications: params.before
      ? []
      : notifications
          .filter((n) => !params.unread || !n.readAt)
          .slice(0, params.limit ?? 30),
    unreadCount: notifications.filter((n) => !n.readAt).length,
    nextCursor: null,
  })
}
export const reviewProfile: Production.Profile = {
  id: "simulated-review-profile",
  email: "review@example.invalid",
  fullName: "Simulator reviewer",
  systemRole: "STAFF",
  status: "ACTIVE",
  createdAt: fixtures.generatedAt,
}
export const getMe: typeof Production.getMe = async () => ({
  profile: reviewProfile,
})
const refuse = async (): Promise<never> => {
  throw new ApiError("This action is disabled in the isolated simulator", 403)
}
export const login: typeof Production.login = refuse
export const refreshSession: typeof Production.refreshSession = refuse
export const logoutSession: typeof Production.logoutSession = refuse
export const deleteAccount: typeof Production.deleteAccount = refuse
export const createPond: typeof Production.createPond = refuse
export const updatePond: typeof Production.updatePond = refuse
export const createDevice: typeof Production.createDevice = refuse
export const updateDevice: typeof Production.updateDevice = refuse
export const rotateDeviceSecret: typeof Production.rotateDeviceSecret = refuse
export const listUsers: typeof Production.listUsers = async () => ({
  profiles: [reviewProfile],
})
export const inviteUser: typeof Production.inviteUser = refuse
export const updateUserStatus: typeof Production.updateUserStatus = refuse
export const updateUserRole: typeof Production.updateUserRole = refuse
export const resendInvite: typeof Production.resendInvite = refuse
export const listAuditLog: typeof Production.listAuditLog = async () => ({
  entries: [],
  total: 0,
  nextCursor: null,
})
export const markNotificationRead: typeof Production.markNotificationRead =
  refuse
export const markAllNotificationsRead: typeof Production.markAllNotificationsRead =
  refuse
