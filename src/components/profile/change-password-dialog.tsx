import * as React from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FloatingLabelInput } from "@/components/ui/floating-input"
import { useAuth } from "@/context/auth-context"
import { createAuthActionClient } from "@/lib/supabase"

type ChangePasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <ChangePasswordForm onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const { session } = useAuth()
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    if (!session) {
      setError(
        "Your session has expired. Sign in again to change your password."
      )
      return
    }

    setIsSubmitting(true)
    try {
      const client = createAuthActionClient()
      const { error: sessionError } = await client.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      })
      if (sessionError) throw sessionError
      const { error: updateError } = await client.auth.updateUser({
        password,
      })
      if (updateError) throw updateError
      setDone(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (done) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Password updated</DialogTitle>
          <DialogDescription>
            Use your new password next time you sign in.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-board-accent/30 bg-board-accent-dim px-3 py-2.5 text-sm text-board-accent">
          <CheckCircle2 className="size-4 shrink-0" />
          Your password was changed successfully.
        </div>
        <DialogFooter>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Change password</DialogTitle>
        <DialogDescription>
          Choose a new password for your TruAquality account.
        </DialogDescription>
      </DialogHeader>

      <FloatingLabelInput
        id="new-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <FloatingLabelInput
        id="confirm-new-password"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </DialogFooter>
    </form>
  )
}
