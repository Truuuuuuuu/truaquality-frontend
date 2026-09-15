import * as React from "react"
import { TriangleAlert } from "lucide-react"
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

const CONSEQUENCES = [
  "Your sign-in is removed immediately, on every device.",
  "Your name, email, and notifications are removed from TruAquality.",
  "Records of actions you took are kept for BFAR's audit trail.",
  "This can't be undone. An administrator would have to invite you again.",
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
        <DialogTitle>Delete your account</DialogTitle>
        <DialogDescription>
          Enter your password to confirm it's you.
        </DialogDescription>
      </DialogHeader>

      <ul className="flex flex-col gap-2 rounded-lg border border-board-border px-3 py-2.5">
        {CONSEQUENCES.map((line) => (
          <li key={line} className="flex gap-2 text-sm text-board-warn">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <FloatingLabelInput
        id="delete-account-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="destructive"
          disabled={isSubmitting || password.length === 0}
        >
          {isSubmitting ? "Deleting…" : "Delete my account"}
        </Button>
      </DialogFooter>
    </form>
  )
}
