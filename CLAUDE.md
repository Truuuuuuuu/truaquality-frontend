# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this directory.

## Project state

React 19 + TypeScript SPA built with Vite, Tailwind CSS v4, and shadcn/ui (Base UI-backed variant, not
Radix). It talks to `../backend` (a separate Express/Prisma/Supabase project — see its own `CLAUDE.md`).

The system monitors **multiple fishponds**. Each pond has at most one ESP32 sensor device, and each device
reports its own readings. Routes (`src/App.tsx`, all behind `ProtectedRoute` → `AppShell` except the signed-out
pages `/login`, `/accept-invite`, and `/reset-password`, which share `AuthShell` in `src/components/auth-shell.tsx`):
- `/login` — sign in, plus an in-place "Forgot password?" view that calls `supabase.auth.resetPasswordForEmail`
  with `redirectTo: <origin>/reset-password`. "Keep me signed in" stores the session in localStorage;
  unchecked, it lives in the tab's sessionStorage (`src/lib/session.ts`).
- `/` — operations board: one `PondCard` per active pond, worst condition first.
- `/ponds` — pond registry table; admins add, rename, and archive ponds.
- `/ponds/:pondId` — one pond's device info, a `ParameterTile` (value + 2 h sparkline) per parameter, then a
  History section whose header holds the range picker and Export, over stacked per-parameter history charts
  (`PondHistoryCharts`: real units, safe/warning/critical zones, severity-colored line, one shared crosshair),
  then the read-only reading-history table with its own Filter. The dashboard's selected pond shows the same
  charts in compact form on the fixed 2 h window.
- `/devices` — device registry; admins register units, assign them to ponds, disable them, and rotate their
  secrets. Registering or rotating shows the unit's `DEVICE_ID`/`DEVICE_SECRET` once, for the admin to
  enter on the unit's field setup portal (see `firmware/CLAUDE.md`'s "Field provisioning" — there's no
  reflash). Units publish over MQTT to the broker, never to this app or its API.
- `/devices/:deviceId` — one unit's detail page (linked from each serial on `/devices` and from "View details"
  in the pond header's device disclosure): a status readout, then a **Unit view** (3D model of the unit beside
  a **Sensors** list), **Health** and **Event log** sections, then Assignment, Connection, Hardware, and
  Registration panels; admins get the same Manage dialog. There's no `GET /devices/:id`; the page reads the
  device out of the cached `useDevices()` list. Diagnostics come from `GET /devices/:id/diagnostics` via
  `useDeviceDiagnostics` (key `["devices", id, "diagnostics"]`, so admin device mutations refresh it; 30 s
  poll).
  - The 3D model is lazy: `device-unit-view.tsx` `React.lazy`-imports `device-model-3d.tsx`, which is the only
    file that touches three.js / `@react-three/*`. **Never import `device-model-3d` statically** or three.js
    lands in the main bundle. Without WebGL, while loading, or on a render error it shows the SVG
    `device-schematic.tsx` instead.
  - `src/lib/device-health.ts` is the single home for plain-language meaning: sensor status tokens → label /
    tone / on-site action (with an inferred fallback for pre-0.6.0 firmware that sends no status), restart
    reasons, signal quality, derived maintenance flags, and event wording. `REPORT_INTERVAL_S` mirrors the
    firmware's default report interval and only estimates the 24 h completeness bar — it never judges a
    reading.
- `/notifications` — the signed-in user's alert notifications (all / unread, "load more"). The same feed also
  drives the bell (sidebar header on desktop, top bar on mobile) and toasts.
- `/audit` — admin-only (same in-page `<Navigate>` guard as `/users`): the `AuditLog` trail of every admin
  change, cursor-paginated with "Load older activity" and filterable by area and action. Server-side
  filtering, and no polling — it's an append-only history someone reads deliberately.
- `/profile` — the signed-in user's details, theme, **change password**, and **delete account**. Both
  dialogs are reauthentication-gated: the user re-enters their current password before anything happens.
  - `ChangePasswordDialog` verifies by calling `signInWithPassword` on a throwaway Supabase client
    (`createAuthActionClient`) and then runs `updateUser` with the fresh session that returns, so the update
    never rides the app's own long-lived token. Because that strands anyone who has forgotten their current
    password, the dialog also offers "Forgot your current password?", which sends the same reset email the
    sign-in page does. Note the gate is client-side; enable Supabase's "Secure password change" setting to
    have the server enforce it too.
  - `DeleteAccountDialog` posts the password to the backend, which verifies it and anonymizes the account
    (`DELETE /me`), then the app signs out. Admin accounts can't be deleted — the backend answers 403 — so
    the row is not rendered for them at all.

**Scope: BFAR Sorsogon only.** The app serves a single organization, so there's no office/region picker or
per-office labeling — the org name is shown as the fixed text "BFAR Sorsogon".

**There is no signup page to build.** This is a government system — accounts are invite-only, created by an
admin through the backend's `/admin/*` routes. The page this frontend does need is an
**accept-invite / set-password** page: the user clicks the link Supabase emails them, lands here, and calls
`supabase.auth.updateUser({ password })` to set their password (their session comes from the invite link
itself). Its route must match `INVITE_REDIRECT_URL` in `backend/.env` and be in Supabase's allowed redirect
URLs. The same page, mounted at `/reset-password` with `mode="recovery"`, handles password-reset links, so
`<origin>/reset-password` must be an allowed redirect URL too.

## Commands

- Dev server: `npm run dev`
- Build: `npm run build` (`tsc -b && vite build`)
- Typecheck only: `npm run typecheck` (`tsc -b` — it must stay in build mode. Plain `tsc --noEmit` runs
  against the root `tsconfig.json`, which has `"files": []` and only project references, so it checks
  **zero** files and always exits 0. That false green is how three React 19 `useRef` type errors sat in
  `auth-context.tsx` long enough to break `npm run build`.)
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
- `src/lib/parameters.ts` — `PARAMETERS` (**display metadata only**: label, unit, precision), `statusFor`,
  and `STALE_AFTER_MS` (5 min). Parameter ids must match the backend's `PARAMETER_BOUNDS`. Status is computed
  here — stale beats range checks — but the *ranges* are not: they depend on a pond's `pondType`, so the
  server resolves them and sends `pond.thresholds` alongside `pond.latest`. Pass that band into
  `statusFor`/`severityFor`; never hardcode one.
  - `SIGNED_OUT_THRESHOLDS` is the single exception: illustrative bands for the range key on the signed-out
    auth pages, which have no pond to ask and no token to ask with. Nothing that judges a real reading may
    use it.
- `src/lib/pond-status.ts` — derives a pond's per-parameter readings and overall (worst) status from the
  `latest` map the API returns. `src/lib/status-styles.ts` — shared status colors/labels for tiles, cards, and
  `StatusBadge`.
- **Notifications** are raised by the backend when a reading goes out of range (see `backend/CLAUDE.md`,
  "Alerts and notifications") or a device goes offline/recovers (`backend/CLAUDE.md`, "Device-offline
  watchdog") — the frontend never decides what's abnormal for them, it just renders what the server sends.
  `AppNotification` (`src/lib/api.ts`) carries exactly one of `alert`/`device`, matching which kind it is;
  `src/lib/notifications.ts`'s `notificationPond()` reads the right one's pond, and `describeNotification()`
  branches on `kind` to build a title/reading/status either way. `src/hooks/use-notifications.ts` polls
  every 15 s: `useNotificationFeed` (newest 20 + `unreadCount`) is shared by `NotificationBell` and
  `NotificationToaster` (in `AppShell`), which toasts only notifications that appear *after* the first load, so
  sign-in shows backlog in the bell rather than a burst of toasts. Toasts use sonner
  (`src/components/ui/sonner.tsx`, adapted to read this app's `ThemeProvider` instead of `next-themes`).
- Admin-only UI is hidden when `profile.systemRole !== "ADMIN"`; the backend enforces it regardless.

### Conventions to follow when adding code

- New pages/features: colocate under `src/`, follow the existing alias imports (`@/...`) rather than deep
  relative paths (`../../../lib/utils`).
- New UI primitives: prefer `shadcn add <component>` over hand-rolling, to stay consistent with the
  `base-nova` style already in use.
- Keep Prettier/ESLint clean before considering a change done — both are already configured, there's no
  reason to introduce a differently-formatted file.

## Known follow-ups (not yet built)

- **`authorizedRequest` doesn't de-duplicate refreshes.** Six polling queries can 401 in the same tick and
  each fire `POST /auth/refresh` with the same token; Supabase rotates refresh tokens on use, so the losers
  of that race get a 400 and sign the user out. Sharing one in-flight promise would fix it.
- **A disabled user is never signed out.** `requireAuth` answers **403** for `DISABLED`/`DELETED`, but
  `authorizedRequest` only reacts to 401, so they sit on an error panel still apparently signed in.
- No React error boundary (a render-time throw blanks the app), no catch-all 404 route, no `.env.example`.
- No tests anywhere in this project.
