import type {
  UnitViewProbe,
  UnitViewProps,
} from "@/components/devices/device-unit-view"
import { SENSOR_TONE_STATUS } from "@/lib/device-health"
import { STATUS_COLOR } from "@/lib/status-styles"

const WIDTH = 480
const HEIGHT = 300
const PROBE_TOP = 196

// One cable gland per probe, so no two cables share a hole. One or two probes keep the original layout;
// more are spread evenly around the enclosure's centre (three probes: 195, 240, 285).
function glandPositions(count: number): number[] {
  if (count <= 2) return [210, 270]
  const spacing = Math.min(45, 140 / (count - 1))
  const start = 240 - (spacing * (count - 1)) / 2
  return Array.from({ length: count }, (_, i) => start + i * spacing)
}

function probeX(index: number, count: number) {
  return ((index + 1) * WIDTH) / (count + 1)
}

// The same parts as the 3D model, drawn flat: shown while the 3D view loads, and instead of it when the
// browser has no WebGL. Colors are CSS variables, so a theme switch repaints it with no re-render.
export function DeviceSchematic({
  deviceState,
  probes,
  selected,
  onSelect,
}: UnitViewProps) {
  const ledColor =
    deviceState === "ONLINE" ? "var(--board-accent)" : "var(--board-stale)"
  const glands = glandPositions(probes.length)
  const phIndex = probes.findIndex((probe) => probe.parameter === "ph")
  const crowded = probes.length >= 4
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${crowded ? 350 : HEIGHT}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className="font-sans"
    >
      <rect
        x={150}
        y={20}
        width={180}
        height={120}
        rx={10}
        fill="var(--board-panel-raised)"
        stroke="var(--board-border-strong)"
        strokeWidth={2}
      />
      <rect
        x={170}
        y={40}
        width={140}
        height={80}
        rx={3}
        fill="var(--board-panel)"
        stroke="var(--board-border-strong)"
      />
      <rect
        x={238}
        y={58}
        width={58}
        height={44}
        rx={2}
        fill="var(--board-bg)"
        stroke="var(--board-border-strong)"
      />
      <polyline
        points="244,52 250,46 256,52 262,46 268,52 274,46 280,52 286,46 292,52"
        fill="none"
        stroke="var(--board-muted)"
        strokeWidth={1.5}
      />
      <circle
        cx={192}
        cy={62}
        r={6}
        fill={ledColor}
        stroke="var(--board-border-strong)"
      />

      {phIndex !== -1 && <PhSignalBoard glandX={glands[phIndex]} />}

      {glands.map((x) => (
        <rect
          key={x}
          x={x - 10}
          y={138}
          width={20}
          height={14}
          rx={2}
          fill="var(--board-panel-raised)"
          stroke="var(--board-border-strong)"
        />
      ))}

      {probes.map((probe, index) => (
        <SchematicProbe
          key={probe.parameter}
          probe={probe}
          x={probeX(index, probes.length)}
          glandX={glands[index]}
          selected={probe.parameter === selected}
          crowded={crowded}
          onSelect={onSelect}
        />
      ))}
    </svg>
  )
}

// The analog pH kit's signal board sits inside the enclosure, wired out through the pH probe's own gland.
// Drawn in neutral parts colors only: it is hardware, not a status.
function PhSignalBoard({ glandX }: { glandX: number }) {
  return (
    <g>
      <path
        d={`M 215 108 L 215 112 L ${glandX} 112 L ${glandX} 138`}
        fill="none"
        stroke="var(--board-muted)"
        strokeWidth={1}
      />
      <rect
        x={198}
        y={86}
        width={34}
        height={22}
        rx={2}
        fill="var(--board-panel-raised)"
        stroke="var(--board-border-strong)"
      />
    </g>
  )
}

function SchematicProbe({
  probe,
  x,
  glandX,
  selected,
  crowded,
  onSelect,
}: {
  probe: UnitViewProbe
  x: number
  glandX: number
  selected: boolean
  crowded: boolean
  onSelect: (parameter: string) => void
}) {
  const color = STATUS_COLOR[SENSOR_TONE_STATUS[probe.tone]]
  const cableStroke =
    probe.tone === "fault" ? "var(--board-critical)" : "var(--board-muted)"
  const ringRadius = probe.parameter === "turbidity" ? 18 : 12
  return (
    <g onClick={() => onSelect(probe.parameter)} className="cursor-pointer">
      <path
        d={`M ${glandX} 152 C ${glandX} 176, ${x} 168, ${x} ${PROBE_TOP}`}
        fill="none"
        stroke={cableStroke}
        strokeWidth={3}
        strokeDasharray={probe.tone === "fault" ? "6 4" : undefined}
        opacity={probe.tone === "stale" ? 0.4 : 1}
      />
      <ProbeGlyph parameter={probe.parameter} x={x} />
      <ellipse
        cx={x}
        cy={PROBE_TOP + 6}
        rx={ringRadius}
        ry={4}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 3.5 : 2}
      />
      <text
        x={x}
        y={272}
        textAnchor="middle"
        fontSize={12}
        fontWeight={selected ? 600 : 400}
        fill="var(--board-fg)"
      >
        {crowded && probe.parameter === "dissolvedOxygen" ? (
          <>
            <tspan x={x}>Dissolved</tspan>
            <tspan x={x} dy={14}>
              oxygen
            </tspan>
          </>
        ) : (
          probe.label
        )}
      </text>
      <text
        x={x}
        y={crowded ? 306 : 288}
        textAnchor="middle"
        fontSize={11}
        fill={
          probe.tone === "fault"
            ? "var(--board-critical)"
            : "var(--board-muted)"
        }
      >
        {crowded
          ? probe.stateLabel
              .split(" ")
              .reduce<string[]>((lines, word) => {
                const last = lines.length - 1
                if (last >= 0 && `${lines[last]} ${word}`.length <= 15)
                  lines[last] += ` ${word}`
                else lines.push(word)
                return lines
              }, [])
              .map((line, index) => (
                <tspan key={index} x={x} dy={index === 0 ? 0 : 13}>
                  {line}
                </tspan>
              ))
          : probe.stateLabel}
      </text>
    </g>
  )
}

// DS18B20: a slim stainless capsule. SEN0189: a wider body with a sensing window. Analog pH kit: a glass
// electrode, a plastic cap over a slim glass stem ending in the sensing bulb. Anything else: generic.
function ProbeGlyph({ parameter, x }: { parameter: string; x: number }) {
  const stroke = "var(--board-border-strong)"
  // A generic closed probe with a flat sensing end; no kit dimensions or electrode construction implied.
  if (parameter === "dissolvedOxygen")
    return (
      <g data-probe="dissolvedOxygen">
        <rect
          x={x - 9}
          y={PROBE_TOP}
          width={18}
          height={46}
          rx={5}
          fill="var(--board-panel-raised)"
          stroke={stroke}
        />
        <path
          d={`M ${x - 9} ${PROBE_TOP + 37} H ${x + 9}`}
          fill="none"
          stroke={stroke}
        />
      </g>
    )
  if (parameter === "ph")
    return (
      <g>
        <rect
          x={x - 4}
          y={PROBE_TOP + 10}
          width={8}
          height={40}
          rx={4}
          fill="var(--board-bg)"
          stroke={stroke}
        />
        <circle
          cx={x}
          cy={PROBE_TOP + 50}
          r={6}
          fill="var(--board-bg)"
          stroke={stroke}
        />
        <rect
          x={x - 6}
          y={PROBE_TOP}
          width={12}
          height={10}
          rx={2}
          fill="var(--board-panel-raised)"
          stroke={stroke}
        />
      </g>
    )
  if (parameter === "temperature")
    return (
      <rect
        x={x - 5}
        y={PROBE_TOP}
        width={10}
        height={52}
        rx={5}
        fill="var(--board-muted)"
        stroke={stroke}
      />
    )
  if (parameter === "turbidity")
    return (
      <g>
        <rect
          x={x - 14}
          y={PROBE_TOP}
          width={28}
          height={40}
          rx={4}
          fill="var(--board-panel-raised)"
          stroke={stroke}
        />
        <rect
          x={x - 7}
          y={PROBE_TOP + 20}
          width={14}
          height={12}
          rx={2}
          fill="var(--board-bg)"
          stroke={stroke}
        />
      </g>
    )
  return (
    <rect
      x={x - 8}
      y={PROBE_TOP}
      width={16}
      height={44}
      rx={8}
      fill="var(--board-panel-raised)"
      stroke={stroke}
    />
  )
}
