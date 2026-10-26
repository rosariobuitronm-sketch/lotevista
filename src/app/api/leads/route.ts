import { responderError, responderOk } from "@/lib/api";
import { hashIp, ipDeLaPeticion, LIMITE_LEADS_IP, registrarPreguntaPorIp } from "@/lib/asistente/limites";
import { COOKIE_CANAL, leerCanal, leerCookie } from "@/lib/canal";
import { getPool, getSql } from "@/lib/db";
import { validarLead } from "@/lib/lead-schema";
import { guardarLead, ProyectoInexistenteError } from "@/lib/leads";
import { CONSENTIMIENTO_VERSION } from "@/lib/textos";

const TAMANO_MAX_CUERPO = 100_000;

// POST /api/leads: crea o actualiza un lead (ADR 0003). La respuesta es la misma sea un lead nuevo o repetido,
// para no revelar si un celular ya estaba registrado, y nunca devuelve datos de otros leads.
export async function POST(request: Request) {
  const texto = await request.text();
  if (texto.length > TAMANO_MAX_CUERPO) {
    return responderError(413, { codigo: "demasiado_grande", mensaje: "Los datos enviados son demasiado grandes." });
  }

  let entrada: unknown;
  try {
    entrada = JSON.parse(texto);
  } catch {
    return responderError(400, { codigo: "json", mensaje: "No pudimos leer los datos enviados." });
  }

  const validacion = validarLead(entrada);
  if (!validacion.ok) {
    return responderError(400, {
      codigo: "validacion",
      mensaje: "Revisa los datos del formulario.",
      campos: validacion.errores,
    });
  }

  // Límite de envíos por IP en 24 h: frena el relleno de la base con leads falsos. Solo se guarda el hash de la IP.
  try {
    const hash = hashIp(`leads|${ipDeLaPeticion(request.headers)}`, process.env.IP_HASH_SECRET);
    const { permitido } = await registrarPreguntaPorIp(getSql(), hash, new Date(), LIMITE_LEADS_IP);
    if (!permitido) {
      return responderError(429, {
        codigo: "limite",
        mensaje: "Recibimos muchos envíos desde tu conexión. Por favor, inténtalo más tarde o comunícate con un asesor.",
      });
    }
  } catch {
    return responderError(500, { codigo: "servidor", mensaje: "No pudimos guardar tus datos. Intenta de nuevo." });
  }

  const canal = await leerCanal(leerCookie(request.headers.get("cookie"), COOKIE_CANAL), process.env.COOKIE_SECRET);

  let pool: ReturnType<typeof getPool> | undefined;
  try {
    pool = getPool();
    await guardarLead(pool, validacion.datos, { canal, versionConsentimiento: CONSENTIMIENTO_VERSION });
    return responderOk({ mensaje: "¡Gracias! Recibimos tus datos y un asesor se comunicará contigo." });
  } catch (error) {
    if (error instanceof ProyectoInexistenteError) {
      return responderError(404, { codigo: "proyecto", mensaje: "No encontramos ese proyecto." });
    }
    // Nunca se devuelven detalles técnicos.
    return responderError(500, { codigo: "servidor", mensaje: "No pudimos guardar tus datos. Intenta de nuevo." });
  } finally {
    await pool?.end();
  }
}
