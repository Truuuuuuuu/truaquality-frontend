/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react"
import { reviewProfile, ApiError } from "./api"

// No session storage, JWT, refresh timer or production provider is read by this entry.
const login: (
  email: string,
  password: string,
  remember: boolean
) => Promise<void> = async () => {
  throw new ApiError("Authentication is disabled in the simulator", 403)
}
const state = {
  session: {
    accessToken: "simulated-not-a-token",
    refreshToken: "simulated-not-a-token",
    expiresAt: Number.MAX_SAFE_INTEGER,
  },
  profile: reviewProfile,
  isLoading: false,
  isExplicitSignOut: false,
  login,
  logout: () => {
    throw new ApiError("Authentication is disabled in the simulator", 403)
  },
  authorizedRequest: <T,>(fn: (token: string) => Promise<T>) =>
    fn("simulated-not-a-token"),
}
export function AuthProvider({ children }: { children: ReactNode }) {
  return children
}
export function useAuth() {
  return state
}
