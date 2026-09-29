import * as React from "react"
import { DeviceSchematic } from "@/components/devices/device-schematic"
import type { DeviceState, SensorTone } from "@/lib/device-health"

export type UnitViewProbe = {
  parameter: string
  label: string
  stateLabel: string
  tone: SensorTone
}

export type UnitViewProps = {
  deviceState: DeviceState
  // Only the sensors the backend returned; the view never invents a probe the unit doesn't report.
  probes: UnitViewProbe[]
  selected: string | null
  onSelect: (parameter: string) => void
}

// The only way into the 3D file. A static import anywhere would pull three.js into the main bundle, so
// it stays behind this lazy boundary and loads only when a device page is opened.
const DeviceModel3DLazy = React.lazy(() =>
  import("@/components/devices/device-model-3d").then((module) => ({
    default: module.DeviceModel3D,
  }))
)

let webglCache: boolean | null = null

function webglAvailable() {
  if (webglCache === null) {
    try {
      const canvas = document.createElement("canvas")
      webglCache = Boolean(
        canvas.getContext("webgl2") ?? canvas.getContext("webgl")
      )
    } catch {
      webglCache = false
    }
  }
  return webglCache
}

type BoundaryProps = { fallback: React.ReactNode; children: React.ReactNode }

// A GPU that refuses a context, or a chunk that fails to load, should leave the schematic in place rather
// than blank the page (the app has no error boundary of its own).
class ModelErrorBoundary extends React.Component<
  BoundaryProps,
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function DeviceUnitView(props: UnitViewProps) {
  const webgl = webglAvailable()
  const schematic = <DeviceSchematic {...props} />
  return (
    <div className="flex flex-col gap-2">
      {/* Decorative: the canvas and its floating labels repeat what the Sensors list says, and that list
          is what keyboard and screen-reader users work with. */}
      <div aria-hidden="true" className="relative h-72 w-full sm:h-80 lg:h-96">
        {webgl ? (
          <ModelErrorBoundary fallback={schematic}>
            <React.Suspense fallback={schematic}>
              <DeviceModel3DLazy {...props} />
            </React.Suspense>
          </ModelErrorBoundary>
        ) : (
          schematic
        )}
      </div>
      {webgl ? (
        <p className="font-sans text-xs text-board-muted">
          Drag to turn the unit. Select a probe to see its sensor.
        </p>
      ) : null}
    </div>
  )
}
