import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router"
import { AppShell } from "@/components/app-shell"
import { ProtectedRoute } from "@/components/protected-route"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthProvider, useAuth } from "@/context/auth-context"
// The sign-in page stays in the main bundle: it is the first paint for anyone signed out and where an expired
// session lands, so making it wait on a second request would slow exactly the screen people see first.
import { LoginPage } from "@/pages/login-page"

// Every other page is its own chunk, fetched the first time its route is opened, so the first load no longer
// downloads every page (and its charts/tables) up front. Pages keep their named exports; the .then() adapts each
// to the default export React.lazy expects. New pages must be added here the same way, not imported statically.
const AcceptInvitePage = React.lazy(() =>
  import("@/pages/accept-invite-page").then((m) => ({
    default: m.AcceptInvitePage,
  }))
)
const AuditPage = React.lazy(() =>
  import("@/pages/audit-page").then((m) => ({ default: m.AuditPage }))
)
const DashboardPage = React.lazy(() =>
  import("@/pages/dashboard-page").then((m) => ({ default: m.DashboardPage }))
)
const DeviceDetailPage = React.lazy(() =>
  import("@/pages/device-detail-page").then((m) => ({
    default: m.DeviceDetailPage,
  }))
)
const DevicesPage = React.lazy(() =>
  import("@/pages/devices-page").then((m) => ({ default: m.DevicesPage }))
)
const NotificationsPage = React.lazy(() =>
  import("@/pages/notifications-page").then((m) => ({
    default: m.NotificationsPage,
  }))
)
const PondDetailPage = React.lazy(() =>
  import("@/pages/pond-detail-page").then((m) => ({
    default: m.PondDetailPage,
  }))
)
const PondsPage = React.lazy(() =>
  import("@/pages/ponds-page").then((m) => ({ default: m.PondsPage }))
)
const ProfilePage = React.lazy(() =>
  import("@/pages/profile-page").then((m) => ({ default: m.ProfilePage }))
)
const UsersPage = React.lazy(() =>
  import("@/pages/users-page").then((m) => ({ default: m.UsersPage }))
)

// One boundary per route element rather than one around <Routes>: a boundary around everything would swap the
// whole app shell (sidebar included) for the fallback on every first visit to a page, instead of only the
// content area.
function PageFallback() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function page(element: React.ReactNode) {
  return <React.Suspense fallback={<PageFallback />}>{element}</React.Suspense>
}

// Drops cached pond/device data on sign-out so the next person to sign in on this browser never
// sees the previous user's results, even briefly.
function ClearQueryCacheOnSignOut() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!session) queryClient.clear()
  }, [session, queryClient])

  return null
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClearQueryCacheOnSignOut />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/accept-invite" element={page(<AcceptInvitePage />)} />
          <Route
            path="/reset-password"
            element={page(<AcceptInvitePage mode="recovery" />)}
          />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={page(<DashboardPage />)} />
              <Route path="/ponds" element={page(<PondsPage />)} />
              <Route path="/ponds/:pondId" element={page(<PondDetailPage />)} />
              <Route path="/devices" element={page(<DevicesPage />)} />
              <Route
                path="/devices/:deviceId"
                element={page(<DeviceDetailPage />)}
              />
              <Route path="/users" element={page(<UsersPage />)} />
              <Route path="/audit" element={page(<AuditPage />)} />
              <Route
                path="/notifications"
                element={page(<NotificationsPage />)}
              />
              <Route path="/profile" element={page(<ProfilePage />)} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
