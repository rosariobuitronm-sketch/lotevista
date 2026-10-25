// Uso: node --env-file=.env.local scripts/db-aplicar.mjs <prueba|produccion>
// Ejecuta db/schema.sql y luego db/seed.sql (ambos se pueden repetir sin problema).
import { readFileSync } from "node:fs";
import { abrirDestino } from "./lib/destino.mjs";

const destino = process.argv[2];
const pool = abrirDestino(destino);

try {
  for (const archivo of ["db/schema.sql", "db/seed.sql"]) {
    await pool.query(readFileSync(archivo, "utf8"));
    console.log(`OK  ${archivo} aplicado en: ${destino}`);
  }
} catch (error) {
  console.error(`Error al aplicar en ${destino}:`, error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
