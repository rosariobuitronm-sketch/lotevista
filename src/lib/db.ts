import { neon, Pool } from "@neondatabase/serverless";

// Devuelve el cliente SQL de Neon. Por defecto usa DATABASE_URL; las pruebas de
// datos pasan DATABASE_URL_TEST para no tocar nunca la base de la demo.
export function getSql(url: string | undefined = process.env.DATABASE_URL) {
  if (!url) {
    throw new Error("Falta la variable de entorno de la base de datos");
  }
  return neon(url);
}

// Conexión con soporte de transacciones (BEGIN/COMMIT). Quien la pide debe cerrarla con pool.end().
export function getPool(url: string | undefined = process.env.DATABASE_URL) {
  if (!url) {
    throw new Error("Falta la variable de entorno de la base de datos");
  }
  return new Pool({ connectionString: url });
}
