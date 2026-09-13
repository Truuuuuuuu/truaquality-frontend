export type Session = {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

// Exported so other tabs' `storage` events (which only fire for changes made elsewhere) can be
// filtered to just this key.
export const SESSION_STORAGE_KEY = "truaquality.session"
const STORAGE_KEY = SESSION_STORAGE_KEY

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // localStorage can throw in private/restricted contexts; session just won't persist.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
