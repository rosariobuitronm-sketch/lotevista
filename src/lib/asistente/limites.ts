import { createHmac } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import type { Sql } from "@/lib/proyectos";

// Límites del asistente (ADR 0005). Son constantes configurables:
// - por sesión: una cookie firmada cuenta las preguntas (tope de 20);
// - por IP: un contador temporal de 24 horas por IP convertida en hash (HMAC-SHA256 con IP_HASH_SECRET, tope de 500).
// No se guarda la IP real ni el contenido de las preguntas.

export const LIMITE_SESION = 20;
export const LIMITE_IP = 500;
export const VENTANA_IP_HORAS = 24;
export const COOKIE_ASISTENTE = "lv_asistente";
export const DURACION_COOKIE_SEGUNDOS = 12 * 60 * 60;

const clave = (secreto: string) => new TextEncoder().encode(secreto);

export async function firmarContador(n: number, secreto: string | undefined): Promise<string> {
  if (!secreto) throw new Error("Falta COOKIE_SECRET");
  return new SignJWT({ n }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(`${DURACION_COOKIE_SEGUNDOS}s`).sign(clave(secreto));
}

/** Preguntas ya hechas en esta sesión. Cualquier problema con la cookie cuenta como 0 (el límite por IP cubre ese caso). */
export async function leerContador(token: string | null | undefined, secreto: string | undefined): Promise<number> {
  if (!token || !secreto) return 0;
  try {
    const { payload } = await jwtVerify(token, clave(secreto), { algorithms: ["HS256"] });
    const n = payload.n;
    return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= LIMITE_SESION + 100 ? n : 0;
  } catch {
    return 0;
  }
}

/** ¿Puede hacer otra pregunta quien ya hizo `hechas`? Con 20 hechas, la 21 se bloquea. */
export const sesionPermitida = (hechas: number) => hechas < LIMITE_SESION;

export function hashIp(ip: string, secreto: string | undefined): string {
  if (!secreto) throw new Error("Falta IP_HASH_SECRET");
  return createHmac("sha256", secreto).update(ip).digest("hex");
}

/** IP del visitante según las cabeceras que pone Vercel. Si no hay ninguna, un valor fijo (todos comparten el tope). */
export function ipDeLaPeticion(cabeceras: Headers): string {
  const reenviada = cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || cabeceras.get("x-real-ip")?.trim() || "desconocida";
}

/** Cuenta una pregunta de esta IP (ya convertida en hash). Borra de paso las filas de más de 24 horas. */
export async function registrarPreguntaPorIp(
  sql: Sql,
  hash: string,
  ahora: Date,
  limite: number = LIMITE_IP,
): Promise<{ permitido: boolean; contador: number }> {
  const t = ahora.toISOString();
  await sql`DELETE FROM limite_ip WHERE ventana_inicio < ${t}::timestamptz - make_interval(hours => ${VENTANA_IP_HORAS})`;
  const [fila] = await sql`
    INSERT INTO limite_ip (ip_hash, ventana_inicio, contador) VALUES (${hash}, ${t}::timestamptz, 1)
    ON CONFLICT (ip_hash) DO UPDATE SET contador = limite_ip.contador + 1
    RETURNING contador`;
  const contador = Number(fila.contador);
  return { permitido: contador <= limite, contador };
}
