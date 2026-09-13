# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this directory.

## Project state

React 19 + TypeScript SPA scaffolded with Vite, Tailwind CSS v4, and shadcn/ui (Base UI-backed variant, not
Radix). Currently just the initial scaffold — `App.tsx`, a `theme-provider`, and one shadcn `button`
component. No routing, data-fetching, or backend integration wired up yet (the backend lives in `../backend`
and is a separate Express/Prisma/Supabase project — see its own `CLAUDE.md`).

**There is no signup page to build.** This is a government system — accounts are invite-only, created by a
super admin through the backend's `/admin/*` routes. The page this frontend does need is an
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

### Conventions to follow when adding code

- New pages/features: colocate under `src/`, follow the existing alias imports (`@/...`) rather than deep
  relative paths (`../../../lib/utils`).
- New UI primitives: prefer `shadcn add <component>` over hand-rolling, to stay consistent with the
  `base-nova` style already in use.
- Keep Prettier/ESLint clean before considering a change done — both are already configured, there's no
  reason to introduce a differently-formatted file.

## Known follow-ups (not yet built)

- No routing library chosen/installed yet.
- No API client or data-fetching setup for talking to `../backend` (which exposes `/auth/login`, `/health`,
  `/health/db`, a protected `/me`, and super-admin-only `/admin/*` routes so far — see `../backend/CLAUDE.md`).
- No accept-invite / set-password page (see "Project state" above) and no admin UI for inviting
  users/managing offices.
