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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useInviteUser } from "@/hooks/use-users"
import { errorMessage, type Profile } from "@/lib/api"

const ROLE_ITEMS = [
  { value: "USER", label: "Staff" },
  { value: "ADMIN", label: "Admin" },
] as const

type InviteUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteUserDialog({
  open,
  onOpenChange,
}: InviteUserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <InviteUserForm
          key={open ? "open" : "closed"}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function InviteUserForm({ onDone }: { onDone: () => void }) {
  const [fullName, setFullName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [systemRole, setSystemRole] =
    React.useState<Profile["systemRole"]>("USER")
  const [error, setError] = React.useState<string | null>(null)
  const [invited, setInvited] = React.useState<Profile | null>(null)
  const inviteUser = useInviteUser()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const result = await inviteUser.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim(),
        systemRole,
      })
      setInvited(result.profile)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (invited) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-board-accent" />
            Invite sent
          </DialogTitle>
          <DialogDescription>
            {invited.email} will get an email with a link to set their password.
            Their account stays in "Invited" status until they use it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onDone}>Done</Button>
        </DialogFooter>
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Invite user</DialogTitle>
        <DialogDescription>
          They'll get an email to set their own password. There's no public
          signup — every account starts here.
        </DialogDescription>
      </DialogHeader>

      <FloatingLabelInput
        id="invite-full-name"
        label="Full name"
        required
        maxLength={120}
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
      />
      <FloatingLabelInput
        id="invite-email"
        label="Email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-role">Role</Label>
        <Select
          items={ROLE_ITEMS}
          value={systemRole}
          onValueChange={(next) => setSystemRole(next as Profile["systemRole"])}
        >
          <SelectTrigger id="invite-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="submit" disabled={inviteUser.isPending}>
          {inviteUser.isPending ? "Sending invite…" : "Send invite"}
        </Button>
      </DialogFooter>
    </form>
  )
}
