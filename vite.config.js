import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { securityHeaders } from "./src/lib/securityHeaders.js";

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173, headers: securityHeaders({ dev: true }) },
  preview: { headers: securityHeaders({ dev: false }) },
  build: {
    rollupOptions: {
      output: {
        // Split stable vendor code so it gets its own immutable,
        // long-cached chunks instead of changing with every app edit.
        manualChunks: {
          react: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
});
