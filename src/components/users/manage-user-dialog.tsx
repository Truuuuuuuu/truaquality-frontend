import * as React from "react"
import {
  CheckCircle2,
  Lock,
  Mail,
  TriangleAlert,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react"
import { RoleBadge, UserStatusBadge } from "@/components/users/user-badges"
import { PROFILE_DIALOG_BUTTON } from "@/components/profile/dialog-styles"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useNow } from "@/hooks/use-now"
import { useResendInvite, useUpdateUserStatus } from "@/hooks/use-users"
import { errorMessage, type Profile } from "@/lib/api"
import { formatDate, formatRelative } from "@/lib/format-time"

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
      <DialogContent className="gap-6 sm:max-w-md">
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
  const now = useNow(60_000)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmingDisable, setConfirmingDisable] = React.useState(false)
  const [resent, setResent] = React.useState(false)
  const updateStatus = useUpdateUserStatus()
  const resendInvite = useResendInvite()
  const isPending = updateStatus.isPending || resendInvite.isPending
  const firstName = user.fullName.split(" ")[0]
  const invitedAt = new Date(user.createdAt).getTime()
  const isDisabled = user.status === "DISABLED"

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
        <DialogTitle className="text-lg [overflow-wrap:anywhere]">
          {user.fullName}
          {isSelf ? (
            <span className="ml-2 text-sm font-normal text-board-muted">
              (you)
            </span>
          ) : null}
        </DialogTitle>
        <DialogDescription className="font-heading text-xs [overflow-wrap:anywhere]">
          {user.email}
        </DialogDescription>
      </DialogHeader>

      {/* Record plate: the account's facts at a glance, before anything that changes them. */}
      <dl className="grid grid-cols-3 overflow-hidden rounded-lg border border-board-border bg-board-bg shadow-[inset_0_1px_2px_0_oklch(0_0_0/12%)]">
        <RecordCell label="Role">
          <RoleBadge role={user.systemRole} />
        </RecordCell>
        <RecordCell label="Status">
          <UserStatusBadge status={user.status} />
        </RecordCell>
        <RecordCell label="Invited">
          <span
            title={formatDate(invitedAt)}
            className="font-heading text-xs text-board-fg tabular-nums"
          >
            {formatRelative(invitedAt, now)}
          </span>
        </RecordCell>
      </dl>

      <section aria-labelledby="manage-user-access" className="flex flex-col">
        <h3
          id="manage-user-access"
          className="pb-2 font-sans text-sm font-semibold text-board-fg"
        >
          Access
        </h3>
        <div className="board-groove-rows flex flex-col">
          {user.status === "INVITED" ? (
            <ActionRow
              icon={Mail}
              title="Invite pending"
              description="This account hasn't accepted its invite yet. Resend the email if the link expired or never arrived."
              action={
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
              }
              note={
                resent ? (
                  <span
                    role="status"
                    className="inline-flex animate-in items-center gap-1 text-xs text-board-accent duration-200 fade-in-0"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Invite sent
                  </span>
                ) : null
              }
            />
          ) : null}

          {isSelf ? (
            <ActionRow
              icon={Lock}
              title="Sign-in access"
              description="You can't disable your own account."
            />
          ) : isTargetAdmin ? (
            <ActionRow
              icon={Lock}
              title="Sign-in access"
              description="Admin accounts can't be disabled."
            />
          ) : isDisabled ? (
            <ActionRow
              icon={UserCheck}
              title="Sign-in blocked"
              description={`${firstName} can't sign in until the account is enabled again.`}
              action={
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
              }
            />
          ) : confirmingDisable ? (
            <div className="py-3">
              <div
                role="alert"
                className="flex animate-in gap-3 rounded-lg border border-board-critical/40 bg-board-critical-dim/25 px-3 py-3 duration-200 fade-in-0 slide-in-from-top-1"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-board-critical" />
                <div className="flex flex-col gap-1">
                  <p className="font-sans text-sm font-semibold text-board-fg">
                    Disable {firstName}'s account?
                  </p>
                  <p className="text-sm text-pretty text-board-muted">
                    Disabling signs {firstName} out immediately and blocks
                    further sign-in until re-enabled.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ActionRow
              icon={UserX}
              title="Disable account"
              description="Signs them out and blocks sign-in until re-enabled."
              action={
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setConfirmingDisable(true)}
                >
                  <UserX />
                  Disable…
                </Button>
              }
            />
          )}
        </div>
      </section>

      {error ? (
        <p role="alert" className="-mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* The irreversible-feeling step lives in the footer, so the confirm and its way out sit
          where every other dialog's final decision does. */}
      <DialogFooter>
        {confirmingDisable ? (
          <>
            <Button
              type="button"
              variant="outline"
              className={PROFILE_DIALOG_BUTTON}
              disabled={isPending}
              onClick={() => setConfirmingDisable(false)}
            >
              Keep access
            </Button>
            <Button
              type="button"
              variant="destructive"
              className={PROFILE_DIALOG_BUTTON}
              disabled={isPending}
              onClick={() => void handleDisable()}
            >
              {updateStatus.isPending ? "Disabling…" : "Disable user"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className={PROFILE_DIALOG_BUTTON}
            onClick={onDone}
          >
            Done
          </Button>
        )}
      </DialogFooter>
    </>
  )
}

function RecordCell({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5 border-board-border px-3 py-2.5 not-first:border-l">
      <dt className="text-xs text-board-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function ActionRow({
  icon: Icon,
  title,
  description,
  action,
  note,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  note?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex min-w-0 gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-board-muted" />
        <div className="flex flex-col gap-0.5">
          <p className="font-sans text-sm font-medium text-board-fg">{title}</p>
          <p className="text-sm text-pretty text-board-muted">{description}</p>
          {note}
        </div>
      </div>
      {action ? <div className="pl-7">{action}</div> : null}
    </div>
  )
}
