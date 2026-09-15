import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set"
  )
}

// Used only by the accept-invite page to redeem the session Supabase puts in the invite link's URL
// and set a password (`supabase.auth.updateUser`). Everything else in this app talks to our own
// backend, which holds the actual login/session logic — this client never signs in on its own.
export const supabase = createClient(supabaseUrl, supabasePublishableKey)

// A throwaway client for a signed-in user's own self-service calls straight to Supabase Auth —
// currently just changing their own password, since the backend has no /me update endpoint for it.
// `persistSession`/`autoRefreshToken` are off so it never writes to localStorage or starts a
// background refresh timer of its own: the caller hands it the access/refresh tokens our own
// session already holds for one call, then the client is discarded. That keeps it fully separate
// from the app's real session lifecycle (owned by AuthProvider) instead of racing it.
export function createAuthActionClient() {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
