/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { getMe, login as apiLogin, type Profile } from "@/lib/api"
import { clearSession, loadSession, saveSession, type Session } from "@/lib/session"

type AuthState = {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = React.createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [isLoading, setIsLoading] = React.useState(() => loadSession() !== null)

  React.useEffect(() => {
    const stored = loadSession()
    if (!stored) return

    getMe(stored.accessToken)
      .then(({ profile }) => {
        setSession(stored)
        setProfile(profile)
      })
      .catch(() => {
        clearSession()
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = React.useCallback(async (email: string, password: string) => {
    const { session: apiSession } = await apiLogin(email, password)
    const nextSession: Session = {
      accessToken: apiSession.access_token,
      refreshToken: apiSession.refresh_token,
      expiresAt: apiSession.expires_at,
    }
    const { profile: nextProfile } = await getMe(nextSession.accessToken)

    saveSession(nextSession)
    setSession(nextSession)
    setProfile(nextProfile)
  }, [])

  const logout = React.useCallback(() => {
    clearSession()
    setSession(null)
    setProfile(null)
  }, [])

  const value = React.useMemo(
    () => ({ session, profile, isLoading, login, logout }),
    [session, profile, isLoading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
