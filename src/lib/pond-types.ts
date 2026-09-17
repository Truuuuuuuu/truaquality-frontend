import type { PondType } from "@/lib/api"

export const POND_TYPES = [
  { value: "FRESHWATER", label: "Freshwater" },
  { value: "BRACKISH", label: "Brackish" },
  { value: "SALTWATER", label: "Saltwater" },
] as const satisfies readonly { value: PondType; label: string }[]

export function pondTypeLabel(pondType: PondType | null) {
  return POND_TYPES.find((item) => item.value === pondType)?.label ?? null
}
