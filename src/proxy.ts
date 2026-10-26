import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarSesion } from "@/lib/auth";
import { COOKIE_CANAL, esCanal, firmarCanal, type Canal } from "@/lib/canal";

// Filtro de acceso (ADR 0004): sin sesión válida, /panel/* redirige al login y /api/panel/* responde 401.
// El login y el cierre de sesión son públicos. Cada ruta protegida vuelve a comprobar la sesión por su cuenta.
const RUTAS_PUBLICAS = new Set(["/panel/login", "/api/panel/login", "/api/panel/logout"]);

// Canal de origen (ADR 0006): el parámetro ?canal= de la ficha (QR en sala) o la página de holograma se guardan
// en una cookie firmada con COOKIE_SECRET. Un valor inválido se ignora: sin cookie, el canal es "web".
async function asignarCanal(request: NextRequest) {
  const respuesta = NextResponse.next();
  const secreto = process.env.COOKIE_SECRET;
  if (!secreto) return respuesta;

  const { pathname, searchParams } = request.nextUrl;
  const parametro = searchParams.get("canal");
  let canal: Canal | null = esCanal(parametro) ? parametro : null;
  if (pathname.startsWith("/holograma/")) canal = "holograma";

  if (canal) {
    respuesta.cookies.set(COOKIE_CANAL, await firmarCanal(canal, secreto), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });
  }
  return respuesta;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/proyectos/") || pathname.startsWith("/holograma/")) return asignarCanal(request);
  if (RUTAS_PUBLICAS.has(pathname)) return NextResponse.next();

  const sesion = await verificarSesion(request.cookies.get(COOKIE_SESION)?.value, process.env.AUTH_SECRET);
  if (sesion) return NextResponse.next();

  if (pathname.startsWith("/api/panel")) {
    return NextResponse.json(
      { ok: false, error: { codigo: "no_autorizado", mensaje: "Inicia sesión para continuar." } },
      { status: 401 },
    );
  }
  return NextResponse.redirect(new URL("/panel/login", request.url));
}

export const config = {
  matcher: ["/panel/:path*", "/api/panel/:path*", "/proyectos/:path*", "/holograma/:path*"],
};
