import * as React from "react"
import { Menu, X } from "lucide-react"
import { Outlet } from "react-router"
import { AppSidebar, SidebarContent } from "@/components/app-sidebar"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { NotificationToaster } from "@/components/notifications/notification-toaster"
import { Toaster } from "@/components/ui/sonner"

export function AppShell() {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
  const drawerRef = React.useRef<HTMLDivElement>(null)
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)
  const menuButtonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!isDrawerOpen) return

    closeButtonRef.current?.focus()
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false)
        return
      }
      if (event.key !== "Tab" || !drawerRef.current) return

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    const menuButton = menuButtonRef.current
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", handleKeyDown)
      menuButton?.focus()
    }
  }, [isDrawerOpen])

  return (
    <div className="tq-board-scope flex min-h-svh bg-board-bg text-board-fg">
      <AppSidebar />
      <NotificationToaster />
      <Toaster position="top-right" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-board-border bg-board-bg px-4 py-3 md:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={isDrawerOpen}
            className="-ml-1.5 flex size-9 items-center justify-center rounded-lg text-board-fg hover:bg-board-panel-raised"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-sans text-sm font-semibold tracking-tight">
            TruAquality
          </span>
          <NotificationBell
            className="-mr-1.5 ml-auto"
            side="bottom"
            align="end"
          />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-board-rail shadow-2xl"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute top-4 right-3 flex size-8 items-center justify-center rounded-lg text-board-muted hover:bg-board-panel-raised hover:text-board-fg"
            >
              <X className="size-4" />
            </button>
            <SidebarContent onNavigate={() => setIsDrawerOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
