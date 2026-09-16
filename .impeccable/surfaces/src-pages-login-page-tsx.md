---
version: 1
slug: "src-pages-login-page-tsx"
primary_target: "src/pages/login-page.tsx"
related_targets: ["src/components/auth-shell.tsx","src/pages/accept-invite-page.tsx"]
---

## Scope & mode

Primary target: `frontend/src/pages/login-page.tsx` (route `/login`), with the shared `AuthShell`
(`src/components/auth-shell.tsx`) that `accept-invite-page.tsx` (`/accept-invite`, `/reset-password`) also
lives inside. Mode: **Operate**. Visitor: invited BFAR Sorsogon staff signing in, often on a phone in the field.

## Audience, job, task, proof, constraints

Job: get into the monitoring board quickly and recover a forgotten password without an admin. Contents
(confirmed with user): email, password (show/hide, Caps Lock hint), "Keep me signed in" (real:
localStorage vs sessionStorage), "Forgot password?" (real: Supabase reset email → `/reset-password`),
primary CTA, divider, invite-only note. No sign-up link and no social login: accounts are admin-issued and
sign-in goes through the backend. No fabricated readings on an unauthenticated page. WCAG 2.1 AA.

## Direction contract

**THESIS:** Sign-in is the station's access panel, the doorway into the same control room, not a floating
SaaS card on a gradient wash. It refuses the centered-card-on-blurred-gradient login default.

**OWN-WORLD:** Inherited SCADA board tokens. A flat rail-graphite plane (no texture, per DESIGN.md's retired
grid) carries the product, a key to the board's color language, and a groove-topped org footer like the
dashboard sidebar's; the form is the one raised panel plate on the board ground. Inverted
instrument-white CTA (the active-nav block). Geist Mono only for real measurements and time. Engraved
grooves, no drop shadows.

**STORY:** Staff recognize TruAquality and BFAR Sorsogon, learn what green/amber/red mean before they reach
the board, sign in; a failure marks the implicated fields red and names the fix; a forgotten password is reset in place.

**FIRST VIEWPORT:** ≥1024px: left 5/12 rail: wordmark top; headline + one sentence; three parameter rows,
each with its real safe/warning/critical range bar and mono safe range; status key; org line bottom. Right
7/12: theme toggle top-right; a 26rem panel top-anchored (so errors never shift fields): heading on its own
line (no LED, no station-time stamp), fields, CTA, groove divider, invite note. <1024px: wordmark row + toggle, panel, then
a compact range key below the panel (no rail), so field staff on phones still learn the color language.

**FORM:** Surface extension inside the established SCADA world (DESIGN.md). Precisely specified request with
the world confirmed by the user, so no concept-seed round and no seed key. Signature moment: range bars
trace in left-to-right on load while the panel rises. The panel itself reports nothing ornamentally: progress
is the submit button's spinner and label, failure is red field borders plus the named alert, and the plate
stays neutral throughout.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict,
DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

- Supabase must allow `<origin>/reset-password` as a redirect URL, and reset emails need custom SMTP for
  real volume.
