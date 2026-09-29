import type {
  UnitViewProbe,
  UnitViewProps,
} from "@/components/devices/device-unit-view"
import { SENSOR_TONE_STATUS } from "@/lib/device-health"
import { STATUS_COLOR } from "@/lib/status-styles"

const WIDTH = 480
const HEIGHT = 300
const GLANDS = [210, 270]
const PROBE_TOP = 196

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
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
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

      {GLANDS.map((x) => (
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
          glandX={GLANDS[index % GLANDS.length]}
          selected={probe.parameter === selected}
          onSelect={onSelect}
        />
      ))}
    </svg>
  )
}

function SchematicProbe({
  probe,
  x,
  glandX,
  selected,
  onSelect,
}: {
  probe: UnitViewProbe
  x: number
  glandX: number
  selected: boolean
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
        {probe.label}
      </text>
      <text
        x={x}
        y={288}
        textAnchor="middle"
        fontSize={11}
        fill={
          probe.tone === "fault"
            ? "var(--board-critical)"
            : "var(--board-muted)"
        }
      >
        {probe.stateLabel}
      </text>
    </g>
  )
}

// DS18B20: a slim stainless capsule. SEN0189: a wider body with a sensing window. Anything else: generic.
function ProbeGlyph({ parameter, x }: { parameter: string; x: number }) {
  const stroke = "var(--board-border-strong)"
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
