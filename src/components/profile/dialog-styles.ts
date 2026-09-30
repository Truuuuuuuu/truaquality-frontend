// The shared DialogTitle sets titles in Geist Mono, which the design system reserves for readings and
// numbers; the profile dialogs set theirs in Inter like every other heading on the page.
export const PROFILE_DIALOG_TITLE =
  "font-sans text-base leading-snug font-semibold tracking-tight"

// Footer buttons stack full width on phones (the footer is flex-col-reverse there), so they get a 40px
// touch target; from `sm` they sit side by side at the regular height.
export const PROFILE_DIALOG_BUTTON = "h-10 sm:h-8 sm:min-w-24"
