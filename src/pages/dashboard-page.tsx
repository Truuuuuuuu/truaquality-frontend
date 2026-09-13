import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

export function DashboardPage() {
  const { profile, logout } = useAuth()

  return (
    <div className="flex min-h-svh flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-medium">TruAquality</h1>
        <Button variant="outline" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
      <div className="text-sm leading-loose">
        <p>Signed in as {profile?.email}</p>
        <p className="text-muted-foreground">Role: {profile?.systemRole}</p>
        <p className="text-muted-foreground">
          Offices: {profile?.memberships.map((m) => m.office.name).join(", ") || "none"}
        </p>
      </div>
    </div>
  )
}
