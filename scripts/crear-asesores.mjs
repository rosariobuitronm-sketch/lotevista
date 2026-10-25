// Uso: node --env-file=.env.local scripts/crear-asesores.mjs <prueba|produccion>
// Crea los asesores de demo con usuario y contraseña tomados de variables de entorno
// (ASESOR_1_USUARIO / ASESOR_1_CLAVE, ASESOR_2_USUARIO / ASESOR_2_CLAVE, ...).
import { crearAsesores, leerAsesoresDeEntorno } from "./lib/asesores.mjs";
import { abrirDestino } from "./lib/destino.mjs";

const destino = process.argv[2];

let asesores;
try {
  asesores = leerAsesoresDeEntorno(process.env);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
if (asesores.length === 0) {
  console.error("No hay asesores definidos. Agrega a .env.local, por ejemplo:");
  console.error("  ASESOR_1_USUARIO=...   y   ASESOR_1_CLAVE=...");
  process.exit(1);
}

const pool = abrirDestino(destino);
try {
  await crearAsesores(pool, asesores);
  console.log(`OK  ${asesores.length} asesor(es) creados/actualizados en: ${destino}`);
  for (const a of asesores) console.log(`    - ${a.usuario}`);
} catch (error) {
  console.error(`Error al crear asesores en ${destino}:`, error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
