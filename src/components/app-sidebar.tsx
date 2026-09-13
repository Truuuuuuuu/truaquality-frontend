import { Cpu, Gauge, LogOut, Waves } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/context/auth-context"

const NAV_ITEMS = [
  { label: "Dashboard", icon: Gauge, href: "/", active: true },
  { label: "Ponds", icon: Waves, href: null, active: false },
  { label: "Devices", icon: Cpu, href: null, active: false },
] as const

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, logout } = useAuth()

  return (
    <div className="flex h-full flex-col">
      <div className="board-groove flex flex-col gap-0.5 border-b border-board-border px-5 py-5">
        <span className="font-sans text-sm font-semibold tracking-tight text-board-fg">TruAquality</span>
        <span className="font-sans text-[0.7rem] font-medium tracking-[0.14em] text-board-muted uppercase">
          Monitoring Station
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          if (!item.href) {
            return (
              <div
                key={item.label}
                className="flex cursor-not-allowed items-center justify-between gap-2 rounded-lg px-3 py-2 text-board-muted/50"
                aria-disabled="true"
              >
                <span className="flex items-center gap-2.5 text-sm font-medium">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                <span className="rounded border border-board-border-strong px-1.5 py-0.5 font-heading text-[0.6rem] tracking-wide uppercase">
                  Soon
                </span>
              </div>
            )
          }
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                item.active
                  ? "bg-board-fg text-board-bg font-semibold"
                  : "text-board-muted hover:bg-board-panel-raised hover:text-board-fg"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </a>
          )
        })}
      </nav>

      <div className="board-groove flex flex-col gap-3 border-t border-board-border px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-board-fg">{profile?.fullName ?? profile?.email}</span>
          <span className="truncate text-xs text-board-muted">BFAR Sorsogon</span>
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
