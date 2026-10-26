// @vitest-environment node
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getSql } from "@/lib/db";
import { iniciarSesion } from "@/lib/login";

// Solo la rama de pruebas de Neon.
const urlPrueba = process.env.DATABASE_URL_TEST;
const USUARIO = "asesor_login_test";
const CLAVE = "Clave-Correcta-123";

describe.skipIf(!urlPrueba)("iniciar sesión del asesor (rama de pruebas)", () => {
  const sql = () => getSql(urlPrueba);
  let pool: Pool;

  beforeAll(async () => {
    if (new URL(urlPrueba!).hostname === new URL(process.env.DATABASE_URL ?? "http://x").hostname) {
      throw new Error("DATABASE_URL_TEST apunta a la misma base que DATABASE_URL: se cancela");
    }
    pool = new Pool({ connectionString: urlPrueba });
    await pool.query(
      `INSERT INTO asesores (usuario, password_hash) VALUES ($1, $2)
       ON CONFLICT (usuario) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [USUARIO, await bcrypt.hash(CLAVE, 4)],
    );
  });

  afterAll(async () => {
    await pool.query("DELETE FROM asesores WHERE usuario = $1", [USUARIO]);
    await pool.query("DELETE FROM intentos_login WHERE usuario LIKE 'asesor_login_test%' OR usuario LIKE 'fantasma%'");
    await pool.end();
  });

  it("con credenciales correctas entra y devuelve el usuario", async () => {
    expect(await iniciarSesion(sql(), { usuario: USUARIO, clave: CLAVE })).toEqual({ ok: true, usuario: USUARIO });
  });

  it("el usuario no distingue mayúsculas ni espacios alrededor", async () => {
    const r = await iniciarSesion(sql(), { usuario: `  ${USUARIO.toUpperCase()} `, clave: CLAVE });
    expect(r).toEqual({ ok: true, usuario: USUARIO });
  });

  it("una contraseña errónea no entra", async () => {
    expect(await iniciarSesion(sql(), { usuario: USUARIO, clave: "otra-clave" })).toEqual({ ok: false, motivo: "credenciales" });
    expect(await iniciarSesion(sql(), { usuario: USUARIO, clave: CLAVE + " " })).toEqual({ ok: false, motivo: "credenciales" });
  });

  it("un usuario que no existe recibe exactamente la misma respuesta que una clave errónea", async () => {
    const existe = await iniciarSesion(sql(), { usuario: USUARIO, clave: "mala" });
    const noExiste = await iniciarSesion(sql(), { usuario: "fantasma1", clave: "mala" });
    expect(noExiste).toEqual(existe);
  });

  it("clave o usuario vacíos o enormes no entran ni lanzan error", async () => {
    for (const [usuario, clave] of [["", CLAVE], [USUARIO, ""], ["", ""], ["x".repeat(500), "y".repeat(5000)]]) {
      expect(await iniciarSesion(sql(), { usuario, clave })).toEqual({ ok: false, motivo: "credenciales" });
    }
  });

  it("nunca escribe la contraseña en los registros", async () => {
    const espias = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    await iniciarSesion(sql(), { usuario: USUARIO, clave: "Super-Secreta-No-Registrar" });
    await iniciarSesion(sql(), { usuario: USUARIO, clave: CLAVE });
    const todo = JSON.stringify(espias.flatMap((e) => e.mock.calls));
    espias.forEach((e) => e.mockRestore());
    expect(todo).not.toContain("Super-Secreta-No-Registrar");
    expect(todo).not.toContain(CLAVE);
  });

  it("la contraseña guardada es un hash bcrypt, nunca el texto", async () => {
    const { rows } = await pool.query("SELECT password_hash FROM asesores WHERE usuario = $1", [USUARIO]);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(rows[0].password_hash).not.toContain(CLAVE);
  });
});
