import path from "node:path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

const frontend = import.meta.dirname
export default defineConfig({
  root: path.join(frontend, "review/do"),
  envDir: false,
  envPrefix: [],
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "offline-review-dev-client",
      configureServer(server) {
        // Vite still injects its client with hmr:false. Keep CSS injection working without a socket,
        // console forwarding or reconnect polling, so connect-src:none remains a real invariant.
        server.middlewares.use((req, res, next) => {
          if (req.url?.split("?")[0] !== "/@vite/client") return next()
          res.setHeader("Content-Type", "application/javascript")
          res.end(`const styles = new Map();
export function updateStyle(id, content) { let style = styles.get(id); if (!style) { style = document.createElement('style'); styles.set(id, style); document.head.appendChild(style); } style.textContent = content; }
export function removeStyle(id) { styles.get(id)?.remove(); styles.delete(id); }
export function createHotContext() { return { data: {}, accept() {}, dispose() {}, prune() {}, on() {}, invalidate() {} }; }
export function injectQuery(url) { return url; }
`)
        })
      },
    },
  ],
  resolve: {
    alias: [
      {
        find: "@/context/auth-context",
        replacement: path.join(frontend, "review/do/auth-context.tsx"),
      },
      {
        find: "@/lib/api",
        replacement: path.join(frontend, "review/do/api.ts"),
      },
      {
        find: "@/lib/supabase",
        replacement: path.join(frontend, "review/do/supabase.ts"),
      },
      { find: "@", replacement: path.join(frontend, "src") },
    ],
  },
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true,
    hmr: false,
    fs: {
      strict: true,
      allow: [
        path.join(frontend, "src"),
        path.join(frontend, "review/do"),
        path.join(frontend, "node_modules"),
      ],
      deny: ["**/.env", "**/.env.*", "**/.git/**"],
    },
  },
})
