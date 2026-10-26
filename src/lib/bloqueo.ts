import type { Sql } from "@/lib/proyectos";

// Bloqueo por intentos fallidos (ADR 0004): 5 fallos seguidos de un mismo usuario bloquean el login 15 minutos.
// Los usuarios inexistentes también cuentan, para no delatar cuáles son válidos. Un login correcto reinicia el contador.
// La hora se recibe como parámetro para poder simular el paso del tiempo en las pruebas.

export const MAX_INTENTOS = 5;
export const BLOQUEO_MINUTOS = 15;

/** Devuelve hasta cuándo está bloqueado el usuario, o null si no lo está. */
export async function estaBloqueado(sql: Sql, usuario: string, ahora: Date): Promise<Date | null> {
  const [fila] = await sql`
    SELECT bloqueado_hasta FROM intentos_login
    WHERE usuario = ${usuario} AND bloqueado_hasta > ${ahora.toISOString()}::timestamptz`;
  return fila ? new Date(fila.bloqueado_hasta) : null;
}

/** Suma un fallo (en una sola instrucción, así los intentos simultáneos no se pierden). */
export async function registrarFallo(sql: Sql, usuario: string, ahora: Date): Promise<{ bloqueadoHasta: Date | null }> {
  const t = ahora.toISOString();
  const [fila] = await sql`
    INSERT INTO intentos_login (usuario, intentos_fallidos, bloqueado_hasta)
    VALUES (${usuario}, 1, NULL)
    ON CONFLICT (usuario) DO UPDATE SET
      intentos_fallidos = CASE
        WHEN intentos_login.bloqueado_hasta IS NOT NULL AND intentos_login.bloqueado_hasta <= ${t}::timestamptz THEN 1
        ELSE intentos_login.intentos_fallidos + 1 END,
      bloqueado_hasta = CASE
        WHEN (CASE WHEN intentos_login.bloqueado_hasta IS NOT NULL AND intentos_login.bloqueado_hasta <= ${t}::timestamptz THEN 1
                   ELSE intentos_login.intentos_fallidos + 1 END) >= ${MAX_INTENTOS}
          THEN ${t}::timestamptz + make_interval(mins => ${BLOQUEO_MINUTOS})
        WHEN intentos_login.bloqueado_hasta <= ${t}::timestamptz THEN NULL
        ELSE intentos_login.bloqueado_hasta END
    RETURNING bloqueado_hasta`;
  return { bloqueadoHasta: fila.bloqueado_hasta ? new Date(fila.bloqueado_hasta) : null };
}

export async function reiniciarIntentos(sql: Sql, usuario: string): Promise<void> {
  await sql`DELETE FROM intentos_login WHERE usuario = ${usuario}`;
}
