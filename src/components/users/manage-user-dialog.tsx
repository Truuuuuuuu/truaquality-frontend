import * as React from "react"
import {
  CheckCircle2,
  Lock,
  Mail,
  TriangleAlert,
  UserCheck,
  UserX,
} from "lucide-react"
import { RoleBadge, UserStatusBadge } from "@/components/users/user-badges"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useResendInvite, useUpdateUserStatus } from "@/hooks/use-users"
import { errorMessage, type Profile } from "@/lib/api"

type ManageUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: Profile | null
  // The signed-in admin can't disable their own account (the backend rejects it too).
  isSelf: boolean
  // Admin accounts can't be disabled at all, by anyone (the backend rejects it too).
  isTargetAdmin: boolean
}

export function ManageUserDialog({
  open,
  onOpenChange,
  user,
  isSelf,
  isTargetAdmin,
}: ManageUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {user ? (
          <ManageUserForm
            key={user.id}
            user={user}
            isSelf={isSelf}
            isTargetAdmin={isTargetAdmin}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ManageUserForm({
  user,
  isSelf,
  isTargetAdmin,
  onDone,
}: {
  user: Profile
  isSelf: boolean
  isTargetAdmin: boolean
  onDone: () => void
}) {
  const [error, setError] = React.useState<string | null>(null)
  const [confirmingDisable, setConfirmingDisable] = React.useState(false)
  const [resent, setResent] = React.useState(false)
  const updateStatus = useUpdateUserStatus()
  const resendInvite = useResendInvite()
  const isPending = updateStatus.isPending || resendInvite.isPending

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      return true
    } catch (err) {
      setError(errorMessage(err))
      return false
    }
  }

  async function handleDisable() {
    const saved = await run(() =>
      updateStatus.mutateAsync({ id: user.id, status: "DISABLED" })
    )
    setConfirmingDisable(false)
    if (saved) onDone()
  }

  async function handleEnable() {
    const saved = await run(() =>
      updateStatus.mutateAsync({ id: user.id, status: "ACTIVE" })
    )
    if (saved) onDone()
  }

  async function handleResendInvite() {
    setResent(false)
    const saved = await run(() => resendInvite.mutateAsync(user.id))
    if (saved) setResent(true)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{user.fullName}</DialogTitle>
        <DialogDescription>{user.email}</DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-2">
        <RoleBadge role={user.systemRole} />
        <UserStatusBadge status={user.status} />
      </div>

      {user.status === "INVITED" ? (
        <div className="flex flex-col gap-2 border-t pt-4">
          <p className="flex gap-2 text-sm text-muted-foreground">
            <Mail className="mt-0.5 size-4 shrink-0" />
            <span>
              This account hasn't accepted its invite yet. Resend the email if
              the link expired or never arrived.
            </span>
          </p>
          <div className="flex items-center gap-2 pl-6">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => void handleResendInvite()}
            >
              <Mail />
              {resendInvite.isPending ? "Resending…" : "Resend invite"}
            </Button>
            {resent ? (
              <span className="inline-flex items-center gap-1 text-xs text-board-accent">
                <CheckCircle2 className="size-3.5" />
                Invite sent
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-t pt-4">
        {isSelf ? (
          <p className="flex gap-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <span>You can't disable your own account.</span>
          </p>
        ) : isTargetAdmin ? (
          <p className="flex gap-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <span>Admin accounts can't be disabled.</span>
          </p>
        ) : user.status === "DISABLED" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => void handleEnable()}
            >
              <UserCheck />
              {updateStatus.isPending ? "Enabling…" : "Enable user"}
            </Button>
          </div>
        ) : confirmingDisable ? (
          <div className="flex animate-in flex-col gap-2 duration-150 fade-in-0 slide-in-from-top-1">
            <p className="flex gap-2 text-sm text-board-warn">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                Disabling signs {user.fullName.split(" ")[0]} out immediately
                and blocks further sign-in until re-enabled.
              </span>
            </p>
            <div className="flex gap-2 pl-6">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => void handleDisable()}
              >
                Disable user
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingDisable(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => setConfirmingDisable(true)}
            >
              <UserX />
              Disable user…
            </Button>
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Close
        </Button>
      </DialogFooter>
    </>
  )
}
