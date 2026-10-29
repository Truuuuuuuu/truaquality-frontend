import type * as Production from "../../src/lib/supabase"
// LoginPage imports the production client even while authenticated. Intercept that import too:
// a no-network guard alone would still allow its storage/session initialization to run.
const deny = () => {
  throw new Error("Supabase is disabled in the isolated simulator")
}
export const supabase = new Proxy(
  {},
  { get: deny }
) as typeof Production.supabase
export const createAuthActionClient: typeof Production.createAuthActionClient =
  deny
