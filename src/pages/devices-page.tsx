import { Cpu } from "lucide-react"

export function DevicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
          Devices
        </h1>
        <p className="font-sans text-xs text-board-muted">
          Monitoring device registry for BFAR Sorsogon — not built yet.
        </p>
      </div>

      <div className="board-groove flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-board-border-strong bg-board-panel/60 px-6 py-16 text-center">
        <Cpu className="size-6 text-board-muted" />
        <p className="max-w-sm font-sans text-sm text-board-muted">
          Device management is coming soon. This page will list each sensor
          device, its pairing status, and its assigned pond.
        </p>
      </div>
    </div>
  )
}
