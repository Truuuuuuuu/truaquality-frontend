import type { ParameterAnalysis } from "@/lib/api"
import { formatDateTimeShort } from "@/lib/format-time"
import type { HistoryRangeValue } from "@/lib/history-range"
import type { ParameterConfig, Threshold } from "@/lib/parameters"
import { formatStatValue } from "@/lib/reading-format"

// Words the server's analysis of one parameter as a short paragraph for staff who don't read charts. Every
// number comes from GET /ponds/:id/analysis or the pond's server-resolved thresholds — this only phrases
// them; nothing here judges a reading.

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function spanPhrase(ms: number): string {
  if (ms % DAY_MS === 0) {
    const days = ms / DAY_MS
    return days === 1 ? "24 hours" : `${days} days`
  }
  const hours = Math.round(ms / HOUR_MS)
  return hours === 1 ? "hour" : `${hours} hours`
}

// "In the last 24 hours" / "From Sep 1, 11:00 AM to Sep 28, 11:00 AM" — opens the paragraph.
export function rangePhrase(range: HistoryRangeValue): string {
  return range.kind === "rolling"
    ? `In the last ${spanPhrase(range.windowMs)}`
    : `From ${formatDateTimeShort(Date.parse(range.from))} to ${formatDateTimeShort(Date.parse(range.to))}`
}

// What the previous-period comparison is against: "the 24 hours before" / "the same length of time before".
function previousPhrase(range: HistoryRangeValue): string {
  return range.kind === "rolling"
    ? `the ${spanPhrase(range.windowMs)} before`
    : "the same length of time before"
}

function sharePhrase(share: number): string {
  if (share < 0.01) return "less than 1%"
  return `about ${Math.round(share * 100)}%`
}

export function describeAnalysis(
  parameter: ParameterConfig,
  analysis: ParameterAnalysis,
  threshold: Threshold | undefined,
  range: HistoryRangeValue
): string[] {
  const unit = parameter.unit
  const value = (v: number) =>
    `${parameter.approximate ? "≈ " : ""}${formatStatValue(parameter, v)} ${unit}`
  const amount = (v: number) =>
    `${Math.abs(v).toFixed(parameter.precision)} ${unit}`
  const name = parameter.label.toLowerCase()
  const sentences: string[] = []

  sentences.push(
    analysis.min === analysis.max
      ? `${rangePhrase(range)}, ${name} held at ${value(analysis.avg)}.`
      : `${rangePhrase(range)}, ${name} averaged ${value(analysis.avg)} and ranged from ${formatStatValue(parameter, analysis.min)} to ${value(analysis.max)}.`
  )

  if (threshold) {
    // A parameter whose safe and critical minimums coincide has no low-side band (turbidity: lower is
    // clearer water), so its safe range reads as a ceiling.
    const safeRange =
      threshold.safeMin === threshold.criticalMin
        ? `up to ${amount(threshold.safeMax)}`
        : `${threshold.safeMin.toFixed(parameter.precision)}–${amount(threshold.safeMax)}`
    if (analysis.outOfRangeShare > 0) {
      sentences.push(
        `It was outside the safe range (${safeRange}) for ${sharePhrase(analysis.outOfRangeShare)} of readings, reaching ${analysis.worst} level at worst.`
      )
    } else if (analysis.worst !== "nominal") {
      sentences.push(
        `It stayed within the safe range (${safeRange}) on average, but briefly reached ${analysis.worst} level.`
      )
    } else {
      sentences.push(
        `It stayed within the safe range (${safeRange}) the whole time.`
      )
    }
  }

  const trend = analysis.trend
  if (trend === null) {
    sentences.push(
      "There aren't enough readings in this range to tell whether it is rising or falling."
    )
  } else if (trend.direction === "stable") {
    sentences.push("Overall it held steady.")
  } else {
    const per = trend.rateUnit === "hr" ? "hour" : "day"
    const rate = Math.abs(trend.rate).toFixed(parameter.precision)
    sentences.push(
      Number(rate) === 0
        ? `Overall it was ${trend.direction} slowly.`
        : `Overall it was ${trend.direction} by about ${rate} ${unit} per ${per}.`
    )
  }

  if (analysis.previousAvg !== null) {
    const difference = analysis.avg - analysis.previousAvg
    sentences.push(
      Number(Math.abs(difference).toFixed(parameter.precision)) === 0
        ? `Its average was about the same as in ${previousPhrase(range)}.`
        : `Its average was ${amount(difference)} ${difference > 0 ? "higher" : "lower"} than in ${previousPhrase(range)}.`
    )
  }

  return sentences
}
