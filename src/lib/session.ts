export type Session = {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

// Exported so other tabs' `storage` events (which only fire for changes made elsewhere) can be
// filtered to just this key.
export const SESSION_STORAGE_KEY = "truaquality.session"
const STORAGE_KEY = SESSION_STORAGE_KEY

// "Keep me signed in" decides where a session lives: localStorage survives closing the browser and is
// shared by every tab, sessionStorage belongs to one tab and ends with it. Both storages can throw in
// private/restricted contexts, so every access is guarded; a session that can't be stored just won't persist.
function readFrom(storage: () => Storage): Session | null {
  try {
    const raw = storage().getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

// A tab-only session wins over a shared one, so a tab signed in without "Keep me signed in" keeps its
// own session instead of silently adopting another tab's.
export function loadSession(): Session | null {
  return readFrom(() => sessionStorage) ?? readFrom(() => localStorage)
}

// `remember` is passed on sign-in only. Without it (a token refresh), the session is rewritten wherever
// it already lives.
export function saveSession(session: Session, options?: { remember: boolean }) {
  try {
    const value = JSON.stringify(session)
    if (options === undefined) {
      const target =
        sessionStorage.getItem(STORAGE_KEY) !== null
          ? sessionStorage
          : localStorage
      target.setItem(STORAGE_KEY, value)
      return
    }
    const [target, other] = options.remember
      ? [localStorage, sessionStorage]
      : [sessionStorage, localStorage]
    target.setItem(STORAGE_KEY, value)
    other.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable; the session lasts only as long as this page.
  }
}

export function clearSession() {
  for (const storage of [() => localStorage, () => sessionStorage]) {
    try {
      storage().removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }
}
