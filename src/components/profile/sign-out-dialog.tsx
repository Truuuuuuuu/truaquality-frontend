import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/auth-context"
import {
  PROFILE_DIALOG_BUTTON,
  PROFILE_DIALOG_TITLE,
} from "@/components/profile/dialog-styles"

type SignOutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className={PROFILE_DIALOG_TITLE}>Sign out?</DialogTitle>
          <DialogDescription>
            You'll need your password to sign back in on this browser.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className={PROFILE_DIALOG_BUTTON}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {/* Explicit navigation clears the return destination for the next login. */}
          <Button
            type="button"
            variant="destructive"
            className={PROFILE_DIALOG_BUTTON}
            onClick={() => {
              logout()
              navigate("/login", { replace: true, state: null })
            }}
          >
            Sign out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
