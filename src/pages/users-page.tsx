import * as React from "react"
import { AlertTriangle, Plus, Users as UsersIcon } from "lucide-react"
import { Navigate } from "react-router"
import { BoardEmptyState } from "@/components/board-empty-state"
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
import { useAuth } from "@/context/auth-context"
import { useUsers } from "@/hooks/use-users"
import type { Profile } from "@/lib/api"
import { formatRelative } from "@/lib/format-time"
import { useNow } from "@/hooks/use-now"

export function UsersPage() {
  const { profile } = useAuth()
  const now = useNow()
  const isAdmin = profile?.systemRole === "ADMIN"
  const { data: users, error } = useUsers({ enabled: isAdmin })

  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [manageOpen, setManageOpen] = React.useState(false)
  // Kept after the dialog closes so its content doesn't blank out during the exit animation.
  const [manageUser, setManageUser] = React.useState<Profile | null>(null)

  // Admin-only: this list carries staff PII, unlike Ponds/Devices it isn't shown read-only to
  // everyone else.
  if (profile && profile.systemRole !== "ADMIN") {
    return <Navigate to="/" replace />
  }

  function openManage(user: Profile) {
    setManageUser(user)
    setManageOpen(true)
  }

  const rows = [...(users ?? [])].sort(
    (a, b) =>
      Number(a.status === "DISABLED") - Number(b.status === "DISABLED") ||
      a.fullName.localeCompare(b.fullName)
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
      ) : rows.length === 0 ? (
        <BoardEmptyState icon={UsersIcon}>
          No staff accounts yet. Invite the first user to get them signed in.
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
                {rows.map((user) => (
                  <TableRow
                    key={user.id}
                    className={
                      user.status === "DISABLED"
                        ? "text-board-muted"
                        : undefined
                    }
                  >
                    <TableCell className="max-w-64 font-medium text-board-fg">
                      {user.fullName}
                      {user.id === profile?.id ? (
                        <span className="ml-1.5 text-xs text-board-muted">
                          (you)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-heading text-xs text-board-muted">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={user.systemRole} />
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="font-heading text-xs text-board-muted">
                      {formatRelative(new Date(user.createdAt).getTime(), now)}
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
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Registry cards: below sm, where the table's fixed columns force cramped, truncated cells. */}
          <div className="flex flex-col gap-3 sm:hidden">
            {rows.map((user) => (
              <div
                key={user.id}
                className="board-groove overflow-hidden rounded-xl border border-board-border bg-board-panel"
              >
                <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                  <div className="flex min-w-0 flex-col gap-1">
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
                  <div className="flex items-center gap-1.5">
                    <RoleBadge role={user.systemRole} />
                    <UserStatusBadge status={user.status} />
                  </div>
                  <span className="shrink-0 font-heading text-[0.7rem] text-board-muted">
                    {formatRelative(new Date(user.createdAt).getTime(), now)}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
