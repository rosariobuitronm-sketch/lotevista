import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";
import { loadEnv } from "vite";

// Se ejecuta UNA vez antes de todas las pruebas: deja la rama de pruebas de Neon con el esquema y los datos demo.
// Se aplican dos veces seguidas a propósito: si alguno no fuera repetible, toda la suite fallaría aquí.
// Así ningún archivo de prueba tiene que reaplicarlos (hacerlo en paralelo bloqueaba tablas y fallaba al azar).
export default async function preparar() {
  const env = loadEnv("test", process.cwd(), "DATABASE_URL");
  const urlPrueba = env.DATABASE_URL_TEST;
  if (!urlPrueba) return; // sin rama de pruebas, las pruebas de datos se omiten

  if (env.DATABASE_URL && new URL(urlPrueba).hostname === new URL(env.DATABASE_URL).hostname) {
    throw new Error("DATABASE_URL_TEST apunta a la misma base que DATABASE_URL: se cancela");
  }

  const pool = new Pool({ connectionString: urlPrueba });
  try {
    for (let vuelta = 0; vuelta < 2; vuelta++) {
      await pool.query(readFileSync("db/schema.sql", "utf8"));
      await pool.query(readFileSync("db/seed.sql", "utf8"));
    }
  } finally {
    await pool.end();
  }
}
