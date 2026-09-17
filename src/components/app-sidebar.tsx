import { Cpu, Gauge, ScrollText, Users, Waves } from "lucide-react"
import { NavLink } from "react-router"
import { cn } from "cn"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useAuth } from "@/context/auth-context"
import { initialsFor } from "@/lib/utils"

const NAV_ITEMS = [
  { label: "Dashboard", icon: Gauge, href: "/" },
  { label: "Ponds", icon: Waves, href: "/ponds" },
  { label: "Devices", icon: Cpu, href: "/devices" },
] as const

// PII-bearing, so unlike the items above these are hidden from non-admins rather than shown read-only.
const ADMIN_NAV_ITEMS = [
  { label: "Users", icon: Users, href: "/users" },
  { label: "Audit log", icon: ScrollText, href: "/audit" },
] as const

export function SidebarContent({
  onNavigate,
  showNotificationBell = false,
}: {
  onNavigate?: () => void
  // The mobile drawer leaves it out: the mobile header already has a bell.
  showNotificationBell?: boolean
}) {
  const { profile } = useAuth()
  const navItems =
    profile?.systemRole === "ADMIN"
      ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS]
      : NAV_ITEMS

  return (
    <div className="flex h-full flex-col">
      <div className="board-groove flex items-start justify-between gap-2 border-b border-board-border px-5 py-5">
        <div className="flex flex-col gap-0.5">
          <span className="font-sans text-sm font-semibold tracking-tight text-board-fg">
            TruAquality
          </span>
          <span className="font-sans text-[0.7rem] font-medium tracking-[0.14em] text-board-muted uppercase">
            Monitoring Station
          </span>
        </div>
        {showNotificationBell ? (
          <NotificationBell
            className="-mt-1 -mr-2"
            side="right"
            align="start"
          />
        ) : null}
      </div>

      <nav
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
        aria-label="Primary"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.label}
              to={item.href}
              end={item.href === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-sans text-xs font-medium tracking-[0.08em] uppercase transition-colors",
                  isActive
                    ? "bg-board-fg font-semibold text-board-bg"
                    : "text-board-muted hover:bg-board-panel-raised hover:text-board-fg"
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <NavLink
        to="/profile"
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "board-groove flex items-center gap-3 border-t border-board-border px-5 py-4 transition-colors",
            isActive ? "bg-board-panel-raised" : "hover:bg-board-panel-raised"
          )
        }
      >
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-board-fg font-heading text-xs font-medium text-board-bg"
          aria-hidden="true"
        >
          {profile ? initialsFor(profile.fullName) : "?"}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-sans text-sm font-medium text-board-fg">
            {profile?.fullName ?? profile?.email}
          </span>
          <span className="truncate font-heading text-[0.65rem] tracking-[0.02em] text-board-muted">
            {profile?.systemRole === "ADMIN" ? "Admin" : "Staff"} · BFAR
            Sorsogon
          </span>
        </span>
      </NavLink>
    </div>
  )
}

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 border-r border-board-border bg-board-rail md:block">
      <SidebarContent showNotificationBell />
    </aside>
  )
}
