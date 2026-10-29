import type {
  AssessmentPolicy,
  NormalReference,
  ReferenceComparison,
} from "@/lib/api"
import type {
  ParameterConfig,
  ReadingPoint,
  ReadingState,
} from "@/lib/parameters"

export type ReferenceTone = "green" | "amber" | "muted"

export type DoReadingState = {
  kind: "reference"
  parameter: ParameterConfig
  current: number
  history: ReadingPoint[]
  updatedAt: number
  normalReference: NormalReference | null
  referenceComparison: ReferenceComparison | null
  assessment: AssessmentPolicy | null
  currentReading: boolean
}

// Legacy consumers keep ReadingState; new dispatchers must narrow this union.
// A reference reading deliberately has neither Threshold nor ReadingStatus.
export type ParameterDisplayState =
  (ReadingState & { kind: "assessed" }) | DoReadingState

export function referenceResult(
  value: unknown,
  normalReference?: unknown
): ReferenceComparison | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !normalReference ||
    typeof normalReference !== "object" ||
    Array.isArray(normalReference)
  )
    return null
  const reference = normalReference as Record<string, unknown>
  if (
    !["kind", "boundary", "operator", "unit", "label"].every((key) =>
      Object.hasOwn(reference, key)
    ) ||
    reference.kind !== "lower" ||
    reference.operator !== "gt" ||
    reference.unit !== "mg/L" ||
    typeof reference.label !== "string" ||
    !reference.label.trim() ||
    typeof reference.boundary !== "number" ||
    !Number.isFinite(reference.boundary)
  )
    return null
  return value > reference.boundary ? "within_reference" : "outside_reference"
}

export function referenceTone(
  result: ReferenceComparison | null,
  current: boolean
): ReferenceTone {
  if (!current || result === null) return "muted"
  return result === "within_reference" ? "green" : "amber"
}
