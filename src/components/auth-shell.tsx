import * as React from "react"
import {
  ArrowBigUp,
  ArrowLeft,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react"
import { Link } from "react-router"
import { cn } from "cn"
import { ModeToggle } from "@/components/mode-toggle"
import {
  PARAMETER_ICONS,
  PARAMETERS,
  type ParameterConfig,
} from "@/lib/parameters"
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status-styles"

// Shared frame for the signed-out pages (sign in, password reset, accept invite). On wide screens a rail
// introduces the product and the board's color language before anyone reaches the board itself; the
// page's own panel sits on the board ground beside it.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="tq-board-scope min-h-svh bg-board-bg text-board-fg lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <main className="flex min-h-svh flex-col px-4 py-4 sm:px-6 lg:px-10">
        <header className="flex items-center gap-4">
          <Wordmark showOrg className="lg:hidden" />
          <ModeToggle className="ml-auto border-board-border bg-transparent text-board-muted hover:bg-board-panel-raised hover:text-board-fg dark:border-board-border dark:bg-transparent dark:hover:bg-board-panel-raised" />
        </header>
        {/* Top-anchored rather than centered, so an error message growing the panel never shifts the
            fields someone is typing into. */}
        <div className="flex flex-1 items-start justify-center pt-10 pb-14 sm:pt-[max(3.5rem,14vh)]">
          <div
            className="tq-rise flex w-full max-w-[26rem] flex-col gap-10"
            style={delay(120)}
          >
            {children}
            {/* Below lg there is no rail, so the color key follows the panel for staff on phones. */}
            <div className="flex flex-col gap-4 px-1 lg:hidden">
              <p className="text-sm leading-relaxed text-pretty text-board-muted">
                The board flags any reading that leaves its safe range.
              </p>
              <RangeKey />
            </div>
          </div>
        </div>
      </main>

      <aside className="hidden flex-col border-r border-board-border bg-board-rail lg:order-first lg:flex">
        <div className="px-10 pt-9 xl:px-14">
          <Wordmark />
        </div>
        <div className="my-auto px-10 py-12 xl:px-14">
          <div className="flex max-w-[30rem] flex-col gap-10">
            <div className="tq-rise flex flex-col gap-4">
              <h2 className="text-3xl leading-[1.15] font-semibold tracking-[-0.025em] text-balance xl:text-4xl">
                Water quality monitoring for BFAR Sorsogon fishponds
              </h2>
              <p className="max-w-[46ch] text-base leading-relaxed text-pretty text-board-muted">
                A sensor unit at each pond reports temperature, dissolved
                oxygen, and salinity. The board flags any reading that leaves
                its safe range.
              </p>
            </div>
            <RangeKey />
          </div>
        </div>
        {/* The same engraved footer the dashboard sidebar ends with, carrying the fixed org line. */}
        <footer className="board-groove border-t border-board-border px-10 py-5 xl:px-14">
          <p className="text-sm font-medium">BFAR Sorsogon</p>
          <p className="mt-0.5 text-xs text-board-muted">
            Bureau of Fisheries and Aquatic Resources
          </p>
        </footer>
      </aside>
    </div>
  )
}

function delay(ms: number) {
  return { "--tq-delay": `${ms}ms` } as React.CSSProperties
}

// The rail carries the org line in its footer, so only the mobile header repeats it under the name.
function Wordmark({
  showOrg = false,
  className,
}: {
  showOrg?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-sm font-semibold tracking-tight">TruAquality</span>
      {showOrg ? (
        <span className="text-xs text-board-muted">BFAR Sorsogon</span>
      ) : null}
    </div>
  )
}

// The same safe/warning/critical thresholds the board and the backend's alerts use, drawn as one
// segmented bar per parameter, so the colors on the board mean something before anyone signs in.
function RangeKey() {
  return (
    <div className="flex flex-col gap-4">
      <ul
        aria-label="Safe range for each parameter"
        className="board-groove-rows grid grid-cols-[auto_minmax(3rem,1fr)_auto]"
      >
        {PARAMETERS.map((parameter, index) => {
          const Icon = PARAMETER_ICONS[parameter.id]
          return (
            <li
              key={parameter.id}
              className="col-span-3 grid grid-cols-subgrid items-center gap-x-4 py-3.5 sm:gap-x-5"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium">
                {Icon ? (
                  <Icon className="size-4 shrink-0 text-board-muted" />
                ) : null}
                {parameter.label}
              </span>
              <RangeBar
                parameter={parameter}
                style={delay(260 + index * 110)}
              />
              <span className="text-right font-heading text-xs text-board-fg tabular-nums">
                <span className="sr-only">Safe range </span>
                {parameter.safeMin}–{parameter.safeMax} {parameter.unit}
              </span>
            </li>
          )
        })}
      </ul>
      <ul
        aria-label="Status colors"
        className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-board-muted"
      >
        {(["nominal", "warning", "critical"] as const).map((status) => (
          <li key={status} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", STATUS_STYLES[status].led)}
            />
            {STATUS_LABELS[status]}
          </li>
        ))}
      </ul>
    </div>
  )
}

function RangeBar({
  parameter,
  style,
}: {
  parameter: ParameterConfig
  style: React.CSSProperties
}) {
  const { criticalMin, safeMin, safeMax, criticalMax } = parameter
  // Extends past the critical limits so the critical zones read as open-ended bands, not slivers.
  const pad = (criticalMax - criticalMin) * 0.25
  const bands = [
    { size: pad, className: "bg-board-critical/75" },
    { size: safeMin - criticalMin, className: "bg-board-warn/75" },
    { size: safeMax - safeMin, className: "bg-board-accent" },
    { size: criticalMax - safeMax, className: "bg-board-warn/75" },
    { size: pad, className: "bg-board-critical/75" },
  ]

  return (
    <span
      aria-hidden="true"
      className="tq-trace flex h-1.5 gap-[3px]"
      style={style}
    >
      {bands.map((band, index) => (
        <span
          key={index}
          className={cn("rounded-full", band.className)}
          style={{ flex: `${band.size} 1 0%` }}
        />
      ))}
    </span>
  )
}

// The one raised plate on the board ground. The plate itself stays neutral in every state — a failure is
// carried by the named alert and the implicated fields, and progress by the submit button, so the heading
// is a heading and nothing else: no indicator light, no instrument stamp competing with it.
export function AuthPanel({
  title,
  description,
  focusOnMount = false,
  children,
}: {
  title: string
  description?: React.ReactNode
  // Moves focus to the heading on mount, for panels that replace another one after a visitor's action.
  focusOnMount?: boolean
  children: React.ReactNode
}) {
  const headingId = React.useId()
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  React.useEffect(() => {
    if (focusOnMount) headingRef.current?.focus()
  }, [focusOnMount])

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "board-groove rounded-xl border border-board-border bg-board-panel p-5 sm:p-7",
        focusOnMount && "tq-swap"
      )}
    >
      <h1
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl leading-tight font-semibold tracking-[-0.02em] text-balance outline-none"
      >
        {title}
      </h1>
      {description ? (
        <div className="mt-2 text-sm leading-relaxed text-pretty text-board-muted">
          {description}
        </div>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}

// A recessed well in the raised panel: darker than the plate, with an inset shadow and an accent edge on focus.
const INPUT_CLASS =
  "h-11 w-full min-w-0 rounded-lg border border-board-muted/60 bg-board-bg px-3.5 text-base text-board-fg caret-board-accent shadow-[inset_0_1px_2px_oklch(0_0_0/0.14)] transition-[border-color,box-shadow] duration-200 outline-none hover:border-board-muted focus-visible:border-board-accent focus-visible:ring-4 focus-visible:ring-board-accent/20 disabled:opacity-60 aria-invalid:border-board-critical aria-invalid:focus-visible:ring-board-critical/20"

function joinIds(...ids: (string | undefined)[]) {
  return ids.filter(Boolean).join(" ") || undefined
}

type AuthFieldProps = Omit<React.ComponentProps<"input">, "id"> & {
  id: string
  label: string
  hint?: React.ReactNode
  invalid?: boolean
}

export function AuthField({
  id,
  label,
  hint,
  invalid,
  className,
  "aria-describedby": describedBy,
  ...props
}: AuthFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-board-fg">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={joinIds(hintId, describedBy)}
        className={cn(INPUT_CLASS, className)}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-board-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function PasswordField({
  id,
  label,
  hint,
  invalid,
  className,
  onBlur,
  "aria-describedby": describedBy,
  ...props
}: Omit<AuthFieldProps, "type">) {
  const [visible, setVisible] = React.useState(false)
  const [capsLock, setCapsLock] = React.useState(false)
  const hintId = hint ? `${id}-hint` : undefined
  const capsId = `${id}-caps`

  function readCapsLock(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"))
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-board-fg">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={invalid || undefined}
          aria-describedby={joinIds(
            capsLock ? capsId : undefined,
            hintId,
            describedBy
          )}
          className={cn(INPUT_CLASS, "pr-12", className)}
          onKeyDown={readCapsLock}
          onKeyUp={readCapsLock}
          onBlur={(event) => {
            setCapsLock(false)
            onBlur?.(event)
          }}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-1.5 right-1.5 flex w-8 items-center justify-center rounded-md text-board-muted transition-colors hover:bg-board-panel-raised hover:text-board-fg focus-visible:outline-2 focus-visible:-outline-offset-2"
        >
          {visible ? (
            <EyeOff className="size-[1.125rem]" aria-hidden="true" />
          ) : (
            <Eye className="size-[1.125rem]" aria-hidden="true" />
          )}
        </button>
      </div>
      <p
        id={capsId}
        aria-live="polite"
        className={
          capsLock
            ? "flex items-center gap-1.5 text-xs font-medium text-board-warn"
            : "sr-only"
        }
      >
        {capsLock ? (
          <>
            <ArrowBigUp className="size-3.5" aria-hidden="true" />
            Caps Lock is on
          </>
        ) : null}
      </p>
      {hint ? (
        <p id={hintId} className="text-xs text-board-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function AuthAlert({
  id,
  children,
}: {
  id?: string
  children: React.ReactNode
}) {
  return (
    <p
      id={id}
      role="alert"
      className="flex gap-2 text-sm leading-snug text-board-critical"
    >
      <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

// The inverted instrument-white block the sidebar uses for its active item: the board's strongest
// affordance without borrowing a reading-state color.
const PRIMARY_CLASS =
  "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-board-fg px-4 text-sm font-semibold text-board-bg shadow-[inset_0_1px_0_oklch(1_0_0/0.14)] transition-[background-color,translate] duration-150 ease-out outline-offset-2 hover:bg-board-fg/90 focus-visible:outline-2 active:translate-y-px"

export function AuthSubmit({
  busy,
  busyLabel,
  children,
}: {
  busy: boolean
  busyLabel: string
  children: React.ReactNode
}) {
  // aria-disabled rather than disabled, so focus stays on the button while the request runs.
  return (
    <button
      type="submit"
      aria-disabled={busy || undefined}
      className={cn(
        PRIMARY_CLASS,
        "aria-disabled:cursor-progress aria-disabled:bg-board-fg/80"
      )}
    >
      {busy ? (
        <>
          <LoaderCircle
            className="size-4 motion-safe:animate-spin"
            aria-hidden="true"
          />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}

export function AuthPrimaryLink({
  className,
  ...props
}: React.ComponentProps<typeof Link>) {
  return <Link className={cn(PRIMARY_CLASS, className)} {...props} />
}

const TEXT_ACTION_CLASS =
  "rounded-sm text-sm font-medium text-board-muted underline-offset-4 transition-colors hover:text-board-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"

export function AuthTextButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(TEXT_ACTION_CLASS, className)}
      {...props}
    />
  )
}

// "Back to sign in" across every signed-out page: a button when it swaps the panel in place, a link when
// it navigates to /login.
export function AuthBackAction(
  props: { onClick: () => void } | { to: string }
) {
  const className = cn(
    TEXT_ACTION_CLASS,
    "group inline-flex items-center gap-1.5 self-start"
  )
  const content = (
    <>
      <ArrowLeft
        className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
        aria-hidden="true"
      />
      Back to sign in
    </>
  )

  return "to" in props ? (
    <Link to={props.to} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={props.onClick} className={className}>
      {content}
    </button>
  )
}

export function AuthDivider() {
  return <hr className="board-groove my-6 h-0.5 border-0" />
}
