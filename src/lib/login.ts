import bcrypt from "bcryptjs";
import type { Sql } from "@/lib/proyectos";

// Inicio de sesión del asesor (ADR 0004). La contraseña se compara contra el hash bcrypt y nunca se registra.

export type ResultadoLogin = { ok: true; usuario: string } | { ok: false; motivo: "credenciales" };

const MAX_USUARIO = 60;
const MAX_CLAVE = 200;

// Hash falso para gastar el mismo tiempo cuando el usuario no existe (así no se delata qué usuarios son válidos).
let hashFalso: Promise<string> | undefined;
const obtenerHashFalso = () => (hashFalso ??= bcrypt.hash("clave-que-no-existe", 10));

export const normalizarUsuario = (usuario: string) => usuario.trim().toLowerCase();

export async function iniciarSesion(sql: Sql, entrada: { usuario: string; clave: string }): Promise<ResultadoLogin> {
  const usuario = normalizarUsuario(entrada.usuario);
  const { clave } = entrada;
  if (!usuario || usuario.length > MAX_USUARIO || !clave || clave.length > MAX_CLAVE) {
    return { ok: false, motivo: "credenciales" };
  }

  const [asesor] = await sql`SELECT usuario, password_hash FROM asesores WHERE lower(usuario) = ${usuario}`;
  const coincide = await bcrypt.compare(clave, asesor ? asesor.password_hash : await obtenerHashFalso());
  if (!asesor || !coincide) return { ok: false, motivo: "credenciales" };
  return { ok: true, usuario: asesor.usuario };
}
