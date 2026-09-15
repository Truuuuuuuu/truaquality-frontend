# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this directory.

## Project state

React 19 + TypeScript SPA built with Vite, Tailwind CSS v4, and shadcn/ui (Base UI-backed variant, not
Radix). It talks to `../backend` (a separate Express/Prisma/Supabase project — see its own `CLAUDE.md`).

The system monitors **multiple fishponds**. Each pond has at most one ESP32 sensor device, and each device
reports its own readings. Routes (`src/App.tsx`, all behind `ProtectedRoute` → `AppShell` except `/login`):
- `/` — operations board: one `PondCard` per active pond, worst condition first.
- `/ponds` — pond registry table; admins add, rename, and archive ponds.
- `/ponds/:pondId` — one pond's device info, a `ParameterTile` (value + 2 h trend) per parameter, and a
  read-only table of raw readings for the same 2 h window.
- `/devices` — device registry; admins register units, assign them to ponds, disable them, and rotate their
  secrets. Registering or rotating shows the unit's `DEVICE_ID`/`DEVICE_SECRET` once, for a technician to
  enter on the unit's field setup portal (see `firmware/CLAUDE.md`'s "Field provisioning" — there's no
  reflash). Units publish over MQTT to the broker, never to this app or its API.
- `/notifications` — the signed-in user's alert notifications (all / unread, "load more"). The same feed also
  drives the bell (sidebar header on desktop, top bar on mobile) and toasts.
- `/profile` — the signed-in user's details, theme, change password, and **delete account**
  (`DeleteAccountDialog`): staff re-enter their password, the backend verifies it and anonymizes the account
  (`DELETE /me`), then the app signs out. Admin accounts can't be deleted, so admins see a lock note instead.

**Scope: BFAR Sorsogon only.** The app serves a single organization, so there's no office/region picker or
per-office labeling — the org name is shown as the fixed text "BFAR Sorsogon".

**There is no signup page to build.** This is a government system — accounts are invite-only, created by an
admin through the backend's `/admin/*` routes. The page this frontend does need is an
**accept-invite / set-password** page: the user clicks the link Supabase emails them, lands here, and calls
`supabase.auth.updateUser({ password })` to set their password (their session comes from the invite link
itself). Its route must match `INVITE_REDIRECT_URL` in `backend/.env` and be in Supabase's allowed redirect
URLs.

## Commands

- Dev server: `npm run dev`
- Build: `npm run build` (`tsc -b && vite build`)
- Typecheck only: `npm run typecheck`
- Lint: `npm run lint`
- Format: `npm run format` (Prettier, with `prettier-plugin-tailwindcss` for class sorting)
- Preview a production build: `npm run preview`

## Architecture

### Tooling

- **Vite** (`vite.config.ts`) — `@vitejs/plugin-react` + `@tailwindcss/vite`. Path alias `@` → `./src`.
- **TypeScript** — project-references split: `tsconfig.json` is the root pointing at `tsconfig.app.json`
  (app source) and `tsconfig.node.json` (Vite config itself).
- **ESLint** flat config (`eslint.config.js`) — `typescript-eslint` recommended + `react-hooks` +
  `react-refresh` (Vite-specific fast-refresh rule).
- **Prettier** (`.prettierrc`) — no semicolons, double quotes, 80-char width, Tailwind class sorting via
  `prettier-plugin-tailwindcss` (configured to also sort classes inside `cn()`/`cva()` calls).

### Styling & components

- **Tailwind CSS v4** — configured via the Vite plugin, not a `tailwind.config.js` (v4 is CSS-first
  config, living in `src/index.css`).
- **shadcn/ui** (`components.json`) — style `base-nova` (Base UI primitives, not Radix), base color `zinc`,
  CSS variables for theming, icon library `lucide-react`. Add new components with the `shadcn` CLI rather
  than hand-writing primitives from scratch, so they land in `src/components/ui/` and follow the same
  aliasing (`@/components`, `@/components/ui`, `@/lib`, `@/hooks`) already set up in `components.json`.
- `src/lib/utils.ts` — the shadcn `cn()` helper (class-variance-authority + tailwind-merge style class
  combination). Use it instead of manual string concatenation for conditional classes.
- `src/components/theme-provider.tsx` — light/dark theme context; wrap new top-level UI in it rather than
  reimplementing theme state.
- Fonts are self-hosted via `@fontsource-variable/*` packages (Inter, Geist Mono), not a Google Fonts CDN
  link.

### Data

- `src/lib/api.ts` — typed `fetch` wrapper and one function per backend endpoint, each taking the access
  token first. Call them through `useAuth().authorizedRequest` (`src/context/auth-context.tsx`), which
  refreshes and retries once on a 401.
- **TanStack Query** (`QueryClientProvider` in `src/main.tsx`) — `src/hooks/use-ponds.ts` holds every pond,
  reading, and device query and mutation. Queries poll every 30 s (there's no push channel); mutations
  invalidate both `["ponds"]` and `["devices"]` because each list embeds the other. The cache is cleared on
  sign-out (`ClearQueryCacheOnSignOut` in `App.tsx`). `src/hooks/use-notifications.ts` polls faster, every
  15 s, since that's how a new alert reaches someone (see "Notifications" below).
- `src/lib/parameters.ts` — `PARAMETERS` (display labels, units, safe/critical ranges), `statusFor`, and
  `STALE_AFTER_MS` (5 min). Parameter ids must match the backend's `PARAMETER_BOUNDS`, and the safe/critical
  ranges must match its `PARAMETER_THRESHOLDS` (which raise alerts); add a new parameter in both places.
  Status is computed client-side: stale beats range checks.
- `src/lib/pond-status.ts` — derives a pond's per-parameter readings and overall (worst) status from the
  `latest` map the API returns. `src/lib/status-styles.ts` — shared status colors/labels for tiles, cards, and
  `StatusBadge`.
- **Notifications** are raised by the backend when readings go out of range (see `backend/CLAUDE.md`, "Alerts
  and notifications") — the frontend never decides what's abnormal for them. `src/hooks/use-notifications.ts`
  polls every 15 s: `useNotificationFeed` (newest 20 + `unreadCount`) is shared by `NotificationBell` and
  `NotificationToaster` (in `AppShell`), which toasts only notifications that appear *after* the first load, so
  sign-in shows backlog in the bell rather than a burst of toasts. `src/lib/notifications.ts` turns one into a
  title/reading/status. Toasts use sonner (`src/components/ui/sonner.tsx`, adapted to read this app's
  `ThemeProvider` instead of `next-themes`).
- Admin-only UI is hidden when `profile.systemRole !== "ADMIN"`; the backend enforces it regardless.

### Conventions to follow when adding code

- New pages/features: colocate under `src/`, follow the existing alias imports (`@/...`) rather than deep
  relative paths (`../../../lib/utils`).
- New UI primitives: prefer `shadcn add <component>` over hand-rolling, to stay consistent with the
  `base-nova` style already in use.
- Keep Prettier/ESLint clean before considering a change done — both are already configured, there's no
  reason to introduce a differently-formatted file.

## Known follow-ups (not yet built)

- No history range picker on the pond detail page (fixed 2 h window).
- No accept-invite / set-password page (see "Project state" above) and no admin UI for inviting and
  enabling/disabling users.
