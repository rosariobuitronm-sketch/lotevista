import { z } from "zod";

// Reglas de validación del lead (ADR 0003 y 0007). Se usa en el navegador (mensajes junto a cada campo)
// y en el servidor (POST /api/leads), que es quien manda. No existe campo de DNI y los campos de más se rechazan.

export const LIMITE_PREGUNTAS_LEAD = 20;
export const LARGO_MAX_PREGUNTA = 500;
export const LARGO_MAX_RESPUESTA = 2000;

/** Deja solo dígitos y quita el prefijo del país (51) si viene. */
export function normalizarCelular(valor: string): string {
  let digitos = valor.replace(/\D/g, "");
  if (digitos.length === 11 && digitos.startsWith("51")) digitos = digitos.slice(2);
  return digitos;
}

const MSG_NOMBRE = "Escribe tu nombre completo.";
const MSG_CELULAR = "Escribe un celular peruano de 9 dígitos, por ejemplo 987 654 321.";
const MSG_CORREO = "Escribe un correo válido, por ejemplo nombre@correo.com.";
const MSG_CONSENTIMIENTO = "Debes aceptar el tratamiento de tus datos personales para continuar.";

const preguntaChat = z
  .object({
    pregunta: z.string().trim().min(1).max(LARGO_MAX_PREGUNTA),
    respuesta: z.string().trim().min(1).max(LARGO_MAX_RESPUESTA),
    sabe: z.boolean(),
  })
  .strict();

export const leadSchema = z
  .object({
    nombre: z
      .string({ error: MSG_NOMBRE })
      .trim()
      .min(1, MSG_NOMBRE)
      .min(2, "El nombre debe tener al menos 2 caracteres.")
      .max(80, "El nombre no puede pasar de 80 caracteres."),
    celular: z
      .string({ error: MSG_CELULAR })
      .transform(normalizarCelular)
      .refine((v) => /^9\d{8}$/.test(v), MSG_CELULAR),
    correo: z
      .string({ error: MSG_CORREO })
      .trim()
      .toLowerCase()
      .max(120, "El correo no puede pasar de 120 caracteres.")
      .pipe(z.email(MSG_CORREO)),
    horario: z
      .string()
      .trim()
      .max(60, "El horario no puede pasar de 60 caracteres.")
      .nullish()
      .transform((v) => v || undefined),
    consentimiento: z.literal(true, { error: MSG_CONSENTIMIENTO }),
    proyecto: z.string({ error: "Proyecto no válido." }).regex(/^[a-z0-9-]{1,80}$/, "Proyecto no válido."),
    uso3d: z.boolean().default(false),
    usoRa: z.boolean().default(false),
    preguntas: z
      .array(preguntaChat, { error: "Las preguntas del chat no son válidas." })
      .max(LIMITE_PREGUNTAS_LEAD, "Hay demasiadas preguntas del chat.")
      .default([]),
  })
  .strict();

export type DatosLead = z.output<typeof leadSchema>;

export type ResultadoValidacion =
  | { ok: true; datos: DatosLead }
  | { ok: false; errores: Record<string, string> };

/** Valida un lead. Nunca lanza: devuelve los errores en español, uno por campo. */
export function validarLead(entrada: unknown): ResultadoValidacion {
  const r = leadSchema.safeParse(entrada);
  if (r.success) return { ok: true, datos: r.data };

  const errores: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const campo = typeof issue.path[0] === "string" ? issue.path[0] : "_general";
    if (errores[campo]) continue;
    errores[campo] =
      issue.code === "unrecognized_keys"
        ? "Se enviaron datos no permitidos."
        : campo === "_general"
          ? "Los datos enviados no son válidos."
          : issue.message;
  }
  return { ok: false, errores };
}
