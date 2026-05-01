import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const apiTarget = process.env.VITE_API_TARGET || "http://localhost:3000";
// Public path the app is served from. Operator decides this in
// claude-hypervisor's hypervisor.vibe-fitness.yaml (`route: /app/vibe`); the
// workload reads it from VITE_BASE so all built asset URLs stay self-consistent
// behind the nginx prefix. Defaults to "/" so local dev (no prefix) still works.
const base = process.env.VITE_BASE || "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
});
