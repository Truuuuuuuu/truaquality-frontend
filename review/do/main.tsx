/* eslint-disable react-refresh/only-export-components */
import { createRoot } from "react-dom/client"
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { App } from "../../src/App"
import { ThemeProvider } from "@/components/theme-provider"
import { DisplayPreferencesProvider } from "@/context/display-preferences-context"
import { reviewManifest, selectReviewScenario } from "./api"
import "./style.css"

// Static modules/assets use native browser loading; every programmatic network path fails closed.
// Downloads are decoded locally from generated real XLSX bytes, with no fetch exception.
const denyNetwork = () => {
  throw new Error("Network requests are disabled in the isolated simulator")
}
window.fetch = async () => denyNetwork()
window.XMLHttpRequest = class {
  constructor() {
    denyNetwork()
  }
} as unknown as typeof XMLHttpRequest
window.WebSocket = class {
  constructor() {
    denyNetwork()
  }
} as unknown as typeof WebSocket
window.EventSource = class {
  constructor() {
    denyNetwork()
  }
} as unknown as typeof EventSource
navigator.sendBeacon = denyNetwork
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function Review() {
  const [scenario, setScenario] = useState(reviewManifest.scenarioIds[0]!)
  return (
    <>
      <aside
        className="sticky top-0 z-[100] flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-amber-500 bg-amber-100 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
        aria-label="Simulation provenance"
      >
        <strong>Simulated data</strong>
        <label>
          Scenario{" "}
          <select
            aria-label="Review scenario"
            value={scenario}
            className="max-w-44 rounded border border-current bg-transparent p-1"
            onChange={(event) => {
              selectReviewScenario(event.target.value)
              setScenario(event.target.value)
              queryClient.resetQueries()
            }}
          >
            {reviewManifest.scenarioIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs">
          Generated {reviewManifest.generatedAt}. Frozen sample window; display
          dates rebased to this review session. Downloads retain original
          generated dates.
        </span>
      </aside>
      <App />
    </>
  )
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider storageKey="truaquality-do-review-theme">
    <QueryClientProvider client={queryClient}>
      <DisplayPreferencesProvider>
        <Review />
      </DisplayPreferencesProvider>
    </QueryClientProvider>
  </ThemeProvider>
)
