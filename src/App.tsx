import { BrowserRouter, Route, Routes } from "react-router"
import { AppShell } from "@/components/app-shell"
import { ProtectedRoute } from "@/components/protected-route"
import { AuthProvider } from "@/context/auth-context"
import { DashboardPage } from "@/pages/dashboard-page"
import { DevicesPage } from "@/pages/devices-page"
import { LoginPage } from "@/pages/login-page"
import { PondsPage } from "@/pages/ponds-page"

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/ponds" element={<PondsPage />} />
              <Route path="/devices" element={<DevicesPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
