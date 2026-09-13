import { Navigate, Outlet, useLocation } from "react-router"
import { useAuth } from "@/context/auth-context"

export function ProtectedRoute() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
