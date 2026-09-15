import * as React from "react"
import { CheckCircle2 } from "lucide-react"
import { Link } from "react-router"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

type LinkState = "checking" | "valid" | "invalid"

// Supabase's invite email links here with the session tokens already in the URL; its client parses
// them into a session on load (no backend round-trip needed for that part — see accept-invite in
// frontend/CLAUDE.md). This page only has to confirm that session exists, then let the user set a
// password with it.
export function AcceptInvitePage() {
  const [linkState, setLinkState] = React.useState<LinkState>("checking")

  React.useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setLinkState(data.session ? "valid" : "invalid")
    })

    // Only ever upgrades to "valid" (catching the session Supabase parses from the URL hash
    // asynchronously after the check above). It must never downgrade back to "invalid" on a null
    // session: SetPasswordForm signs this client out once the password is set, which fires this
    // same listener with session === null, and that sign-out isn't the link becoming invalid.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!cancelled && session) setLinkState("valid")
      }
    )

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="relative flex min-h-svh items-center justify-center p-6">
      <ModeToggle className="absolute top-4 right-4" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set your password</CardTitle>
          <CardDescription>
            TruAquality water quality monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkState === "checking" ? (
            <p className="text-sm text-muted-foreground">
              Checking your invite link…
            </p>
          ) : linkState === "invalid" ? (
            <p role="alert" className="text-sm text-destructive">
              This invite link is invalid or has expired. Ask an administrator
              to resend your invite.
            </p>
          ) : (
            <SetPasswordForm />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SetPasswordForm() {
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

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
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <CheckCircle2 className="size-8 text-foreground" />
        <p className="text-sm">Your password is set. You can now sign in.</p>
        <Button className="mt-1 w-full" render={<Link to="/login" />}>
          Go to sign in
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting} className="mt-1">
        {isSubmitting ? "Setting password…" : "Set password"}
      </Button>
    </form>
  )
}
