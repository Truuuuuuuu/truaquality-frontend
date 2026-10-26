import { Check, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDisplayPreferences } from "@/context/display-preferences-context"

export function SimpleModeToggle() {
  const { simpleMode, setSimpleMode } = useDisplayPreferences()
  const Icon = simpleMode ? Check : SlidersHorizontal

  return (
    <Button
      type="button"
      variant={simpleMode ? "secondary" : "outline"}
      size="sm"
      aria-label="Simple mode"
      aria-pressed={simpleMode}
      onClick={() => setSimpleMode(!simpleMode)}
      className="shrink-0"
    >
      <Icon aria-hidden="true" />
      Simple mode
      <span className="text-xs opacity-70" aria-hidden="true">
        {simpleMode ? "On" : "Off"}
      </span>
    </Button>
  )
}
