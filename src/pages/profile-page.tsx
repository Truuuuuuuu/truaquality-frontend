import * as React from "react"
import {
  IdCard,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Trash2,
} from "lucide-react"
import { cn } from "cn"
import { ChangePasswordDialog } from "@/components/profile/change-password-dialog"
import { DeleteAccountDialog } from "@/components/profile/delete-account-dialog"
import { RoleBadge, UserStatusBadge } from "@/components/users/user-badges"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { useAuth } from "@/context/auth-context"
import { formatDate } from "@/lib/format-time"
import { initialsFor } from "@/lib/utils"

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

export function ProfilePage() {
  const { profile, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = React.useState(false)

  if (!profile) {
    return (
      <p className="font-sans text-sm text-board-muted">Loading profile…</p>
    )
  }

  // Admin accounts can't be deleted (the backend answers DELETE /me with a 403), so the row is left out
  // of their page entirely rather than shown as a disabled affordance they can never use.
  const canDeleteAccount = profile.systemRole !== "ADMIN"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-sans text-lg font-semibold tracking-tight text-board-fg">
          Profile
        </h1>
        <p className="font-sans text-xs text-board-muted">
          Your account on TruAquality
        </p>
      </div>

      {/* No card: every section sits directly on the page, separated by hairlines. */}
      <div className="flex max-w-2xl flex-col divide-y divide-board-border">
        {/* Identity */}
        <div className="flex items-center gap-4 pb-8">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-board-fg font-heading text-xl font-medium text-board-bg"
            aria-hidden="true"
          >
            {initialsFor(profile.fullName)}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="truncate font-sans text-2xl font-semibold tracking-tight text-board-fg">
              {profile.fullName}
            </span>
            <span className="flex items-center gap-1.5 font-heading text-xs text-board-muted">
              <Mail className="size-3 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <RoleBadge role={profile.systemRole} />
              <UserStatusBadge status={profile.status} />
            </div>
          </div>
        </div>

        {/* Personal information */}
        <section className="flex flex-col gap-5 py-7">
          <SectionHeader
            icon={IdCard}
            label="Personal information"
            aside="Set by your administrator"
          />
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
            <Field label="Full name" value={profile.fullName} />
            <Field label="Email" value={profile.email} mono />
            <Field
              label="Member since"
              value={formatDate(Date.parse(profile.createdAt))}
            />
          </div>
        </section>

        {/* Security */}
        <section className="flex flex-col gap-4 py-7">
          <SectionHeader icon={ShieldCheck} label="Security" />
          <div className="flex flex-col divide-y divide-board-border">
            <SecurityRow
              label="Password"
              description="Change the password you use to sign in to TruAquality."
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setChangePasswordOpen(true)}
              >
                Change password
              </Button>
            </SecurityRow>
            <SecurityRow
              label="This device"
              description="Sign out of TruAquality in this browser."
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={logout}
              >
                <LogOut />
                Sign out
              </Button>
            </SecurityRow>
            {canDeleteAccount ? (
              <SecurityRow
                label="Delete account"
                description="Permanently remove your sign-in and personal details from TruAquality."
              >
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteAccountOpen(true)}
                >
                  <Trash2 />
                  Delete account…
                </Button>
              </SecurityRow>
            ) : null}
          </div>
        </section>

        {/* Appearance */}
        <section className="flex flex-col gap-4 py-7">
          <SectionHeader icon={Palette} label="Appearance" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="font-sans text-sm font-medium text-board-fg">
                Theme
              </span>
              <span className="font-sans text-xs text-board-muted">
                Match your device, or set the board's lighting yourself.
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label="Theme"
              className="inline-flex items-center gap-0.5 rounded-lg border border-board-border-strong bg-board-panel p-0.5"
            >
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon
                const active = theme === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-sans text-xs font-medium transition-colors",
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
          </div>
        </section>
      </div>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
      {canDeleteAccount ? (
        <DeleteAccountDialog
          open={deleteAccountOpen}
          onOpenChange={setDeleteAccountOpen}
        />
      ) : null}
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  label,
  aside,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  aside?: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-board-muted" />
        <h2 className="font-sans text-xs font-medium tracking-[0.08em] text-board-muted uppercase">
          {label}
        </h2>
      </div>
      {aside ? (
        <span className="font-sans text-[0.7rem] text-board-muted">
          {aside}
        </span>
      ) : null}
    </div>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-sans text-[0.7rem] font-medium tracking-[0.06em] text-board-muted uppercase">
        {label}
      </span>
      <span
        className={cn(
          "truncate text-sm text-board-fg",
          mono ? "font-heading" : "font-sans font-medium"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function SecurityRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-0.5">
        <span className="font-sans text-sm font-medium text-board-fg">
          {label}
        </span>
        <span className="font-sans text-xs text-board-muted">
          {description}
        </span>
      </div>
      {children}
    </div>
  )
}
