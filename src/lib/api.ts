const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string
}

async function request<T>(path: string, { method = "GET", body, token }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get("content-type")?.includes("application/json")
  const data = isJson ? await res.json() : undefined

  if (!res.ok) {
    const message = (data as { error?: string } | undefined)?.error ?? res.statusText
    throw new ApiError(message, res.status, (data as { details?: unknown } | undefined)?.details)
  }

  return data as T
}

export type Profile = {
  id: string
  email: string
  fullName: string
  systemRole: "ADMIN" | "USER"
  status: "INVITED" | "ACTIVE" | "DISABLED"
}

type LoginResponse = {
  user: unknown
  session: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
}

export function login(email: string, password: string) {
  return request<LoginResponse>("/auth/login", { method: "POST", body: { email, password } })
}

export function getMe(token: string) {
  return request<{ profile: Profile }>("/me", { token })
}
