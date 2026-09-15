import { ChevronRight, Cpu, Gauge, Users, Waves } from "lucide-react"
import { NavLink } from "react-router"
import { cn } from "cn"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useAuth } from "@/context/auth-context"

const NAV_ITEMS = [
  { label: "Dashboard", icon: Gauge, href: "/" },
  { label: "Ponds", icon: Waves, href: "/ponds" },
  { label: "Devices", icon: Cpu, href: "/devices" },
] as const

// PII-bearing, so unlike the items above it's hidden from non-admins rather than shown read-only.
const ADMIN_NAV_ITEMS = [
  { label: "Users", icon: Users, href: "/users" },
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
        className="flex flex-1 flex-col gap-1 px-3 py-4"
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
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-board-fg font-semibold text-board-bg"
                    : "text-board-muted hover:bg-board-panel-raised hover:text-board-fg"
                )
              }
            >
              <Icon className="size-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="board-groove border-t border-board-border px-5 py-4">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors",
              isActive ? "bg-board-panel-raised" : "hover:bg-board-panel-raised"
            )
          }
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-board-fg">
              {profile?.fullName ?? profile?.email}
            </span>
            <span className="truncate text-xs text-board-muted">
              BFAR Sorsogon
            </span>
          </span>
          <ChevronRight className="size-3.5 shrink-0 text-board-muted" />
        </NavLink>
      </div>
    </div>
  )
}

export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-board-border bg-board-rail md:block">
      <SidebarContent showNotificationBell />
    </aside>
  )
}
