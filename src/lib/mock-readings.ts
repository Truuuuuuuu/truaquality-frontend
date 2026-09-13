import * as React from "react"

export type ReadingStatus = "nominal" | "warning" | "critical" | "stale"

export type ParameterConfig = {
  id: string
  label: string
  unit: string
  precision: number
  safeMin: number
  safeMax: number
  criticalMin: number
  criticalMax: number
}

export type ReadingPoint = { t: number; v: number }

export type ReadingState = {
  parameter: ParameterConfig
  current: number
  history: ReadingPoint[]
  updatedAt: number
  status: ReadingStatus
  paused: boolean
}

// Illustrative parameter set for a pond monitoring station. Ranges are representative
// aquaculture pond targets, not a specific site's calibrated thresholds.
export const PARAMETERS: ParameterConfig[] = [
  {
    id: "temperature",
    label: "Temperature",
    unit: "°C",
    precision: 1,
    safeMin: 26,
    safeMax: 31,
    criticalMin: 24,
    criticalMax: 33,
  },
  {
    id: "dissolvedOxygen",
    label: "Dissolved Oxygen",
    unit: "mg/L",
    precision: 2,
    safeMin: 5,
    safeMax: 9,
    criticalMin: 3,
    criticalMax: 11,
  },
  {
    id: "salinity",
    label: "Salinity",
    unit: "ppt",
    precision: 1,
    safeMin: 10,
    safeMax: 25,
    criticalMin: 5,
    criticalMax: 32,
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function statusFor(parameter: ParameterConfig, value: number): ReadingStatus {
  if (value < parameter.criticalMin || value > parameter.criticalMax)
    return "critical"
  if (value < parameter.safeMin || value > parameter.safeMax) return "warning"
  return "nominal"
}

function step(value: number, volatility: number, min: number, max: number) {
  const next = value + (Math.random() - 0.5) * volatility
  return clamp(next, min, max)
}

function seedHistory(
  parameter: ParameterConfig,
  points: number,
  intervalMs: number,
  startValue: number,
  volatility: number,
  bounds: [number, number]
): ReadingPoint[] {
  const now = Date.now()
  const history: ReadingPoint[] = []
  let value = startValue
  for (let i = points - 1; i >= 0; i -= 1) {
    history.push({ t: now - i * intervalMs, v: value })
    value = step(value, volatility, bounds[0], bounds[1])
  }
  return history
}

const TICK_MS = 4000
const HISTORY_POINTS = 30

function createInitialState(
  parameter: ParameterConfig,
  startValue: number,
  volatility: number,
  bounds: [number, number],
  options: { paused?: boolean; staleMinutesAgo?: number } = {}
): ReadingState {
  const history = seedHistory(
    parameter,
    HISTORY_POINTS,
    TICK_MS,
    startValue,
    volatility,
    bounds
  )
  const last = history[history.length - 1]
  const updatedAt = options.staleMinutesAgo
    ? Date.now() - options.staleMinutesAgo * 60_000
    : last.t
  return {
    parameter,
    current: last.v,
    history,
    updatedAt,
    status: options.staleMinutesAgo ? "stale" : statusFor(parameter, last.v),
    paused: options.paused ?? false,
  }
}

function makeInitialReadings(): Record<string, ReadingState> {
  const [temperature, dissolvedOxygen, salinity] = PARAMETERS
  return {
    temperature: createInitialState(temperature, 28.4, 0.35, [23, 34]),
    // Seeded just under the safe floor so the warning state is visible without waiting on drift.
    dissolvedOxygen: createInitialState(dissolvedOxygen, 4.6, 0.3, [2.5, 11.5]),
    // Paused + stamped as last-seen a while ago to demonstrate the offline/stale state.
    salinity: createInitialState(salinity, 18, 0.6, [4, 33], {
      paused: true,
      staleMinutesAgo: 47,
    }),
  }
}

function tickReading(state: ReadingState): ReadingState {
  if (state.paused) return state
  const bounds: [number, number] =
    state.parameter.id === "temperature"
      ? [23, 34]
      : state.parameter.id === "dissolvedOxygen"
        ? [2.5, 11.5]
        : [4, 33]
  const volatility =
    state.parameter.id === "temperature"
      ? 0.35
      : state.parameter.id === "dissolvedOxygen"
        ? 0.3
        : 0.6
  const nextValue = step(state.current, volatility, bounds[0], bounds[1])
  const now = Date.now()
  const history = [...state.history.slice(1), { t: now, v: nextValue }]
  return {
    ...state,
    current: nextValue,
    history,
    updatedAt: now,
    status: statusFor(state.parameter, nextValue),
  }
}

export function useLiveReadings(): Record<string, ReadingState> {
  const [readings, setReadings] = React.useState(makeInitialReadings)

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setReadings((prev) => {
        const next: Record<string, ReadingState> = {}
        for (const key of Object.keys(prev)) {
          next[key] = tickReading(prev[key])
        }
        return next
      })
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  return readings
}
