import { z } from "zod";
import { responderError, responderOk } from "@/lib/api";
import { responderPregunta } from "@/lib/asistente/asistente";
import { crearGeneradorGemini, MODELO_POR_DEFECTO } from "@/lib/asistente/gemini";
import {
  COOKIE_ASISTENTE,
  DURACION_COOKIE_SEGUNDOS,
  firmarContador,
  hashIp,
  ipDeLaPeticion,
  LIMITE_SESION,
  leerContador,
  registrarPreguntaPorIp,
  sesionPermitida,
} from "@/lib/asistente/limites";
import { leerCookie } from "@/lib/canal";
import { getSql } from "@/lib/db";
import { obtenerProyecto } from "@/lib/proyectos";

// La IA puede tardar hasta 8 s antes de caer al FAQ (ADR 0005): se pide margen de sobra a la función.
export const maxDuration = 30;

const TAMANO_MAX_CUERPO = 5_000;
const LARGO_MAX_PREGUNTA = 300;

const entradaSchema = z
  .object({
    proyecto: z.string().regex(/^[a-z0-9-]{1,80}$/),
    pregunta: z.string().trim().min(1).max(LARGO_MAX_PREGUNTA),
  })
  .strict();

const MENSAJE_LIMITE_SESION = "Llegaste al límite de preguntas de esta sesión. Si deseas que te contactemos, usa el formulario.";
const MENSAJE_LIMITE_IP = "Vicha está recibiendo muchas preguntas en este momento. Deja tus datos en el formulario y un asesor te contactará.";
const MENSAJE_NO_DISPONIBLE = "El asistente no está disponible ahora. Si deseas que te contactemos, usa el formulario.";

// POST /api/asistente (ADR 0003 y 0005): une validación, límites, lógica acotada a los datos y respaldo de FAQ.
// No guarda preguntas ni respuestas: el navegador las conserva y las envía junto al formulario (ADR 0006).
export async function POST(request: Request) {
  const texto = await request.text();
  if (texto.length > TAMANO_MAX_CUERPO) {
    return responderError(413, { codigo: "demasiado_grande", mensaje: "La pregunta es demasiado larga." });
  }

  let entrada: z.infer<typeof entradaSchema>;
  try {
    entrada = entradaSchema.parse(JSON.parse(texto));
  } catch {
    return responderError(400, {
      codigo: "validacion",
      mensaje: `Escribe una pregunta de hasta ${LARGO_MAX_PREGUNTA} caracteres.`,
    });
  }

  try {
    // 1) Límite por sesión (cookie firmada)
    const hechas = await leerContador(leerCookie(request.headers.get("cookie"), COOKIE_ASISTENTE), process.env.COOKIE_SECRET);
    if (!sesionPermitida(hechas)) {
      return responderError(429, { codigo: "limite_sesion", mensaje: MENSAJE_LIMITE_SESION });
    }

    // 2) Límite por IP en 24 h (solo se guarda el hash)
    const sql = getSql();
    const hash = hashIp(ipDeLaPeticion(request.headers), process.env.IP_HASH_SECRET);
    const { permitido } = await registrarPreguntaPorIp(sql, hash, new Date());
    if (!permitido) {
      return responderError(429, { codigo: "limite_ip", mensaje: MENSAJE_LIMITE_IP });
    }

    // 3) Datos del proyecto (la única fuente de la que puede responder el asistente)
    const proyecto = await obtenerProyecto(entrada.proyecto, sql);
    if (!proyecto) {
      return responderError(404, { codigo: "proyecto", mensaje: "No encontramos ese proyecto." });
    }

    // 4) Lógica + respaldo (la clave solo se lee aquí, en el servidor)
    const generar = crearGeneradorGemini({
      apiKey: process.env.GEMINI_API_KEY,
      modelo: process.env.GEMINI_MODEL || MODELO_POR_DEFECTO,
    });
    const respuesta = await responderPregunta({ pregunta: entrada.pregunta, proyecto, generar });

    const resultado = responderOk({ ...respuesta, restantes: Math.max(0, LIMITE_SESION - (hechas + 1)) });
    resultado.cookies.set(COOKIE_ASISTENTE, await firmarContador(hechas + 1, process.env.COOKIE_SECRET), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: DURACION_COOKIE_SEGUNDOS,
    });
    return resultado;
  } catch {
    // Nunca detalles técnicos: ni de la base de datos, ni de Gemini, ni de secretos que falten.
    return responderError(503, { codigo: "no_disponible", mensaje: MENSAJE_NO_DISPONIBLE });
  }
}
