import { cn } from "@/lib/utils"

// Pulse only under motion-safe so reduced-motion users get a static placeholder,
// and paint on the board's raised panel token so blocks sit on board surfaces
// the same way loaded content does.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "rounded bg-board-panel-raised motion-safe:animate-pulse",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
