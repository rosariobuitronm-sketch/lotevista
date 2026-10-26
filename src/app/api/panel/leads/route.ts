import { responderError, responderOk } from "@/lib/api";
import { COOKIE_SESION, requerirSesion } from "@/lib/auth";
import { leerCookie } from "@/lib/canal";
import { getSql } from "@/lib/db";
import { esSlugValido, listarLeads } from "@/lib/panel";

// GET /api/panel/leads?proyecto=slug (ADR 0003). Exige sesión: el filtro (proxy) ya la pide,
// y la ruta la vuelve a comprobar por su cuenta antes de tocar la base de datos.
export async function GET(request: Request) {
  const token = leerCookie(request.headers.get("cookie"), COOKIE_SESION);
  const sesion = await requerirSesion(token, process.env.AUTH_SECRET);
  if (!sesion) {
    return responderError(401, { codigo: "no_autorizado", mensaje: "Inicia sesión para continuar." });
  }

  const proyecto = new URL(request.url).searchParams.get("proyecto") ?? undefined;
  if (proyecto !== undefined && !esSlugValido(proyecto)) {
    return responderError(400, { codigo: "validacion", mensaje: "El proyecto indicado no es válido." });
  }

  try {
    const leads = await listarLeads(getSql(), { proyecto });
    return responderOk({ leads });
  } catch {
    return responderError(500, { codigo: "servidor", mensaje: "No pudimos cargar los leads. Intenta de nuevo." });
  }
}
