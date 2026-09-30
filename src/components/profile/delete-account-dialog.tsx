import * as React from "react"
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
import { deleteAccount, errorMessage } from "@/lib/api"
import {
  PROFILE_DIALOG_BUTTON,
  PROFILE_DIALOG_TITLE,
} from "@/components/profile/dialog-styles"

const CONSEQUENCES = [
  "Your sign-in is removed on every device.",
  "Your name, email, and notifications are removed.",
  "Records of actions you took stay in BFAR's audit trail.",
  "To come back, an administrator has to invite you again.",
]

type DeleteAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DeleteAccountForm onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function DeleteAccountForm({ onCancel }: { onCancel: () => void }) {
  const { authorizedRequest, logout } = useAuth()
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await authorizedRequest((token) => deleteAccount(token, password))
    } catch (err) {
      setError(errorMessage(err))
      setIsSubmitting(false)
      return
    }
    // The account is gone, so signing out is all that's left; ProtectedRoute then redirects to /login.
    logout()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className={PROFILE_DIALOG_TITLE}>
          Delete your account?
        </DialogTitle>
        <DialogDescription>
          This can't be undone. Enter your password to confirm.
        </DialogDescription>
      </DialogHeader>

      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-board-fg marker:text-board-critical">
        {CONSEQUENCES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <FloatingLabelInput
        id="delete-account-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => {
          setPassword(event.target.value)
          if (error) setError(null)
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "delete-account-error" : undefined}
      />

      {error ? (
        <p
          id="delete-account-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          className={PROFILE_DIALOG_BUTTON}
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="destructive"
          className={PROFILE_DIALOG_BUTTON}
          disabled={isSubmitting || password.length === 0}
        >
          {isSubmitting ? "Deleting…" : "Delete account"}
        </Button>
      </DialogFooter>
    </form>
  )
}
