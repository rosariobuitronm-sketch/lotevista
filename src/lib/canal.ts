import { jwtVerify, SignJWT } from "jose";

// Canal de origen del lead (ADR 0006). Se toma del parámetro de la URL (QR o página de holograma)
// y se guarda en una cookie firmada con COOKIE_SECRET. Si falta o no es válida, el canal es "web".

export const CANALES = ["web", "qr_sala", "holograma"] as const;
export type Canal = (typeof CANALES)[number];
export const COOKIE_CANAL = "lv_canal";

export const esCanal = (valor: unknown): valor is Canal => typeof valor === "string" && (CANALES as readonly string[]).includes(valor);

const clave = (secreto: string) => new TextEncoder().encode(secreto);

export async function firmarCanal(canal: Canal, secreto: string | undefined): Promise<string> {
  if (!secreto) throw new Error("Falta COOKIE_SECRET");
  return new SignJWT({ c: canal }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("24h").sign(clave(secreto));
}

export async function leerCanal(token: string | null | undefined, secreto: string | undefined): Promise<Canal> {
  if (!token || !secreto) return "web";
  try {
    const { payload } = await jwtVerify(token, clave(secreto), { algorithms: ["HS256"] });
    return esCanal(payload.c) ? payload.c : "web";
  } catch {
    return "web";
  }
}

/** Busca una cookie por nombre dentro de la cabecera "cookie" de una petición. */
export function leerCookie(cabecera: string | null | undefined, nombre: string): string | undefined {
  if (!cabecera) return undefined;
  for (const parte of cabecera.split(";")) {
    const [clave, ...resto] = parte.trim().split("=");
    if (clave === nombre) return resto.join("=");
  }
  return undefined;
}
