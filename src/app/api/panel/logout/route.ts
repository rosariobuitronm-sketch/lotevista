import { NextResponse } from "next/server";
import { COOKIE_SESION, opcionesCookieSesion } from "@/lib/auth";

// POST /api/panel/logout: borra la cookie de sesión.
export async function POST() {
  const respuesta = NextResponse.json({ ok: true, datos: {} });
  respuesta.cookies.set(COOKIE_SESION, "", { ...opcionesCookieSesion, maxAge: 0 });
  return respuesta;
}
