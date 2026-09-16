import * as React from "react"
import { AlertTriangle, Cpu, Plus, SearchX } from "lucide-react"
import { Link } from "react-router"
import { cn } from "cn"
import { BoardEmptyState } from "@/components/board-empty-state"
import { RegistryToolbar } from "@/components/registry-toolbar"
import { ManageDeviceDialog } from "@/components/devices/manage-device-dialog"
import { RegisterDeviceDialog } from "@/components/devices/register-device-dialog"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/context/auth-context"
import { useDevices } from "@/hooks/use-ponds"
import { useNow } from "@/hooks/use-now"
import type { Device } from "@/lib/api"
import { formatRelative } from "@/lib/format-time"
import { isDeviceOnline } from "@/lib/pond-status"
import { STATUS_STYLES } from "@/lib/status-styles"

// A unit is exactly one of these: disabled beats reachability, because a disabled unit's silence
// is a decision rather than a fault.
type DeviceState = "ONLINE" | "OFFLINE" | "DISABLED"
type StateFilter = "ALL" | DeviceState
type AssignmentFilter = "ALL" | "ASSIGNED" | "UNASSIGNED"

const ASSIGNMENT_OPTIONS = [
  { value: "ALL", label: "All devices" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "UNASSIGNED", label: "Unassigned" },
] as const satisfies readonly { value: AssignmentFilter; label: string }[]

function deviceState(device: Device, now: number): DeviceState {
  if (device.status === "DISABLED") return "DISABLED"
  return isDeviceOnline(device.lastSeenAt, now) ? "ONLINE" : "OFFLINE"
}

function matchesSearch(device: Device, query: string) {
  return [
    device.serial,
    device.label,
    device.hardwareModel,
    device.pond?.name,
  ].some((field) => field?.toLowerCase().includes(query))
}

export function DevicesPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.systemRole === "ADMIN"
  const { data: devices, error } = useDevices()
  const now = useNow()

  const [registerOpen, setRegisterOpen] = React.useState(false)
  const [manageOpen, setManageOpen] = React.useState(false)
  // Kept after the dialog closes so its content doesn't vanish mid exit animation.
  const [managedDevice, setManagedDevice] = React.useState<Device | null>(null)

  const [search, setSearch] = React.useState("")
  const [state, setState] = React.useState<StateFilter>("ALL")
  const [assignment, setAssignment] = React.useState<AssignmentFilter>("ALL")

  function clearFilters() {
    setSearch("")
    setState("ALL")
    setAssignment("ALL")
  }

  const all = devices ?? []
  const query = search.trim().toLowerCase()
  // Counts sit on the state chips, so they're taken before the state filter but after the other
  // two — clicking a chip then shows exactly the number it advertised.
  const narrowed = all.filter(
    (device) =>
      (query === "" || matchesSearch(device, query)) &&
      (assignment === "ALL" ||
        (assignment === "ASSIGNED") === (device.pond !== null))
  )
  const countOf = (match: DeviceState) =>
    narrowed.filter((device) => deviceState(device, now) === match).length
  const stateOptions = [
    { value: "ALL", label: "All", count: narrowed.length },
    { value: "ONLINE", label: "Online", count: countOf("ONLINE") },
    { value: "OFFLINE", label: "Offline", count: countOf("OFFLINE") },
    { value: "DISABLED", label: "Disabled", count: countOf("DISABLED") },
  ] as const satisfies readonly {
    value: StateFilter
    label: string
    count: number
  }[]
  const rows = narrowed.filter(
    (device) => state === "ALL" || deviceState(device, now) === state
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
            Devices
          </h1>
          <p className="font-sans text-xs text-board-muted">
            Monitoring device registry for BFAR Sorsogon
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setRegisterOpen(true)}>
            <Plus />
            Register device
          </Button>
        ) : null}
      </div>

      {!devices ? (
        error ? (
          <BoardEmptyState icon={AlertTriangle} tone="error">
            Couldn't load devices: {error.message}
          </BoardEmptyState>
        ) : (
          <p className="font-sans text-sm text-board-muted">Loading devices…</p>
        )
      ) : devices.length === 0 ? (
        <BoardEmptyState icon={Cpu}>
          {isAdmin
            ? "No devices registered yet. Register a sensor unit to get its device key."
            : "No devices registered yet. An administrator needs to add them."}
        </BoardEmptyState>
      ) : (
        <>
          <RegistryToolbar
            search={search}
            onSearchChange={setSearch}
            searchLabel="Find by serial, label, or pond"
            chips={{
              label: "Filter by status",
              value: state,
              onChange: setState,
              options: stateOptions,
            }}
            select={{
              label: "Filter by pond assignment",
              value: assignment,
              onChange: setAssignment,
              options: ASSIGNMENT_OPTIONS,
            }}
          />

          {rows.length === 0 ? (
            <BoardEmptyState
              icon={SearchX}
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            >
              No devices match these filters. Clear them to see the full
              registry.
            </BoardEmptyState>
          ) : (
            <>
              {/* Registry table: sm and up, where a fixed-width grid of columns fits without cramping.
              Flat, not a card — row hairlines (from TableRow/TableHeader) carry the structure. */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Device</TableHead>
                      <TableHead>Pond</TableHead>
                      <TableHead>Last seen</TableHead>
                      <TableHead>Firmware</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin ? (
                        <TableHead>
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((device) => {
                      const online = isDeviceOnline(device.lastSeenAt, now)
                      return (
                        <TableRow key={device.id}>
                          <TableCell>
                            <p className="font-heading text-xs text-board-fg">
                              {device.serial}
                            </p>
                            <p className="text-xs text-board-muted">
                              {[device.label, device.hardwareModel]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                          </TableCell>
                          <TableCell>
                            {device.pond ? (
                              <Link
                                to={`/ponds/${device.pond.id}`}
                                className="text-board-fg underline-offset-4 hover:underline"
                              >
                                {device.pond.name}
                              </Link>
                            ) : (
                              <span className="text-board-muted">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 font-heading text-xs",
                                online ? "text-board-fg" : "text-board-stale"
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  online
                                    ? "bg-board-accent"
                                    : "bg-board-stale/50"
                                )}
                                aria-hidden="true"
                              />
                              {device.lastSeenAt
                                ? formatRelative(
                                    Date.parse(device.lastSeenAt),
                                    now
                                  )
                                : "Never"}
                              <span className="sr-only">
                                {online ? "(online)" : "(offline)"}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="font-heading text-xs text-board-muted">
                            {device.firmwareVersion ?? "—"}
                          </TableCell>
                          <TableCell>
                            {device.status === "DISABLED" ? (
                              <StatusBadge status="critical">
                                Disabled
                              </StatusBadge>
                            ) : (
                              <StatusBadge
                                status={online ? "nominal" : "stale"}
                              >
                                {online ? "Online" : "Offline"}
                              </StatusBadge>
                            )}
                          </TableCell>
                          {isAdmin ? (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setManagedDevice(device)
                                  setManageOpen(true)
                                }}
                              >
                                Manage
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Registry cards: below sm, where the table's fixed columns force cramped, truncated cells. */}
              <div className="flex flex-col gap-3 sm:hidden">
                {rows.map((device) => {
                  const online = isDeviceOnline(device.lastSeenAt, now)
                  const cardStatus =
                    device.status === "DISABLED"
                      ? "critical"
                      : online
                        ? "nominal"
                        : "stale"
                  return (
                    <div
                      key={device.id}
                      className={cn(
                        "board-groove overflow-hidden rounded-xl border transition-colors duration-500",
                        STATUS_STYLES[cardStatus].tile
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="truncate font-heading text-sm font-semibold text-board-fg">
                            {device.serial}
                          </span>
                          <span className="truncate font-sans text-xs text-board-muted">
                            {[device.label, device.hardwareModel]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                        </div>
                        {isAdmin ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-mt-1 -mr-2 shrink-0"
                            onClick={() => {
                              setManagedDevice(device)
                              setManageOpen(true)
                            }}
                          >
                            Manage
                          </Button>
                        ) : null}
                      </div>

                      <div className="board-groove flex items-center justify-between gap-3 px-4 py-3">
                        <div className="shrink-0">
                          {device.status === "DISABLED" ? (
                            <StatusBadge status="critical">
                              Disabled
                            </StatusBadge>
                          ) : (
                            <StatusBadge status={online ? "nominal" : "stale"}>
                              {online ? "Online" : "Offline"}
                            </StatusBadge>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col items-end gap-1 text-right">
                          <span className="max-w-full truncate font-heading text-xs text-board-fg">
                            {device.pond ? (
                              <Link
                                to={`/ponds/${device.pond.id}`}
                                className="underline-offset-4 hover:underline"
                              >
                                {device.pond.name}
                              </Link>
                            ) : (
                              <span className="text-board-muted">
                                Unassigned
                              </span>
                            )}
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-heading text-[0.7rem] text-board-muted">
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full",
                                online ? "bg-board-accent" : "bg-board-stale/50"
                              )}
                              aria-hidden="true"
                            />
                            {device.lastSeenAt
                              ? formatRelative(
                                  Date.parse(device.lastSeenAt),
                                  now
                                )
                              : "Never"}
                            <span className="sr-only">
                              {online ? "(online)" : "(offline)"}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="board-groove flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="font-sans text-[0.65rem] tracking-[0.08em] text-board-muted uppercase">
                          Firmware
                        </span>
                        <span className="font-heading text-xs text-board-muted">
                          {device.firmwareVersion ?? "—"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {isAdmin ? (
        <>
          <RegisterDeviceDialog
            open={registerOpen}
            onOpenChange={setRegisterOpen}
          />
          <ManageDeviceDialog
            open={manageOpen}
            onOpenChange={setManageOpen}
            device={managedDevice}
          />
        </>
      ) : null}
    </div>
  )
}
