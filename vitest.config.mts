import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globalSetup: ["./vitest.global-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Solo DATABASE_URL* de .env.local (las pruebas de datos usan DATABASE_URL_TEST)
    env: loadEnv(mode, process.cwd(), "DATABASE_URL"),
  },
}));
