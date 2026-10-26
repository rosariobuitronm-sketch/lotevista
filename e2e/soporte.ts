import { Pool } from "@neondatabase/serverless";

// Ayudas de las pruebas E2E: solo tocan la rama de pruebas de Neon (DATABASE_URL_TEST).

export function urlPrueba(): string {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("Falta DATABASE_URL_TEST: las pruebas E2E solo corren contra la base de pruebas.");
  if (url === process.env.DATABASE_URL) throw new Error("DATABASE_URL_TEST no puede ser la base de la demo.");
  return url;
}

/** Celular peruano válido (9 dígitos, empieza en 9) que no se repite entre corridas. */
export const celularUnico = () => `9${String(Date.now() % 100_000_000).padStart(8, "0")}`;

export async function consultar<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = new Pool({ connectionString: urlPrueba() });
  try {
    return (await pool.query(sql, params)).rows as T[];
  } finally {
    await pool.end();
  }
}

/** Borra los leads creados por una prueba (y deja limpio el contador de envíos por IP de la base de pruebas). */
export async function limpiar(celulares: string[]) {
  await consultar("DELETE FROM leads WHERE celular = ANY($1)", [celulares]);
  await consultar("DELETE FROM limite_ip");
}

/** Usuario y clave del asesor de prueba, tomados del entorno. */
export function credencialesAsesor() {
  const usuario = process.env.ASESOR_1_USUARIO;
  const clave = process.env.ASESOR_1_CLAVE;
  if (!usuario || !clave) throw new Error("Faltan ASESOR_1_USUARIO y ASESOR_1_CLAVE en .env.local.");
  return { usuario, clave };
}
