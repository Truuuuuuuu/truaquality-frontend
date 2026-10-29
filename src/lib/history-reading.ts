import type { NormalReference, Pond } from "@/lib/api"
import { referenceResult, type ParameterDisplayState } from "@/lib/do-display"
import {
  severityFor,
  type ReadingPoint,
  type Threshold,
} from "@/lib/parameters"
import type { PondReadingEntry } from "@/lib/pond-status"

// Selected history belongs to the pond, including previous assignments. Current
// probe presence/faults must not hide measurements made in the requested range.
export function historicalDisplayReading(
  entry: PondReadingEntry,
  pond: Pond,
  history: ReadingPoint[]
): ParameterDisplayState | null {
  if (entry.parameter.id !== "dissolvedOxygen") return entry.displayReading
  const points = history
    .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.v))
    .toSorted((a, b) => a.t - b.t)
  const last = points.at(-1)
  if (!last) return null
  const metadata = pond.parameterMetadata?.dissolvedOxygen
  return {
    kind: "reference",
    parameter: entry.parameter,
    current: last.v,
    history: points,
    updatedAt: last.t,
    normalReference: metadata?.normalReference ?? null,
    referenceComparison: referenceResult(last.v, metadata?.normalReference),
    assessment: metadata?.assessment ?? null,
    currentReading: false,
  }
}

export function historicalValuePresentation(
  parameter: string,
  value: number | null | undefined,
  threshold?: Threshold,
  reference?: NormalReference | null
) {
  if (typeof value !== "number" || !Number.isFinite(value))
    return { tone: "muted", label: "No reading", assessment: null } as const
  if (parameter === "dissolvedOxygen") {
    const result = referenceResult(value, reference)
    return {
      tone:
        result === "within_reference"
          ? "green"
          : result === "outside_reference"
            ? "amber"
            : "muted",
      label:
        result === "within_reference"
          ? "Within normal range"
          : result === "outside_reference"
            ? "Outside normal range"
            : "Reference unavailable",
      assessment: "Alert assessment pending",
    } as const
  }
  const severity = threshold ? severityFor(threshold, value) : null
  return {
    tone: severity ?? "muted",
    label:
      severity === "nominal"
        ? "Normal"
        : severity === "warning"
          ? "Warning"
          : severity === "critical"
            ? "Critical"
            : "Assessment unavailable",
    assessment: null,
  } as const
}
