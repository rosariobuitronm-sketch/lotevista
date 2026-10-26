// Levanta la app para las pruebas E2E (puerto 3112) con una base de datos SEGURA:
// - usa DATABASE_URL_TEST (rama de pruebas de Neon), nunca la base de la demo;
// - deja vacía la clave de Gemini para que el asistente responda siempre con el FAQ (resultado repetible).
import { spawn, spawnSync } from "node:child_process";

process.env.GEMINI_API_KEY = ""; // antes de leer .env.local: las variables ya definidas no se pisan
try {
  process.loadEnvFile(".env.local");
} catch {
  console.error("No encuentro .env.local con las variables del proyecto.");
  process.exit(1);
}

const prueba = process.env.DATABASE_URL_TEST;
if (!prueba) {
  console.error("Falta DATABASE_URL_TEST: las pruebas E2E no se ejecutan sin una base de pruebas.");
  process.exit(1);
}
if (prueba === process.env.DATABASE_URL) {
  console.error("DATABASE_URL_TEST es igual a DATABASE_URL: se cancela para no tocar la base de la demo.");
  process.exit(1);
}
process.env.DATABASE_URL = prueba;

const compilar = spawnSync("npx", ["next", "build"], { stdio: "inherit", shell: true, env: process.env });
if (compilar.status !== 0) process.exit(compilar.status ?? 1);

const servidor = spawn("npx", ["next", "start", "-p", "3112"], { stdio: "inherit", shell: true, env: process.env });
const cerrar = () => servidor.kill();
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
servidor.on("exit", (codigo) => process.exit(codigo ?? 0));
