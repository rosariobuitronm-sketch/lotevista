import { jwtVerify, SignJWT } from "jose";

// Sesión del asesor (ADR 0004): cookie httpOnly con un token firmado (HS256) con AUTH_SECRET que caduca en 8 horas.

export const COOKIE_SESION = "lv_sesion";
export const DURACION_SESION_SEGUNDOS = 8 * 60 * 60;

export const opcionesCookieSesion = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: DURACION_SESION_SEGUNDOS,
};

export type Sesion = { usuario: string };

const clave = (secreto: string) => new TextEncoder().encode(secreto);

export async function crearSesion(usuario: string, secreto: string | undefined, ahora: Date = new Date()): Promise<string> {
  if (!secreto) throw new Error("Falta AUTH_SECRET");
  const emitido = Math.floor(ahora.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuario)
    .setIssuedAt(emitido)
    .setExpirationTime(emitido + DURACION_SESION_SEGUNDOS)
    .sign(clave(secreto));
}

/** Devuelve el usuario si el token es válido y no venció; si no, null. Nunca lanza. */
export async function verificarSesion(
  token: string | null | undefined,
  secreto: string | undefined,
  ahora: Date = new Date(),
): Promise<Sesion | null> {
  if (!token || !secreto) return null;
  try {
    const { payload } = await jwtVerify(token, clave(secreto), { algorithms: ["HS256"], currentDate: ahora });
    return typeof payload.sub === "string" && payload.sub ? { usuario: payload.sub } : null;
  } catch {
    return null;
  }
}

/** Lee la sesión a partir del valor de la cookie. Se usa en las páginas y rutas protegidas. */
export const requerirSesion = (token: string | null | undefined, secreto: string | undefined) => verificarSesion(token, secreto);
