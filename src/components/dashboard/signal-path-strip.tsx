import { Link } from "react-router"
import { cn } from "cn"
import { silentReason } from "@/lib/device-health"

type ProbeRingProps = {
  className?: string
}

// The hollow ring that stands for a probe that has gone quiet — shared by the Signal Path strip
// and the dashboard card's silent column so both read the same glyph.
export function ProbeRing({ className }: ProbeRingProps) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full border-[1.5px] border-board-stale",
        className
      )}
      aria-hidden="true"
    />
  )
}

type SignalPathStripProps = {
  parameterLabel: string
  reasonToken: string | null
  deviceId: string
}

// Unit -> connector -> probe, read left to right: the solid unit dot says the unit itself is
// still reporting, the hollow ring at the far end says only this probe went quiet, and the text
// beside it is the reason the unit gave. The reason/action copy comes from device-health so it
// matches the unit diagnostics page word for word. Screen readers get one complete sentence; the
// visual fragments are hidden so it isn't read twice.
export function SignalPathStrip({
  parameterLabel,
  reasonToken,
  deviceId,
}: SignalPathStripProps) {
  const { label, action } = silentReason(reasonToken)

  return (
    <p className="font-sans text-xs">
      <span className="sr-only">
        {`Unit online. ${parameterLabel} probe: ${label}. ${action}.`}
      </span>
      <span className="flex flex-wrap items-center gap-2" aria-hidden="true">
        <span className="size-1.5 shrink-0 rounded-full bg-board-accent" />
        <span className="text-board-muted">Unit online</span>
        <span className="min-w-4 flex-1 border-t border-dashed border-board-border-strong" />
        <ProbeRing />
        <span className="font-medium text-board-fg">{label}</span>
      </span>
      <span className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-board-muted" aria-hidden="true">
          {action}
        </span>
        <Link
          to={`/devices/${deviceId}`}
          className="font-medium text-board-muted underline-offset-2 hover:text-board-fg hover:underline focus-visible:text-board-fg focus-visible:underline"
        >
          View unit details
        </Link>
      </span>
    </p>
  )
}
