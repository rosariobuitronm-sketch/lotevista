import { Pool } from "@neondatabase/serverless";

const VARIABLES = { prueba: "DATABASE_URL_TEST", produccion: "DATABASE_URL" };

/**
 * Abre una conexión a la rama indicada ("prueba" o "produccion").
 * Nunca imprime la cadena de conexión.
 */
export function abrirDestino(destino) {
  const variable = VARIABLES[destino];
  if (!variable) {
    console.error('Indica el destino: "prueba" o "produccion".');
    process.exit(1);
  }
  const url = process.env[variable];
  if (!url) {
    console.error(`Falta la variable ${variable} en .env.local`);
    process.exit(1);
  }
  if (destino === "prueba" && process.env.DATABASE_URL) {
    const mismo = new URL(url).hostname === new URL(process.env.DATABASE_URL).hostname;
    if (mismo) {
      console.error("DATABASE_URL_TEST apunta a la misma base que DATABASE_URL. Se cancela.");
      process.exit(1);
    }
  }
  return new Pool({ connectionString: url });
}
