import { Navigate, Outlet, useLocation } from "react-router"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/context/auth-context"

export function ProtectedRoute() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <AuthRestoreSkeleton />
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}

// Shown while the Supabase session restores, before AppShell mounts. It mirrors the shell's rail and main
// padding (and uses the same board scope/background) so the swap to the real shell doesn't flash or jump.
function AuthRestoreSkeleton() {
  return (
    <div
      className="tq-board-scope flex min-h-svh bg-board-bg text-board-fg"
      aria-busy="true"
      aria-label="Loading your session"
    >
      <div className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-board-border bg-board-rail md:flex">
        <div className="flex flex-col gap-2 border-b border-board-border px-5 py-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex flex-col gap-3 px-5 py-5">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-5 w-36" />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-board-border px-4 py-3 md:hidden">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      </div>
    </div>
  )
}
