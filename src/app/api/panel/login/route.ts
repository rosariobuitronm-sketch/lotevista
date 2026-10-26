import { z } from "zod";
import { responderError } from "@/lib/api";
import { COOKIE_SESION, crearSesion, opcionesCookieSesion } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { iniciarSesion } from "@/lib/login";
import { NextResponse } from "next/server";

const entradaSchema = z.object({ usuario: z.string().min(1).max(200), clave: z.string().min(1).max(500) }).strict();

const MENSAJE_CREDENCIALES = "Usuario o contraseña incorrectos";

// POST /api/panel/login (ADR 0003 y 0004). El mensaje de error es único: no dice si falló el usuario o la contraseña.
export async function POST(request: Request) {
  let entrada: z.infer<typeof entradaSchema>;
  try {
    entrada = entradaSchema.parse(JSON.parse(await request.text()));
  } catch {
    return responderError(400, { codigo: "validacion", mensaje: "Escribe tu usuario y tu contraseña." });
  }

  try {
    const resultado = await iniciarSesion(getSql(), entrada);
    if (!resultado.ok && resultado.motivo === "bloqueado") {
      // El mismo mensaje exista o no el usuario (los inexistentes también cuentan intentos).
      const espera = Math.max(1, Math.ceil((resultado.bloqueadoHasta.getTime() - Date.now()) / 1000));
      return responderError(
        429,
        { codigo: "bloqueado", mensaje: "Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo." },
        { "Retry-After": String(espera) },
      );
    }
    if (!resultado.ok) {
      return responderError(401, { codigo: "credenciales", mensaje: MENSAJE_CREDENCIALES });
    }
    const token = await crearSesion(resultado.usuario, process.env.AUTH_SECRET);
    const respuesta = NextResponse.json({ ok: true, datos: { usuario: resultado.usuario } });
    respuesta.cookies.set(COOKIE_SESION, token, opcionesCookieSesion);
    return respuesta;
  } catch {
    // Nunca se devuelven detalles técnicos ni se registra la contraseña.
    return responderError(500, { codigo: "servidor", mensaje: "No pudimos iniciar sesión ahora. Intenta de nuevo." });
  }
}
