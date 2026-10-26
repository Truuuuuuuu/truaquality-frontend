/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

const STORAGE_KEY = "truaquality-simple-mode"

type DisplayPreferences = {
  simpleMode: boolean
  setSimpleMode: (enabled: boolean) => void
}

const DisplayPreferencesContext = React.createContext<
  DisplayPreferences | undefined
>(undefined)

export function DisplayPreferencesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [simpleMode, setSimpleModeState] = React.useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true"
    } catch {
      return false
    }
  })

  const setSimpleMode = React.useCallback((enabled: boolean) => {
    setSimpleModeState(enabled)
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled))
    } catch {
      // Display controls still work when this browser denies persistent storage.
    }
  }, [])

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setSimpleModeState(event.newValue === "true")
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const value = React.useMemo(
    () => ({ simpleMode, setSimpleMode }),
    [simpleMode, setSimpleMode]
  )

  return (
    <DisplayPreferencesContext.Provider value={value}>
      {children}
    </DisplayPreferencesContext.Provider>
  )
}

export function useDisplayPreferences() {
  const context = React.useContext(DisplayPreferencesContext)
  if (!context) {
    throw new Error(
      "useDisplayPreferences must be used within DisplayPreferencesProvider"
    )
  }
  return context
}
