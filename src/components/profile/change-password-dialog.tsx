import * as React from "react"
import { isAuthError } from "@supabase/supabase-js"
import { CheckCircle2, Mail } from "lucide-react"
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
import { createAuthActionClient, supabase } from "@/lib/supabase"

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
        {/* Keyed on `open` so every visit starts with empty fields and no stale error, rather than
            re-showing the previous attempt's state. */}
        <ChangePasswordForm
          key={String(open)}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

type FieldName = "current" | "new" | "confirm" | "form"
type FormError = { field: FieldName; message: string }

const FIELD_IDS: Record<Exclude<FieldName, "form">, string> = {
  current: "current-password",
  new: "new-password",
  confirm: "confirm-new-password",
}

// Supabase's own strings ("New password should be different from the old password.") aren't written for
// staff; name the problem and the fix in the product's own language.
function updateErrorMessage(err: unknown): FormError {
  if (isAuthError(err)) {
    if (err.code === "same_password") {
      return {
        field: "new",
        message: "Your new password must be different from your current one.",
      }
    }
    if (err.code === "weak_password") {
      return {
        field: "new",
        message:
          "That password is too easy to guess. Use a longer one that isn't a common word or phrase.",
      }
    }
    if (err.status === 429 || err.code === "over_request_rate_limit") {
      return {
        field: "form",
        message: "Too many attempts. Wait a few minutes, then try again.",
      }
    }
    if (err.name === "AuthRetryableFetchError") {
      return {
        field: "form",
        message:
          "Can't reach the password service. Check your internet connection and try again.",
      }
    }
  }
  return {
    field: "form",
    message: "Your password couldn't be changed. Try again in a moment.",
  }
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const { profile } = useAuth()
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<FormError | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSendingReset, setIsSendingReset] = React.useState(false)
  // "editing" is the form; the other two are terminal panels that replace it.
  const [view, setView] = React.useState<"editing" | "changed" | "reset-sent">(
    "editing"
  )

  function fail(field: FieldName, message: string) {
    setError({ field, message })
    if (field !== "form") document.getElementById(FIELD_IDS[field])?.focus()
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (isSubmitting) return
    setError(null)

    if (!currentPassword) {
      return fail("current", "Enter your current password.")
    }
    if (password.length < 8) {
      return fail("new", "Use at least 8 characters for your new password.")
    }
    if (password === currentPassword) {
      return fail(
        "new",
        "Your new password must be different from your current one."
      )
    }
    if (password !== confirmPassword) {
      return fail(
        "confirm",
        "The passwords don't match. Type the same password in both fields."
      )
    }
    if (!profile?.email) {
      return fail(
        "form",
        "Your session has expired. Sign in again to change your password."
      )
    }

    setIsSubmitting(true)
    // A throwaway client (no persisted session, no refresh timer) so none of this touches the session
    // AuthProvider owns. Signing in with the current password is the verification: Supabase checks it
    // server-side, and the session it returns is what authorizes the update — the same technique the
    // backend uses to confirm identity before deleting an account.
    const client = createAuthActionClient()
    try {
      const { error: signInError } = await client.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      })
      if (signInError) {
        if (
          signInError.status === 429 ||
          signInError.code === "over_request_rate_limit"
        ) {
          throw signInError
        }
        setIsSubmitting(false)
        return fail(
          "current",
          "That isn't your current password. Check it and try again."
        )
      }

      const { error: updateError } = await client.auth.updateUser({ password })
      if (updateError) throw updateError
      setView("changed")
    } catch (err) {
      const next = updateErrorMessage(err)
      fail(next.field, next.message)
    } finally {
      // Verifying minted a second session for this account; it has served its purpose either way.
      void client.auth.signOut()
      setIsSubmitting(false)
    }
  }

  // Requiring the current password strands anyone who has forgotten it: they are signed in but can't
  // get past the first field. The same reset email the sign-in page sends is the way out, and it works
  // without knowing the old password because the link itself proves control of the mailbox.
  async function handleForgotPassword() {
    if (isSendingReset || !profile?.email) return
    setError(null)
    setIsSendingReset(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        profile.email,
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      if (resetError) throw resetError
      setView("reset-sent")
    } catch (err) {
      const rateLimited =
        isAuthError(err) &&
        (err.status === 429 || err.code === "over_request_rate_limit")
      fail(
        "form",
        rateLimited
          ? "Too many reset emails were requested. Wait a few minutes, then try again."
          : "The reset email couldn't be sent. Try again in a moment."
      )
    } finally {
      setIsSendingReset(false)
    }
  }

  if (view === "reset-sent") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Check your email</DialogTitle>
          <DialogDescription>
            Follow the link to set a new password without your current one.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-2 rounded-lg border border-board-border px-3 py-2.5 text-sm text-board-fg">
          <Mail className="mt-0.5 size-4 shrink-0 text-board-muted" />
          <span>
            A link to set a new password is on its way to{" "}
            <span className="font-medium break-words">{profile?.email}</span>.
            It can take a few minutes to arrive.
          </span>
        </div>
        <DialogFooter>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </>
    )
  }

  if (view === "changed") {
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

  const errorId = error ? "change-password-error" : undefined
  const describedBy = (field: FieldName) =>
    error?.field === field ? errorId : undefined

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Change password</DialogTitle>
        <DialogDescription>
          Confirm your current password, then choose a new one.
        </DialogDescription>
      </DialogHeader>

      <FloatingLabelInput
        id={FIELD_IDS.current}
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => {
          setCurrentPassword(event.target.value)
          if (error) setError(null)
        }}
        aria-invalid={error?.field === "current" || undefined}
        aria-describedby={describedBy("current")}
      />
      <button
        type="button"
        onClick={handleForgotPassword}
        aria-disabled={isSendingReset || undefined}
        className="-mt-1 self-start rounded-sm text-xs font-medium text-board-muted underline-offset-4 transition-colors hover:text-board-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 aria-disabled:cursor-progress"
      >
        {isSendingReset
          ? "Sending reset link…"
          : "Forgot your current password?"}
      </button>
      <FloatingLabelInput
        id={FIELD_IDS.new}
        label="New password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value)
          if (error) setError(null)
        }}
        aria-invalid={error?.field === "new" || undefined}
        aria-describedby={describedBy("new")}
      />
      <FloatingLabelInput
        id={FIELD_IDS.confirm}
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => {
          setConfirmPassword(event.target.value)
          if (error) setError(null)
        }}
        aria-invalid={error?.field === "confirm" || undefined}
        aria-describedby={describedBy("confirm")}
      />

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="submit" aria-disabled={isSubmitting || undefined}>
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </DialogFooter>
    </form>
  )
}
