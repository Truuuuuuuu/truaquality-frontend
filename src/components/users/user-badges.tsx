import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import type { Profile } from "@/lib/api"

const STATUS_STYLES: Record<Profile["status"], string> = {
  INVITED: "border-board-warn/50 text-board-warn",
  ACTIVE: "border-board-accent/50 text-board-accent",
  DISABLED: "border-board-critical/50 text-board-critical",
}

const STATUS_LABELS: Record<Profile["status"], string> = {
  INVITED: "Invited",
  ACTIVE: "Active",
  DISABLED: "Disabled",
}

export function UserStatusBadge({ status }: { status: Profile["status"] }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

export function RoleBadge({ role }: { role: Profile["systemRole"] }) {
  return (
    <Badge
      variant="outline"
      className={
        role === "ADMIN"
          ? "border-board-border-strong text-board-fg"
          : "border-board-border text-board-muted"
      }
    >
      {role === "ADMIN" ? "Admin" : "Staff"}
    </Badge>
  )
}
