import { z } from "zod";

// Formato que se le pide a Gemini: { respuesta, sabe }. Se valida siempre; si no cumple, se deriva a un asesor.

export const MENSAJE_DERIVACION =
  "No tengo esa información registrada. Un asesor podrá ayudarte: deja tus datos en el formulario y te contactará.";

export type RespuestaModelo = { respuesta: string; sabe: boolean };

const esquema = z
  .object({ respuesta: z.string().max(1200), sabe: z.boolean() })
  .strict()
  .refine((r) => !r.sabe || r.respuesta.trim().length > 0);

/** Devuelve la respuesta validada o null si el formato no es el esperado. Nunca lanza. */
export function parsearRespuestaModelo(texto: string): RespuestaModelo | null {
  const limpio = texto.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1").trim();
  let json: unknown;
  try {
    json = JSON.parse(limpio);
  } catch {
    return null;
  }
  const r = esquema.safeParse(json);
  return r.success ? { respuesta: r.data.respuesta.trim(), sabe: r.data.sabe } : null;
}
