import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { usePonds } from "@/hooks/use-ponds"

const UNASSIGNED = "unassigned"

type PondSelectProps = {
  id?: string
  value: string | null
  onChange: (pondId: string | null) => void
  // The device's current pond stays selectable even though it already "has a device".
  currentPondId?: string | null
}

export function PondSelect({
  id,
  value,
  onChange,
  currentPondId,
}: PondSelectProps) {
  const { data: ponds = [] } = usePonds()

  const items = [
    { value: UNASSIGNED, label: "Unassigned" },
    ...ponds
      .filter(
        (pond) =>
          pond.status === "ACTIVE" &&
          (!pond.device || pond.id === currentPondId)
      )
      .map((pond) => ({ value: pond.id, label: pond.name })),
  ]

  return (
    <Select
      items={items}
      value={value ?? UNASSIGNED}
      onValueChange={(next) =>
        onChange(!next || next === UNASSIGNED ? null : next)
      }
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
