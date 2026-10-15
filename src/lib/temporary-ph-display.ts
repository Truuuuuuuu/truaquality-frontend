import type { ParameterSignal } from "./pond-status.ts"

// Presentation-only override: no source reading, history, or sensor status is changed.
// Set this to false to restore the original current-reading tile rendering.
export const TEMPORARY_PH_DISPLAY_ENABLED = true
export const TEMPORARY_PH_DISPLAY_VALUE = 7.5

type TemporaryPhDisplayEligibility = {
  parameterId: string
  signal: ParameterSignal
  hasActiveAssignedDevice: boolean
  hasThreshold: boolean
}

export function temporaryPhDisplayValue({
  parameterId,
  signal,
  hasActiveAssignedDevice,
  hasThreshold,
}: TemporaryPhDisplayEligibility): number | null {
  return TEMPORARY_PH_DISPLAY_ENABLED &&
    parameterId === "ph" &&
    (signal === "live" || signal === "silent") &&
    hasActiveAssignedDevice &&
    hasThreshold
    ? TEMPORARY_PH_DISPLAY_VALUE
    : null
}
