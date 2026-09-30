import * as React from "react"
import { LogOut, Monitor, Moon, Sun } from "lucide-react"
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
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

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
          <SettingRow
            label="Theme"
            description="System follows your device's light or dark setting."
          >
            <ThemeControl />
          </SettingRow>
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
      className="grid w-full grid-cols-3 gap-0.5 rounded-lg border border-board-border-strong bg-board-panel p-0.5 sm:inline-grid sm:w-auto"
    >
      {THEME_OPTIONS.map((option, index) => {
        const Icon = option.icon
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
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-md px-3 font-sans text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:translate-y-px sm:h-7",
              active
                ? "bg-board-fg text-board-bg"
                : "text-board-muted hover:bg-board-panel-raised hover:text-board-fg"
            )}
          >
            <Icon className="size-3.5" />
            {option.label}
          </button>
        )
      })}
    </div>
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
