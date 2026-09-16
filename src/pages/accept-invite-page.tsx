import * as React from "react"
import { isAuthError } from "@supabase/supabase-js"
import {
  AuthAlert,
  AuthBackAction,
  AuthDivider,
  AuthPanel,
  AuthPrimaryLink,
  AuthShell,
  AuthSubmit,
  PasswordField,
} from "@/components/auth-shell"
import { supabase } from "@/lib/supabase"

type LinkState = "checking" | "valid" | "invalid"

// `invite` is the link an admin's invite email carries (/accept-invite); `recovery` is the link a
// "Forgot password?" request emails (/reset-password). Both arrive with a Supabase session in the URL and
// end the same way, by setting a password, so one page serves both with its own copy.
type Mode = "invite" | "recovery"

const COPY = {
  invite: {
    title: "Set your password",
    description:
      "Choose a password for your TruAquality account. You'll sign in with it and your email.",
    accountLead: "Choose a password for",
    invalid:
      "This invite link is invalid or has expired. Ask your BFAR Sorsogon administrator to resend your invite.",
    submit: "Set password",
    busy: "Setting password…",
    done: "Your password is set. Sign in with your email and new password.",
  },
  recovery: {
    title: "Set a new password",
    description: "Choose a new password for your TruAquality account.",
    accountLead: "Choose a new password for",
    invalid:
      "This reset link is invalid or has expired. Reset links work once; request a new one to continue.",
    submit: "Update password",
    busy: "Updating password…",
    done: "Your password is updated. Sign in with your new password.",
  },
} satisfies Record<Mode, Record<string, string>>

// Supabase's email links here with the session tokens already in the URL; its client parses them into a
// session on load (no backend round-trip needed for that part — see accept-invite in
// frontend/CLAUDE.md). This page only has to confirm that session exists, then let the user set a
// password with it.
export function AcceptInvitePage({ mode = "invite" }: { mode?: Mode }) {
  const [linkState, setLinkState] = React.useState<LinkState>("checking")
  // The account the link belongs to, shown so staff can confirm whose password they're changing and
  // handed to password managers as the username for the new password.
  const [email, setEmail] = React.useState<string | null>(null)
  const copy = COPY[mode]

  React.useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setLinkState(data.session ? "valid" : "invalid")
      if (data.session?.user.email) setEmail(data.session.user.email)
    })

    // Only ever upgrades to "valid" (catching the session Supabase parses from the URL hash
    // asynchronously after the check above). It must never downgrade back to "invalid" on a null
    // session: SetPasswordForm signs this client out once the password is set, which fires this
    // same listener with session === null, and that sign-out isn't the link becoming invalid.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled || !session) return
        setLinkState("valid")
        if (session.user.email) setEmail(session.user.email)
      }
    )

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthShell>
      {linkState === "checking" ? (
        <AuthPanel title={copy.title}>
          <p role="status" className="text-sm text-board-muted">
            Checking your link…
          </p>
        </AuthPanel>
      ) : linkState === "invalid" ? (
        <AuthPanel title={copy.title}>
          <AuthAlert>{copy.invalid}</AuthAlert>
          <div className="mt-6">
            {mode === "recovery" ? (
              <AuthPrimaryLink to="/login" state={{ view: "reset" }}>
                Request a new link
              </AuthPrimaryLink>
            ) : (
              <AuthPrimaryLink to="/login">Go to sign in</AuthPrimaryLink>
            )}
          </div>
        </AuthPanel>
      ) : (
        <SetPasswordPanel mode={mode} email={email} />
      )}
    </AuthShell>
  )
}

type PasswordError = { field: "password" | "confirm" | "form"; message: string }

// Supabase's own messages ("Auth session missing!") aren't written for staff; name the problem and the fix.
function setPasswordError(err: unknown, mode: Mode): PasswordError {
  if (isAuthError(err)) {
    if (err.code === "same_password") {
      return {
        field: "password",
        message: "Your new password must be different from your current one.",
      }
    }
    if (err.code === "weak_password") {
      return {
        field: "password",
        message:
          "That password is too easy to guess. Use a longer one that isn't a common word or phrase.",
      }
    }
    if (err.status === 429 || err.code === "over_request_rate_limit") {
      return {
        field: "form",
        message: "Too many attempts. Wait a few minutes, then try again.",
      }
    }
    if (
      err.name === "AuthSessionMissingError" ||
      err.code === "session_not_found" ||
      err.code === "session_expired" ||
      err.status === 401 ||
      err.status === 403
    ) {
      return { field: "form", message: COPY[mode].invalid }
    }
  }
  // Only a request that never got an answer is a connection problem; a server rejection is not.
  if (!isAuthError(err) || err.name === "AuthRetryableFetchError") {
    return {
      field: "form",
      message:
        "Can't reach the password service. Check your internet connection and try again.",
    }
  }
  return {
    field: "form",
    message: "The password couldn't be saved. Try again in a moment.",
  }
}

function SetPasswordPanel({
  mode,
  email,
}: {
  mode: Mode
  email: string | null
}) {
  const copy = COPY[mode]
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<PasswordError | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (isSubmitting) return

    if (password.length < 8) {
      setError({
        field: "password",
        message: "Use at least 8 characters for your password.",
      })
      document.getElementById("new-password")?.focus()
      return
    }
    if (password !== confirmPassword) {
      setError({
        field: "confirm",
        message:
          "The passwords don't match. Type the same password in both fields.",
      })
      document.getElementById("confirm-password")?.focus()
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })
      if (updateError) throw updateError
      // This client's session was only ever a means to set the password; the app's own sign-in
      // (used everywhere else) goes through the backend, not Supabase directly.
      await supabase.auth.signOut()
      setDone(true)
    } catch (err) {
      setError(setPasswordError(err, mode))
    } finally {
      setIsSubmitting(false)
    }
  }

  function clearError() {
    if (error) setError(null)
  }

  if (done) {
    return (
      <AuthPanel key="done" title={copy.title} focusOnMount>
        <p role="status" className="text-sm leading-relaxed text-board-fg">
          {copy.done}
        </p>
        <div className="mt-6">
          <AuthPrimaryLink to="/login">Go to sign in</AuthPrimaryLink>
        </div>
      </AuthPanel>
    )
  }

  const errorId = error ? "set-password-error" : undefined

  return (
    <AuthPanel
      title={copy.title}
      description={
        email ? (
          <>
            {copy.accountLead}{" "}
            <span className="font-medium break-words text-board-fg">
              {email}
            </span>
            .
          </>
        ) : (
          copy.description
        )
      }
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        {email ? (
          // Password managers pair a new password with the username field in the same form.
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
        ) : null}
        <PasswordField
          id="new-password"
          label="New password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            clearError()
          }}
          invalid={error?.field === "password" || error?.field === "form"}
          aria-describedby={errorId}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value)
            clearError()
          }}
          invalid={error?.field === "confirm"}
          aria-describedby={errorId}
        />
        {error ? <AuthAlert id={errorId}>{error.message}</AuthAlert> : null}
        <AuthSubmit busy={isSubmitting} busyLabel={copy.busy}>
          {copy.submit}
        </AuthSubmit>
      </form>
      <AuthDivider />
      <AuthBackAction to="/login" />
    </AuthPanel>
  )
}
