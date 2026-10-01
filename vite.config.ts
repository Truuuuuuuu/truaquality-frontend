import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"

// Origin of a build-time URL variable, or a build failure. A CSP that left out the API or Supabase origin would
// block every request the app makes, so a missing or malformed value must stop the build rather than ship a
// dashboard that cannot load.
function originOf(env: Record<string, string>, name: string) {
  const value = env[name]
  if (!value) {
    throw new Error(
      `${name} must be set to build: the Content-Security-Policy is derived from it`
    )
  }
  try {
    return new URL(value).origin
  } catch {
    throw new Error(
      `${name} is not a valid URL ("${value}"), so the Content-Security-Policy can't be built`
    )
  }
}

// Production builds ship a Content-Security-Policy <meta> tag, so even on a static host that sets no headers the
// browser refuses scripts from anywhere but this site — an injected <script> can't run and read the session tokens
// held in web storage. Build-only: the dev server needs inline scripts and a websocket for hot reload.
// - style-src keeps 'unsafe-inline' because React style={...} props and the UI library write inline styles.
// - img-src/font-src allow data: and blob: for bundled fonts/icons and the readings export download.
// - No wss: origin: the app never opens a Supabase Realtime channel. Add one here if that changes, and add any
//   new external origin the app starts talking to.
// - frame-ancestors is ignored in a <meta> CSP; DEPLOYMENT.md lists it as a host header instead.
function cspPlugin(env: Record<string, string>): Plugin {
  return {
    name: "truaquality-csp",
    apply: "build",
    transformIndexHtml() {
      const connect = [
        "'self'",
        originOf(env, "VITE_API_URL"),
        originOf(env, "VITE_SUPABASE_URL"),
      ]
      const policy = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        `connect-src ${[...new Set(connect)].join(" ")}`,
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ")
      return [
        {
          tag: "meta",
          attrs: { "http-equiv": "Content-Security-Policy", content: policy },
          injectTo: "head-prepend",
        },
      ]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "VITE_")
  return {
    plugins: [react(), tailwindcss(), cspPlugin(env)],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      // Fixed, not just Vite's default: backend/.env's INVITE_REDIRECT_URL and Supabase's allowed
      // redirect URLs both hardcode this port, so a dev server that drifts to another port silently
      // breaks the accept-invite email link.
      port: 5174,
      strictPort: true,
    },
  }
})
