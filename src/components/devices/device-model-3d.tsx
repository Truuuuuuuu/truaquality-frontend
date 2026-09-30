import * as React from "react"
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber"
import { Html, OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import type {
  UnitViewProbe,
  UnitViewProps,
} from "@/components/devices/device-unit-view"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { cn } from "@/lib/utils"

// Reached only through React.lazy in device-unit-view.tsx — never import this file statically, or
// three.js ends up in the main bundle.

// Physical materials, not statuses: a PCB is green, the module can is metal, cable jackets are black and
// probes are steel or dark plastic whatever the theme. Every status color comes from the board tokens.
const PCB_COLOR = "#1f4d3a"
const METAL_COLOR = "#b9bdc3"
const TRACE_COLOR = "#c9a24b"
const CABLE_COLOR = "#23262b"
const PLASTIC_COLOR = "#2b2e34"
const WINDOW_COLOR = "#a8cfe0"
// Light-grey ABS, the usual weatherproof junction box. It was the --board-panel-raised token, which is
// near-black in the dark theme and made the enclosure vanish into the dark board.
const SHELL_COLOR = "#d4d7db"

const TOKENS = [
  "--board-accent",
  "--board-stale",
  "--board-critical",
  "--board-panel-raised",
  "--board-fg",
  "--board-bg",
] as const
type TokenName = (typeof TOKENS)[number]
type TokenColors = Record<TokenName, string>

let paintContext: CanvasRenderingContext2D | null | undefined

// Keyed by the <html> class: the token values only change when the theme class does.
const colorCache = new Map<string, TokenColors>()

// three.Color can't parse the oklch() the tokens are written in, so each one is painted onto a 1x1 canvas
// and read back as sRGB — the browser does the color conversion it already does for the page itself.
function readTokenColors(themeClass: string): TokenColors {
  const cached = colorCache.get(themeClass)
  if (cached) return cached
  if (paintContext === undefined) {
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    paintContext = canvas.getContext("2d", { willReadFrequently: true })
  }
  const styles = getComputedStyle(document.documentElement)
  const colors = {} as TokenColors
  for (const token of TOKENS) {
    colors[token] = "#808080"
    const context = paintContext
    if (!context) continue
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = "#808080"
    context.fillStyle = styles.getPropertyValue(token).trim() || "#808080"
    context.fillRect(0, 0, 1, 1)
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data
    colors[token] =
      `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`
  }
  colorCache.set(themeClass, colors)
  return colors
}

// The theme provider swaps a "light"/"dark" class on <html>; watching that class is what tells the scene to
// re-read its colors.
function useThemeClass() {
  return React.useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange)
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      })
      return () => observer.disconnect()
    },
    () => document.documentElement.className,
    () => ""
  )
}

function toneColor(tone: UnitViewProbe["tone"], colors: TokenColors) {
  if (tone === "fault") return colors["--board-critical"]
  if (tone === "stale") return colors["--board-stale"]
  return colors["--board-accent"]
}

const ENCLOSURE = { width: 0.36, height: 0.24, depth: 0.12, y: 0.2 }
const GLAND_X = [-0.07, 0.07]
const GLAND_Y = ENCLOSURE.y - ENCLOSURE.height / 2
const PROBE_HEAD_Y = -0.2

function probeX(index: number, count: number) {
  if (count === 1) return 0
  return -0.3 + (index * 0.6) / (count - 1)
}

export function DeviceModel3D(props: UnitViewProps) {
  const reducedMotion = usePrefersReducedMotion()
  const themeClass = useThemeClass()
  const colors = React.useMemo(() => readTokenColors(themeClass), [themeClass])

  React.useEffect(
    () => () => {
      document.body.style.cursor = ""
    },
    []
  )

  return (
    <Canvas
      dpr={[1, 2]}
      // Framed so the lowest label (under the long temperature probe) stays inside the canvas through a full
      // auto-rotation; the nearer probe projects lowest, and the old closer camera clipped whichever that was.
      camera={{ position: [0.77, 0.47, 1.4], fov: 35 }}
      frameloop={reducedMotion ? "demand" : "always"}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[1.5, 2, 1.8]} intensity={1.6} />
      <UnitScene {...props} colors={colors} animate={!reducedMotion} />
      <OrbitControls
        makeDefault
        target={[0, -0.06, 0]}
        enablePan={false}
        minDistance={1.1}
        maxDistance={2.4}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.55}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.6}
        enableDamping={!reducedMotion}
      />
    </Canvas>
  )
}

function UnitScene({
  deviceState,
  probes,
  selected,
  onSelect,
  colors,
  animate,
}: UnitViewProps & { colors: TokenColors; animate: boolean }) {
  return (
    <group>
      <Enclosure />
      <Board />
      <StatusLed
        online={deviceState === "ONLINE"}
        colors={colors}
        animate={animate}
      />
      {GLAND_X.map((x) => (
        <Gland key={x} x={x} />
      ))}
      {probes.map((probe, index) => (
        <Probe
          key={probe.parameter}
          probe={probe}
          x={probeX(index, probes.length)}
          glandX={GLAND_X[index % GLAND_X.length]}
          selected={probe.parameter === selected}
          onSelect={onSelect}
          colors={colors}
        />
      ))}
    </group>
  )
}

function Enclosure() {
  const { width, height, depth, y } = ENCLOSURE
  const wall = 0.008
  const shell = SHELL_COLOR
  // Back plate and four walls rather than one solid box, so the board inside shows through the lid.
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, -depth / 2]}>
        <boxGeometry args={[width, height, wall]} />
        <meshStandardMaterial color={shell} roughness={0.8} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`x${side}`} position={[(side * width) / 2, 0, 0]}>
          <boxGeometry args={[wall, height, depth]} />
          <meshStandardMaterial color={shell} roughness={0.8} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`y${side}`} position={[0, (side * height) / 2, 0]}>
          <boxGeometry args={[width, wall, depth]} />
          <meshStandardMaterial color={shell} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0, depth / 2]}>
        <boxGeometry args={[width + wall, height + wall, wall]} />
        <meshStandardMaterial
          color={shell}
          roughness={0.2}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

const ANTENNA_SEGMENTS = [0, 1, 2, 3, 4, 5]

function Board() {
  const z = -ENCLOSURE.depth / 2 + 0.012
  return (
    <group position={[0, ENCLOSURE.y, z]}>
      <mesh>
        <boxGeometry args={[0.26, 0.15, 0.006]} />
        <meshStandardMaterial color={PCB_COLOR} roughness={0.6} />
      </mesh>
      <mesh position={[0.05, -0.005, 0.009]}>
        <boxGeometry args={[0.1, 0.07, 0.012]} />
        <meshStandardMaterial
          color={METAL_COLOR}
          metalness={0.8}
          roughness={0.35}
        />
      </mesh>
      {/* The module's printed antenna: a zig-zag of copper runs above the metal can. */}
      {ANTENNA_SEGMENTS.map((segment) => (
        <mesh
          key={`v${segment}`}
          position={[0.01 + segment * 0.016, 0.052, 0.004]}
        >
          <boxGeometry args={[0.003, 0.02, 0.002]} />
          <meshStandardMaterial color={TRACE_COLOR} metalness={0.6} />
        </mesh>
      ))}
      {ANTENNA_SEGMENTS.slice(0, -1).map((segment) => (
        <mesh
          key={`h${segment}`}
          position={[
            0.018 + segment * 0.016,
            segment % 2 === 0 ? 0.062 : 0.042,
            0.004,
          ]}
        >
          <boxGeometry args={[0.019, 0.003, 0.002]} />
          <meshStandardMaterial color={TRACE_COLOR} metalness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// Matches the 2.4 s breathing of the live sparkline dot, so "this is live" reads the same across the app.
const PULSE_PERIOD_S = 2.4

function StatusLed({
  online,
  colors,
  animate,
}: {
  online: boolean
  colors: TokenColors
  animate: boolean
}) {
  const material = React.useRef<THREE.MeshStandardMaterial>(null)
  const color = online ? colors["--board-accent"] : colors["--board-stale"]
  const pulse = online && animate
  useFrame(({ clock }) => {
    if (!material.current) return
    material.current.emissiveIntensity = pulse
      ? 1.1 +
        0.9 * Math.sin((clock.getElapsedTime() * 2 * Math.PI) / PULSE_PERIOD_S)
      : online
        ? 1.2
        : 0.15
  })
  return (
    <mesh position={[-0.09, ENCLOSURE.y + 0.05, -ENCLOSURE.depth / 2 + 0.02]}>
      <sphereGeometry args={[0.012, 20, 20]} />
      <meshStandardMaterial
        ref={material}
        color={color}
        emissive={color}
        emissiveIntensity={online ? 1.2 : 0.15}
      />
    </mesh>
  )
}

function Gland({ x }: { x: number }) {
  return (
    <group position={[x, GLAND_Y, 0]}>
      <mesh position={[0, -0.012, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.024, 20]} />
        <meshStandardMaterial color={PLASTIC_COLOR} roughness={0.7} />
      </mesh>
      {/* Hex nut: a six-sided cylinder. */}
      <mesh position={[0, -0.003, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.01, 6]} />
        <meshStandardMaterial color={PLASTIC_COLOR} roughness={0.6} />
      </mesh>
    </group>
  )
}

function Probe({
  probe,
  x,
  glandX,
  selected,
  onSelect,
  colors,
}: {
  probe: UnitViewProbe
  x: number
  glandX: number
  selected: boolean
  onSelect: (parameter: string) => void
  colors: TokenColors
}) {
  const ringColor = toneColor(probe.tone, colors)
  const isTurbidity = probe.parameter === "turbidity"
  const ringRadius = isTurbidity ? 0.042 : 0.024
  const bodyLength = probe.parameter === "temperature" ? 0.14 : 0.09

  const curve = React.useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(glandX, GLAND_Y - 0.024, 0),
        new THREE.Vector3(glandX, GLAND_Y - 0.08, 0.02),
        new THREE.Vector3((glandX + x) / 2, PROBE_HEAD_Y + 0.12, 0.05),
        new THREE.Vector3(x, PROBE_HEAD_Y + 0.05, 0.02),
        new THREE.Vector3(x, PROBE_HEAD_Y, 0),
      ]),
    [glandX, x]
  )

  const cable =
    probe.tone === "fault"
      ? { color: colors["--board-critical"], opacity: 0.45 }
      : probe.tone === "stale"
        ? { color: colors["--board-stale"], opacity: 0.35 }
        : { color: CABLE_COLOR, opacity: 1 }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    onSelect(probe.parameter)
  }

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 48, 0.005, 8, false]} />
        <meshStandardMaterial
          color={cable.color}
          roughness={0.7}
          transparent={cable.opacity < 1}
          opacity={cable.opacity}
        />
      </mesh>
      <group
        position={[x, PROBE_HEAD_Y, 0]}
        onClick={handleClick}
        onPointerOver={(event) => {
          event.stopPropagation()
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          document.body.style.cursor = ""
        }}
      >
        <ProbeBody parameter={probe.parameter} length={bodyLength} />
        <mesh
          position={[0, -0.012, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={selected ? 1.25 : 1}
        >
          <torusGeometry
            args={[ringRadius, selected ? 0.006 : 0.0035, 12, 40]}
          />
          <meshStandardMaterial
            color={ringColor}
            emissive={ringColor}
            emissiveIntensity={0.5}
          />
        </mesh>
        <Html
          center
          position={[0, -bodyLength - 0.04, 0]}
          distanceFactor={1.2}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            className={cn(
              "rounded bg-board-panel/80 px-1.5 py-0.5 text-center font-sans text-xs whitespace-nowrap text-board-fg",
              selected && "font-semibold"
            )}
          >
            <div>{probe.label}</div>
            <div
              className={cn(
                probe.tone === "fault"
                  ? "text-board-critical"
                  : "text-board-muted"
              )}
            >
              {probe.stateLabel}
            </div>
          </div>
        </Html>
      </group>
    </group>
  )
}

// Probe bodies hang down from the head (y = 0) along -y.
function ProbeBody({
  parameter,
  length,
}: {
  parameter: string
  length: number
}) {
  if (parameter === "temperature")
    return (
      <group>
        <mesh position={[0, -length / 2, 0]}>
          <cylinderGeometry args={[0.008, 0.008, length, 20]} />
          <meshStandardMaterial
            color={METAL_COLOR}
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, -length, 0]}>
          <sphereGeometry args={[0.008, 20, 12]} />
          <meshStandardMaterial
            color={METAL_COLOR}
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
      </group>
    )
  if (parameter === "turbidity")
    return (
      <group>
        <mesh position={[0, -length / 2, 0]}>
          <cylinderGeometry args={[0.03, 0.03, length, 28]} />
          <meshStandardMaterial color={PLASTIC_COLOR} roughness={0.6} />
        </mesh>
        <mesh position={[0, -length * 0.7, 0.03]}>
          <boxGeometry args={[0.022, 0.03, 0.004]} />
          <meshStandardMaterial
            color={WINDOW_COLOR}
            transparent
            opacity={0.55}
            roughness={0.1}
          />
        </mesh>
      </group>
    )
  return (
    <mesh position={[0, -length / 2, 0]}>
      <cylinderGeometry args={[0.014, 0.014, length, 20]} />
      <meshStandardMaterial color={PLASTIC_COLOR} roughness={0.6} />
    </mesh>
  )
}
