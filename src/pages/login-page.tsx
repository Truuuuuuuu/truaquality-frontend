import * as React from "react"
import { isAuthError } from "@supabase/supabase-js"
import { Navigate, useLocation } from "react-router"
import {
  AuthAlert,
  AuthBackAction,
  AuthDivider,
  AuthField,
  AuthPanel,
  AuthShell,
  AuthSubmit,
  AuthTextButton,
  PasswordField,
} from "@/components/auth-shell"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/context/auth-context"
import { ApiError } from "@/lib/api"
import { supabase } from "@/lib/supabase"

type View = "sign-in" | "reset"

// `from` is set by ProtectedRoute; `view` lets another page (an expired reset link) open the reset panel.
type LoginLocationState = { from?: string; view?: View } | null

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const { session, isLoading } = useAuth()
  const location = useLocation()
  const locationState = location.state as LoginLocationState

  const [view, setView] = React.useState<View>(locationState?.view ?? "sign-in")
  // Focus follows a view switch the visitor made, never the first load.
  const [hasSwitched, setHasSwitched] = React.useState(false)
  // Shared by both views, so an email typed before "Forgot password?" carries over.
  const [email, setEmail] = React.useState("")

  if (!isLoading && session) {
    return <Navigate to={locationState?.from ?? "/"} replace />
  }

  function switchTo(next: View) {
    setView(next)
    setHasSwitched(true)
  }

  return (
    <AuthShell>
      {view === "sign-in" ? (
        <SignInPanel
          email={email}
          onEmailChange={setEmail}
          onForgotPassword={() => switchTo("reset")}
          focusOnMount={hasSwitched}
        />
      ) : (
        <ResetPanel
          email={email}
          onEmailChange={setEmail}
          onBack={() => switchTo("sign-in")}
          focusOnMount={hasSwitched}
        />
      )}
    </AuthShell>
  )
}

type PanelProps = {
  email: string
  onEmailChange: (email: string) => void
  focusOnMount: boolean
}

type SignInError = { field: "email" | "password" | "form"; message: string }

function SignInPanel({
  email,
  onEmailChange,
  onForgotPassword,
  focusOnMount,
}: PanelProps & { onForgotPassword: () => void }) {
  const { login } = useAuth()
  const [password, setPassword] = React.useState("")
  const [remember, setRemember] = React.useState(false)
  const [error, setError] = React.useState<SignInError | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (isSubmitting) return

    const trimmedEmail = email.trim()
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError({
        field: "email",
        message: trimmedEmail
          ? "Enter an email address like name@example.com."
          : "Enter the email address for your account.",
      })
      document.getElementById("email")?.focus()
      return
    }
    if (!password) {
      setError({ field: "password", message: "Enter your password." })
      document.getElementById("password")?.focus()
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      // On success the new session re-renders LoginPage into its redirect.
      await login(trimmedEmail, password, remember)
    } catch (err) {
      setError({ field: "form", message: signInErrorMessage(err) })
    } finally {
      setIsSubmitting(false)
    }
  }

  // The error marks recede as soon as the visitor starts fixing the problem.
  function clearError() {
    if (error) setError(null)
  }

  const errorId = error ? "sign-in-error" : undefined

  return (
    <AuthPanel
      title="Sign in"
      description="Use the email address your invite was sent to."
      focusOnMount={focusOnMount}
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => {
            onEmailChange(event.target.value)
            clearError()
          }}
          invalid={error?.field === "email" || error?.field === "form"}
          aria-describedby={errorId}
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            clearError()
          }}
          invalid={error?.field === "password" || error?.field === "form"}
          aria-describedby={errorId}
        />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-board-fg select-none">
            <Checkbox
              checked={remember}
              onCheckedChange={(checked) => setRemember(checked)}
              className="size-[1.125rem] rounded-[5px] border-board-muted bg-board-bg transition-[background-color,border-color] duration-150 hover:border-board-fg focus-visible:border-board-accent focus-visible:ring-board-accent/25 dark:bg-board-bg data-checked:border-board-fg data-checked:bg-board-fg data-checked:text-board-bg dark:data-checked:bg-board-fg"
            />
            Keep me signed in
          </label>
          <AuthTextButton onClick={onForgotPassword}>
            Forgot password?
          </AuthTextButton>
        </div>

        {error ? <AuthAlert id={errorId}>{error.message}</AuthAlert> : null}

        <AuthSubmit busy={isSubmitting} busyLabel="Signing in…">
          Sign in
        </AuthSubmit>
      </form>

      <AuthDivider />

      <p className="text-sm leading-relaxed text-pretty text-board-muted">
        Accounts are created by your BFAR Sorsogon administrator. New here? Open
        the invite link in your email to set a password first.
      </p>
    </AuthPanel>
  )
}

function signInErrorMessage(err: unknown) {
  if (!(err instanceof ApiError)) {
    return "Can't reach TruAquality. Check your internet connection and try again."
  }
  if (err.status === 429) {
    return "Too many sign-in attempts from this network. Wait 15 minutes, then try again."
  }
  if (err.status === 403 || /banned/i.test(err.message)) {
    return "This account can't sign in right now. Contact your BFAR Sorsogon administrator."
  }
  if (err.status === 400 || err.status === 401) {
    return "That email and password don't match. Check both and try again, or reset your password."
  }
  return "Sign-in isn't available right now. Try again in a moment."
}

function ResetPanel({
  email,
  onEmailChange,
  onBack,
  focusOnMount,
}: PanelProps & { onBack: () => void }) {
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent">(
    "idle"
  )
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (status === "sending") return

    const trimmedEmail = email.trim()
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError(
        trimmedEmail
          ? "Enter an email address like name@example.com."
          : "Enter the email address for your account."
      )
      document.getElementById("reset-email")?.focus()
      return
    }

    setError(null)
    setStatus("sending")
    try {
      // Supabase answers the same way whether or not the email has an account, so this never reveals
      // which addresses are registered.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      if (resetError) throw resetError
      setStatus("sent")
    } catch (err) {
      setError(resetErrorMessage(err))
      setStatus("idle")
    }
  }

  if (status === "sent") {
    return (
      <AuthPanel key="sent" title="Check your email" focusOnMount>
        <p className="text-sm leading-relaxed text-pretty text-board-fg">
          If <span className="font-medium break-words">{email.trim()}</span>{" "}
          belongs to a TruAquality account, a link to set a new password is on
          its way. It can take a few minutes to arrive.
        </p>
        <AuthDivider />
        <AuthBackAction onClick={onBack} />
      </AuthPanel>
    )
  }

  return (
    <AuthPanel
      title="Reset your password"
      description="Enter the email address for your account. You'll get a link to set a new password."
      focusOnMount={focusOnMount}
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AuthField
          id="reset-email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(event) => {
            onEmailChange(event.target.value)
            if (error) setError(null)
          }}
          invalid={Boolean(error)}
          aria-describedby={error ? "reset-error" : undefined}
        />
        {error ? <AuthAlert id="reset-error">{error}</AuthAlert> : null}
        <AuthSubmit busy={status === "sending"} busyLabel="Sending…">
          Send reset link
        </AuthSubmit>
      </form>
      <AuthDivider />
      <AuthBackAction onClick={onBack} />
    </AuthPanel>
  )
}

function resetErrorMessage(err: unknown) {
  if (isAuthError(err) && err.status === 429) {
    return "Too many reset emails were requested. Wait a few minutes, then try again."
  }
  if (isAuthError(err) && err.status && err.status >= 400) {
    return "The reset email couldn't be sent. Try again in a moment."
  }
  return "Can't reach the password reset service. Check your internet connection and try again."
}
