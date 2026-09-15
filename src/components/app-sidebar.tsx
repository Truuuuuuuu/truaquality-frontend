import { Cpu, Gauge, LogOut, Users, Waves } from "lucide-react"
import { NavLink } from "react-router"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
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

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, logout } = useAuth()
  const navItems =
    profile?.systemRole === "ADMIN"
      ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS]
      : NAV_ITEMS

  return (
    <div className="flex h-full flex-col">
      <div className="board-groove flex flex-col gap-0.5 border-b border-board-border px-5 py-5">
        <span className="font-sans text-sm font-semibold tracking-tight text-board-fg">
          TruAquality
        </span>
        <span className="font-sans text-[0.7rem] font-medium tracking-[0.14em] text-board-muted uppercase">
          Monitoring Station
        </span>
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

      <div className="board-groove flex flex-col gap-3 border-t border-board-border px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-board-fg">
            {profile?.fullName ?? profile?.email}
          </span>
          <span className="truncate text-xs text-board-muted">
            BFAR Sorsogon
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="flex-1 justify-start border-board-border-strong bg-transparent text-board-muted hover:bg-board-panel-raised hover:text-board-fg focus-visible:border-board-accent focus-visible:ring-board-accent/50"
          >
            <LogOut className="size-3.5" />
            Sign out
          </Button>
          <ModeToggle className="size-8 border-board-border-strong bg-transparent text-board-muted hover:bg-board-panel-raised hover:text-board-fg focus-visible:border-board-accent focus-visible:ring-board-accent/50" />
        </div>
      </div>
    </div>
  )
}

export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-board-border bg-board-rail md:block">
      <SidebarContent />
    </aside>
  )
}
