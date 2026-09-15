import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router"
import { AppShell } from "@/components/app-shell"
import { ProtectedRoute } from "@/components/protected-route"
import { AuthProvider, useAuth } from "@/context/auth-context"
import { AcceptInvitePage } from "@/pages/accept-invite-page"
import { DashboardPage } from "@/pages/dashboard-page"
import { DevicesPage } from "@/pages/devices-page"
import { LoginPage } from "@/pages/login-page"
import { PondDetailPage } from "@/pages/pond-detail-page"
import { PondsPage } from "@/pages/ponds-page"
import { UsersPage } from "@/pages/users-page"

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
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/ponds" element={<PondsPage />} />
              <Route path="/ponds/:pondId" element={<PondDetailPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
