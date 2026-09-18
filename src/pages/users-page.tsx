import * as React from "react"
import { AlertTriangle, Plus, SearchX, Users as UsersIcon } from "lucide-react"
import { Navigate } from "react-router"
import { BoardEmptyState } from "@/components/board-empty-state"
import { BoardPager } from "@/components/board-pager"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InviteUserDialog } from "@/components/users/invite-user-dialog"
import { ManageUserDialog } from "@/components/users/manage-user-dialog"
import { RoleBadge, UserStatusBadge } from "@/components/users/user-badges"
import { RegistryToolbar } from "@/components/registry-toolbar"
import { useAuth } from "@/context/auth-context"
import { useUsers } from "@/hooks/use-users"
import type { Profile } from "@/lib/api"
import { formatRelative } from "@/lib/format-time"
import { useNow } from "@/hooks/use-now"

// One office's staff roster, so the whole list arrives in a single request and search, filtering,
// and paging all run here rather than as query parameters on the backend.
const PAGE_SIZE = 10

type StatusFilter = "ALL" | Profile["status"]
type RoleFilter = "ALL" | Profile["systemRole"]

const ROLE_OPTIONS = [
  { value: "ALL", label: "All roles" },
  { value: "ADMIN", label: "Admins" },
  { value: "USER", label: "Staff" },
] as const satisfies readonly { value: RoleFilter; label: string }[]

function matchesSearch(user: Profile, query: string) {
  return (
    user.fullName.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query)
  )
}

export function UsersPage() {
  const { profile } = useAuth()
  const now = useNow()
  const isAdmin = profile?.systemRole === "ADMIN"
  const { data: users, error } = useUsers({ enabled: isAdmin })

  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [manageOpen, setManageOpen] = React.useState(false)
  // Kept after the dialog closes so its content doesn't blank out during the exit animation.
  const [manageUser, setManageUser] = React.useState<Profile | null>(null)

  const [search, setSearch] = React.useState("")
  const [role, setRole] = React.useState<RoleFilter>("ALL")
  const [status, setStatus] = React.useState<StatusFilter>("ALL")
  const [page, setPage] = React.useState(1)

  // Admin-only: this list carries staff PII, unlike Ponds/Devices it isn't shown read-only to
  // everyone else.
  if (profile && profile.systemRole !== "ADMIN") {
    return <Navigate to="/" replace />
  }

  function openManage(user: Profile) {
    setManageUser(user)
    setManageOpen(true)
  }

  // Any change to what's being filtered puts you back at the top of the result, since the page
  // number you were on describes a list that no longer exists.
  function changeSearch(next: string) {
    setSearch(next)
    setPage(1)
  }

  function changeRole(next: RoleFilter) {
    setRole(next)
    setPage(1)
  }

  function changeStatus(next: StatusFilter) {
    setStatus(next)
    setPage(1)
  }

  function clearFilters() {
    setSearch("")
    setRole("ALL")
    setStatus("ALL")
    setPage(1)
  }

  const all = [...(users ?? [])].sort(
    (a, b) =>
      Number(a.status === "DISABLED") - Number(b.status === "DISABLED") ||
      a.fullName.localeCompare(b.fullName)
  )

  const query = search.trim().toLowerCase()
  // Counts sit on the status chips, so they're taken before the status filter but after the other
  // two — clicking a chip then shows exactly the number it advertised.
  const narrowed = all.filter(
    (user) =>
      (query === "" || matchesSearch(user, query)) &&
      (role === "ALL" || user.systemRole === role)
  )
  const countOf = (match: Profile["status"]) =>
    narrowed.filter((user) => user.status === match).length
  const statusOptions = [
    { value: "ALL", label: "All", count: narrowed.length },
    { value: "ACTIVE", label: "Active", count: countOf("ACTIVE") },
    { value: "INVITED", label: "Invited", count: countOf("INVITED") },
    { value: "DISABLED", label: "Disabled", count: countOf("DISABLED") },
  ] as const satisfies readonly {
    value: StatusFilter
    label: string
    count: number
  }[]
  const filtered = narrowed.filter(
    (user) => status === "ALL" || user.status === status
  )

  const hasFilters = query !== "" || role !== "ALL" || status !== "ALL"
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  // Clamped rather than corrected in an effect: the 30 s poll can shrink the list under a page
  // number that was valid when it was set.
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
            Users
          </h1>
          <p className="font-sans text-xs text-board-muted">
            Staff accounts for BFAR Sorsogon — invite-only, no public signup
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus />
          Invite user
        </Button>
      </div>

      {!users ? (
        error ? (
          <BoardEmptyState icon={AlertTriangle} tone="error">
            Couldn't load users: {error.message}
          </BoardEmptyState>
        ) : (
          <p className="font-sans text-sm text-board-muted">Loading users…</p>
        )
      ) : all.length === 0 ? (
        <BoardEmptyState icon={UsersIcon}>
          No staff accounts yet. Invite the first user to get them signed in.
        </BoardEmptyState>
      ) : (
        <>
          <RegistryToolbar
            search={search}
            onSearchChange={changeSearch}
            searchLabel="Find by name or email"
            chips={{
              label: "Filter by status",
              value: status,
              onChange: changeStatus,
              options: statusOptions,
            }}
            select={{
              label: "Filter by role",
              value: role,
              onChange: changeRole,
              options: ROLE_OPTIONS,
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
              No staff accounts match these filters. Clear them to see the full
              roster.
            </BoardEmptyState>
          ) : (
            <>
              {/* Registry table: sm and up, where a fixed-width grid of columns fits without cramping.
                  Flat, not a card — row hairlines (from TableRow/TableHeader) carry the structure. */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invited</TableHead>
                      <TableHead>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((user) => {
                      const isSelf = user.id === profile?.id
                      const roleLabel =
                        user.systemRole === "ADMIN" ? "Admin" : "Staff"
                      const statusLabel =
                        user.status.charAt(0) +
                        user.status.slice(1).toLowerCase()
                      const invitedLabel = `Invited ${formatRelative(new Date(user.createdAt).getTime(), now)}`
                      return (
                        <TableRow
                          key={user.id}
                          className={
                            user.status === "DISABLED"
                              ? "text-board-muted"
                              : undefined
                          }
                        >
                          <TableCell
                            tabIndex={0}
                            aria-label={`${user.fullName}${isSelf ? " (you)" : ""}`}
                            className="max-w-64 font-medium text-board-fg"
                          >
                            {user.fullName}
                            {isSelf ? (
                              <span className="ml-1.5 text-xs text-board-muted">
                                (you)
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell
                            tabIndex={0}
                            aria-label={`Email: ${user.email}`}
                            className="font-heading text-xs text-board-muted"
                          >
                            {user.email}
                          </TableCell>
                          <TableCell tabIndex={0} aria-label={roleLabel}>
                            <RoleBadge role={user.systemRole} />
                          </TableCell>
                          <TableCell tabIndex={0} aria-label={statusLabel}>
                            <UserStatusBadge status={user.status} />
                          </TableCell>
                          <TableCell
                            tabIndex={0}
                            aria-label={invitedLabel}
                            className="font-heading text-xs text-board-muted"
                          >
                            {formatRelative(
                              new Date(user.createdAt).getTime(),
                              now
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openManage(user)}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Registry cards: below sm, where the table's fixed columns force cramped, truncated cells. */}
              <div className="flex flex-col gap-3 sm:hidden">
                {rows.map((user) => {
                  const roleLabel =
                    user.systemRole === "ADMIN" ? "Admin" : "Staff"
                  const statusLabel =
                    user.status.charAt(0) + user.status.slice(1).toLowerCase()
                  const invitedLabel = `Invited ${formatRelative(new Date(user.createdAt).getTime(), now)}`
                  return (
                    <div
                      key={user.id}
                      className="board-groove overflow-hidden rounded-xl border border-board-border bg-board-panel"
                    >
                      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                        <div
                          tabIndex={0}
                          role="group"
                          aria-label={`${user.fullName}${user.id === profile?.id ? " (you)" : ""}, ${user.email}`}
                          className="flex min-w-0 flex-col gap-1"
                        >
                          <span className="truncate font-sans text-sm font-semibold text-board-fg">
                            {user.fullName}
                            {user.id === profile?.id ? (
                              <span className="ml-1.5 text-xs font-normal text-board-muted">
                                (you)
                              </span>
                            ) : null}
                          </span>
                          <span className="truncate font-heading text-xs text-board-muted">
                            {user.email}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-mt-1 -mr-2 shrink-0"
                          onClick={() => openManage(user)}
                        >
                          Manage
                        </Button>
                      </div>

                      <div className="board-groove flex items-center justify-between gap-3 px-4 py-3">
                        <div
                          tabIndex={0}
                          role="group"
                          aria-label={`${roleLabel}, ${statusLabel}`}
                          className="flex items-center gap-1.5"
                        >
                          <RoleBadge role={user.systemRole} />
                          <UserStatusBadge status={user.status} />
                        </div>
                        <span
                          tabIndex={0}
                          role="group"
                          aria-label={invitedLabel}
                          className="shrink-0 font-heading text-[0.7rem] text-board-muted"
                        >
                          {formatRelative(
                            new Date(user.createdAt).getTime(),
                            now
                          )}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <BoardPager
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onPageChange={setPage}
                noun={
                  hasFilters
                    ? filtered.length === 1
                      ? "match"
                      : "matches"
                    : filtered.length === 1
                      ? "staff account"
                      : "staff accounts"
                }
              />
            </>
          )}
        </>
      )}

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <ManageUserDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        user={manageUser}
        isSelf={manageUser?.id === profile?.id}
        isTargetAdmin={manageUser?.systemRole === "ADMIN"}
      />
    </div>
  )
}
