import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
})
