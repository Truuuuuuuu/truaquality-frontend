import { Button } from "@/components/ui/button"
import { useDisplayPreferences } from "@/context/display-preferences-context"
import { cn } from "@/lib/utils"

export function SimpleModeToggle() {
  const { simpleMode, setSimpleMode } = useDisplayPreferences()

  return (
    <label className="inline-flex shrink-0 cursor-pointer items-center gap-2.5 font-sans text-sm text-board-fg">
      Simple mode
      <Button
        type="button"
        role="switch"
        aria-label="Simple mode"
        aria-checked={simpleMode}
        onClick={() => setSimpleMode(!simpleMode)}
        className={cn(
          "h-6 w-11 justify-start rounded-full border-0 p-0.5 transition-colors motion-reduce:transition-none",
          simpleMode
            ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            : "bg-zinc-400 hover:bg-zinc-500 dark:bg-zinc-600 dark:hover:bg-zinc-500"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-5 shrink-0 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none",
            simpleMode ? "translate-x-5" : "translate-x-0"
          )}
        />
      </Button>
    </label>
  )
}
