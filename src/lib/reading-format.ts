import type { ParameterConfig } from "@/lib/parameters"

// One formatter for a reading so the tile, card, chart tooltip and table can never disagree on how an
// approximate or at-the-limit value reads (D-05, D-11). The sensor ceiling is a display limit only —
// it never decides a status.
export type FormattedReading = {
  prefix: "≈" | "≥" | null
  number: string
  unit: string
  text: string
  // For screen readers, which would otherwise read "≈" and "≥" inconsistently or not at all.
  spoken: string
  atCeiling: boolean
}

// Exactly the ceiling: the firmware clamps muddier water to it. A value above it can only come from a
// refitted curve (the backend accepts up to its bounds), so it is a real measurement, shown as itself.
function isAtCeiling(parameter: ParameterConfig, value: number) {
  return (
    parameter.sensorCeiling !== undefined && value === parameter.sensorCeiling
  )
}

export function formatReading(
  parameter: ParameterConfig,
  value: number
): FormattedReading {
  const { unit } = parameter
  if (parameter.sensorCeiling !== undefined && isAtCeiling(parameter, value)) {
    const number = parameter.sensorCeiling.toFixed(0)
    return {
      prefix: "≥",
      number,
      unit,
      text: `≥ ${number} ${unit}`,
      spoken: `at least ${number} ${unit}, the sensor's limit`,
      atCeiling: true,
    }
  }
  const number = value.toFixed(parameter.precision)
  if (parameter.approximate)
    return {
      prefix: "≈",
      number,
      unit,
      text: `≈ ${number} ${unit}`,
      spoken: `approximately ${number} ${unit}`,
      atCeiling: false,
    }
  return {
    prefix: null,
    number,
    unit,
    text: `${number} ${unit}`,
    spoken: `${number} ${unit}`,
    atCeiling: false,
  }
}

// Chart header Min/Max/Avg stay bare numbers (the unit sits in the header), but a value pinned at the
// sensor's limit still has to say "at least".
export function formatStatValue(
  parameter: ParameterConfig,
  value: number
): string {
  if (parameter.sensorCeiling !== undefined && isAtCeiling(parameter, value))
    return `≥ ${parameter.sensorCeiling.toFixed(0)}`
  return value.toFixed(parameter.precision)
}
