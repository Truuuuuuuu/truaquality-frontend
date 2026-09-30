import * as React from "react"
import { Check, LogOut } from "lucide-react"
import { ChangePasswordDialog } from "@/components/profile/change-password-dialog"
import { DeleteAccountDialog } from "@/components/profile/delete-account-dialog"
import { SignOutDialog } from "@/components/profile/sign-out-dialog"
import { RoleBadge, UserStatusBadge } from "@/components/users/user-badges"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/context/auth-context"
import { formatDate } from "@/lib/format-time"
import { cn } from "@/lib/utils"

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const

// The thumbnails always show the scheme they stand for, whatever theme is active, so they use the two
// palettes' literal board colors (index.css) rather than the theme-switching `board-*` tokens.
const PREVIEW_SCHEMES = {
  light: {
    backdrop: "bg-[oklch(0.91_0.006_258)]",
    window: "bg-[oklch(0.995_0.002_258)] text-[oklch(0.2_0.006_258)]",
  },
  dark: {
    backdrop: "bg-[oklch(0.3_0.012_258)]",
    window: "bg-[oklch(0.15_0.008_258)] text-[oklch(0.93_0.004_258)]",
  },
} as const

// Full-width 40px touch targets on phones; from `sm` they sit at the row's end at one shared width so
// the three actions line up down the right edge.
const ACTION_BUTTON_CLASS = "h-10 w-full sm:h-8 sm:w-auto sm:min-w-36"

export function ProfilePage() {
  const { profile } = useAuth()
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = React.useState(false)
  const [signOutOpen, setSignOutOpen] = React.useState(false)

  if (!profile) {
    return <ProfileSkeleton />
  }

  // Admin accounts can't be deleted (the backend answers DELETE /me with a 403), so the row is left out
  // of their page entirely rather than shown as a disabled affordance they can never use.
  const isAdmin = profile.systemRole === "ADMIN"
  const canDeleteAccount = !isAdmin

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader />

      <div className="flex flex-col divide-y divide-board-border">
        <Section
          title="Personal information"
          description={
            isAdmin
              ? "Set when your account was created."
              : "Set by your administrator. Ask them if something here is wrong."
          }
        >
          <dl className="flex flex-col divide-y divide-board-border">
            <Detail label="Full name">
              <span className="font-medium">{profile.fullName}</span>
            </Detail>
            <Detail label="Email">
              <span className="font-heading text-[0.8125rem] break-all">
                {profile.email}
              </span>
            </Detail>
            <Detail label="Role">
              <RoleBadge role={profile.systemRole} />
            </Detail>
            <Detail label="Status">
              <UserStatusBadge status={profile.status} />
            </Detail>
            <Detail label="Member since">
              <span className="font-heading text-[0.8125rem] tabular-nums">
                {formatDate(Date.parse(profile.createdAt))}
              </span>
            </Detail>
          </dl>
        </Section>

        <Section
          title="Appearance"
          description="How the board is lit on this device."
        >
          <div className="flex flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-sans text-sm font-medium text-board-fg">
                Theme
              </span>
              <span className="max-w-[48ch] font-sans text-xs leading-relaxed text-board-muted">
                System follows your device's light or dark setting.
              </span>
            </div>
            <ThemeControl />
          </div>
        </Section>

        <Section
          title="Sign-in and security"
          description="Your password and your session in this browser."
        >
          <div className="flex flex-col divide-y divide-board-border">
            <SettingRow
              label="Password"
              description="Change the password you use to sign in."
            >
              <Button
                type="button"
                variant="outline"
                className={ACTION_BUTTON_CLASS}
                onClick={() => setChangePasswordOpen(true)}
              >
                Change password
              </Button>
            </SettingRow>
            <SettingRow
              label="Sign out"
              description="End your session in this browser."
            >
              <Button
                type="button"
                variant="outline"
                className={ACTION_BUTTON_CLASS}
                onClick={() => setSignOutOpen(true)}
              >
                <LogOut />
                Sign out
              </Button>
            </SettingRow>
            {canDeleteAccount ? (
              <SettingRow
                label="Delete account"
                description="Permanently removes your sign-in and personal details. This can't be undone."
              >
                <Button
                  type="button"
                  variant="destructive"
                  className={ACTION_BUTTON_CLASS}
                  onClick={() => setDeleteAccountOpen(true)}
                >
                  Delete account
                </Button>
              </SettingRow>
            ) : null}
          </div>
        </Section>
      </div>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
      {canDeleteAccount ? (
        <DeleteAccountDialog
          open={deleteAccountOpen}
          onOpenChange={setDeleteAccountOpen}
        />
      ) : null}
    </div>
  )
}

function PageHeader() {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
        Profile
      </h1>
      <p className="font-sans text-xs text-board-muted">
        Your account on TruAquality
      </p>
    </div>
  )
}

// A radio group, so it follows the WAI-ARIA radio pattern: one tab stop on the checked option, and the
// arrow keys move the selection (and focus) through the options, wrapping at either end.
function ThemeControl() {
  const { theme, setTheme } = useTheme()
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0
    if (step === 0) return
    event.preventDefault()
    const next = (index + step + THEME_OPTIONS.length) % THEME_OPTIONS.length
    setTheme(THEME_OPTIONS[next].value)
    optionRefs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid w-full max-w-md grid-cols-3 gap-3"
    >
      {THEME_OPTIONS.map((option, index) => {
        const active = theme === option.value
        return (
          <button
            key={option.value}
            ref={(element) => {
              optionRefs.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => setTheme(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className="group flex flex-col gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-4 focus-visible:ring-offset-board-bg"
          >
            <span
              className={cn(
                "relative block aspect-[16/10] overflow-hidden rounded-lg border transition-[border-color,box-shadow] group-active:translate-y-px",
                active
                  ? "border-board-fg ring-2 ring-board-fg"
                  : "border-board-border-strong group-hover:border-board-muted"
              )}
            >
              {option.value === "system" ? (
                <>
                  <ThemePreview
                    scheme="dark"
                    className="inset-y-0 left-0 w-1/2"
                  />
                  <ThemePreview
                    scheme="light"
                    className="inset-y-0 right-0 w-1/2"
                  />
                </>
              ) : (
                <ThemePreview scheme={option.value} className="inset-0" />
              )}
              {active ? (
                <span className="absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full bg-board-fg text-board-bg shadow-sm">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "font-sans text-sm transition-colors",
                active
                  ? "font-medium text-board-fg"
                  : "text-board-muted group-hover:text-board-fg"
              )}
            >
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// A backdrop with an app window tucked into its lower-right corner, the window showing a type sample.
function ThemePreview({
  scheme,
  className,
}: {
  scheme: keyof typeof PREVIEW_SCHEMES
  className: string
}) {
  const colors = PREVIEW_SCHEMES[scheme]
  return (
    <span
      aria-hidden="true"
      className={cn("absolute block", colors.backdrop, className)}
    >
      <span
        className={cn(
          "absolute top-[28%] right-0 bottom-0 left-[22%] rounded-tl-md px-2 pt-1.5 font-sans text-xs font-semibold",
          colors.window
        )}
      >
        Aa
      </span>
    </span>
  )
}

// Below `lg` the heading sits above its content; from `lg` it moves into a left column, so a wide
// screen reads as a settings sheet instead of one narrow column with empty space beside it.
function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="grid grid-cols-1 gap-4 py-7 first:pt-0 last:pb-0 lg:grid-cols-[15rem_1fr] lg:gap-10 lg:py-9">
      <div className="flex flex-col gap-1">
        <h2 className="font-sans text-sm font-semibold text-board-fg">
          {title}
        </h2>
        <p className="max-w-[40ch] font-sans text-xs leading-relaxed text-board-muted">
          {description}
        </p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-4">
      <dt className="font-sans text-xs text-board-muted">{label}</dt>
      <dd className="min-w-0 font-sans text-sm text-board-fg">{children}</dd>
    </div>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-sans text-sm font-medium text-board-fg">
          {label}
        </span>
        <span className="max-w-[48ch] font-sans text-xs leading-relaxed text-board-muted">
          {description}
        </span>
      </div>
      {children}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div
      className="flex max-w-4xl flex-col gap-6"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <PageHeader />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_1fr] lg:gap-10">
        <Skeleton className="h-4 w-40" />
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-5" />
          ))}
        </div>
      </div>
    </div>
  )
}
