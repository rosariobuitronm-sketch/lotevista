import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarSesion } from "@/lib/auth";

// Filtro de acceso (ADR 0004): sin sesión válida, /panel/* redirige al login y /api/panel/* responde 401.
// El login y el cierre de sesión son públicos. Cada ruta protegida vuelve a comprobar la sesión por su cuenta.
const RUTAS_PUBLICAS = new Set(["/panel/login", "/api/panel/login", "/api/panel/logout"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: ["/panel/:path*", "/api/panel/:path*"],
};
