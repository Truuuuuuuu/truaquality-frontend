/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import {
  ApiError,
  getMe,
  login as apiLogin,
  logoutSession as apiLogoutSession,
  refreshSession as apiRefreshSession,
  type Profile,
} from "@/lib/api"
import {
  clearSession,
  loadSession,
  saveSession,
  SESSION_STORAGE_KEY,
  type Session,
} from "@/lib/session"

type AuthState = {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  // Runs an authenticated call with the current access token, transparently refreshing and
  // retrying it once if the token has already expired server-side.
  authorizedRequest: <T>(fn: (token: string) => Promise<T>) => Promise<T>
}

const AuthContext = React.createContext<AuthState | undefined>(undefined)

// Refresh a bit before Supabase's expiry so a proactive refresh always lands before the token
// actually stops working, rather than racing it.
const REFRESH_BUFFER_MS = 60_000

function msUntilRefresh(session: Session): number {
  return session.expiresAt * 1000 - Date.now() - REFRESH_BUFFER_MS
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [isLoading, setIsLoading] = React.useState(() => loadSession() !== null)

  const refreshTimerRef = React.useRef<number>()
  // scheduleRefresh and performRefresh call each other; a ref breaks the cycle so neither
  // useCallback needs the other in its dependency array.
  const performRefreshRef =
    React.useRef<(refreshToken: string) => Promise<void>>()

  const clearRefreshTimer = React.useCallback(() => {
    if (refreshTimerRef.current !== undefined) {
      window.clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = undefined
    }
  }, [])

  const logout = React.useCallback(() => {
    const token = session?.accessToken
    clearRefreshTimer()
    clearSession()
    setSession(null)
    setProfile(null)
    // Best-effort: revoke the session server-side, but local sign-out succeeds either way.
    if (token) {
      void apiLogoutSession(token).catch(() => {})
    }
  }, [session, clearRefreshTimer])

  const scheduleRefresh = React.useCallback(
    (current: Session) => {
      clearRefreshTimer()
      refreshTimerRef.current = window.setTimeout(
        () => {
          void performRefreshRef.current?.(current.refreshToken)
        },
        Math.max(0, msUntilRefresh(current))
      )
    },
    [clearRefreshTimer]
  )

  // Shared by the proactive refresh timer and authorizedRequest's reactive retry, so both paths
  // apply the same new session/profile and only ever have one refresh in flight conceptually.
  const refreshAndGetToken = React.useCallback(
    async (refreshToken: string): Promise<string> => {
      try {
        const { session: apiSession } = await apiRefreshSession(refreshToken)
        const nextSession: Session = {
          accessToken: apiSession.access_token,
          refreshToken: apiSession.refresh_token,
          expiresAt: apiSession.expires_at,
        }
        const { profile: nextProfile } = await getMe(nextSession.accessToken)

        saveSession(nextSession)
        setSession(nextSession)
        setProfile(nextProfile)
        scheduleRefresh(nextSession)
        return nextSession.accessToken
      } catch (err) {
        // The refresh token is invalid or expired; there's no way back in without a fresh login.
        logout()
        throw err
      }
    },
    [logout, scheduleRefresh]
  )

  const performRefresh = React.useCallback(
    async (refreshToken: string) => {
      try {
        await refreshAndGetToken(refreshToken)
      } catch {
        // refreshAndGetToken already signed the user out; nothing else to do here.
      }
    },
    [refreshAndGetToken]
  )

  React.useEffect(() => {
    performRefreshRef.current = performRefresh
  }, [performRefresh])

  // A signed-out access token stays cryptographically valid until it expires — requireAuth checks
  // the JWT signature locally, not live revocation state — so another tab of this same browser
  // would otherwise keep working after logout until that token's own expiry. `storage` fires in
  // every OTHER tab (never the one that made the write), so this mirrors sign-out, sign-in, and
  // token rotation across tabs as soon as any one of them touches the session. It cannot reach a
  // different device or browser; that would need a server push, which this app doesn't have.
  React.useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key !== SESSION_STORAGE_KEY) return

      const stored = loadSession()
      if (!stored) {
        clearRefreshTimer()
        setSession(null)
        setProfile(null)
        return
      }

      // Supabase rotates the refresh token on every use, so adopt whatever the other tab just
      // wrote rather than letting this tab's timer later retry with a now-stale one.
      setSession(stored)
      getMe(stored.accessToken)
        .then(({ profile }) => {
          setProfile(profile)
          scheduleRefresh(stored)
        })
        .catch(() => {
          void performRefresh(stored.refreshToken)
        })
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [clearRefreshTimer, scheduleRefresh, performRefresh])

  const authorizedRequest = React.useCallback(
    async function authorizedRequest<T>(
      fn: (token: string) => Promise<T>
    ): Promise<T> {
      if (!session) throw new Error("not authenticated")
      try {
        return await fn(session.accessToken)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const nextToken = await refreshAndGetToken(session.refreshToken)
          return fn(nextToken)
        }
        throw err
      }
    },
    [session, refreshAndGetToken]
  )

  React.useEffect(() => {
    const stored = loadSession()
    if (!stored) return

    // Wrapped in a resolved-promise `.then` (rather than called as a bare statement) so state
    // updates happen inside a promise callback, not synchronously in the effect body.
    const restored = Promise.resolve().then(() =>
      msUntilRefresh(stored) <= 0
        ? performRefresh(stored.refreshToken)
        : getMe(stored.accessToken)
            .then(({ profile }) => {
              setSession(stored)
              setProfile(profile)
              scheduleRefresh(stored)
            })
            .catch(() => performRefresh(stored.refreshToken))
    )

    restored.finally(() => setIsLoading(false))

    return () => clearRefreshTimer()
    // Runs once on mount to restore a saved session; performRefresh/scheduleRefresh are stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = React.useCallback(
    async (email: string, password: string) => {
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
      scheduleRefresh(nextSession)
    },
    [scheduleRefresh]
  )

  const value = React.useMemo(
    () => ({ session, profile, isLoading, login, logout, authorizedRequest }),
    [session, profile, isLoading, login, logout, authorizedRequest]
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
