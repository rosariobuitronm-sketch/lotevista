import { defineConfig } from "@playwright/test";

// Las variables (por ejemplo el usuario y la clave del asesor de prueba) se leen de .env.local; nunca se imprimen.
try {
  process.loadEnvFile(".env.local");
} catch {
  // sin .env.local las pruebas que lo necesitan avisan solas
}

const PUERTO = 3112;

export default defineConfig({
  testDir: "./e2e",
  // Los tres flujos comparten la base de pruebas: se corren de uno en uno.
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: "es-PE",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Se usa el Edge ya instalado (no se descarga otro navegador) y WebGL por software para la maqueta 3D.
    channel: "msedge",
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  webServer: {
    command: "node e2e/servidor.mjs",
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
