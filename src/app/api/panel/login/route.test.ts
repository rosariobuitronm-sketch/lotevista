// @vitest-environment node
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { verificarSesion } from "@/lib/auth";

const AUTH = "auth-secreto-de-prueba-0123456789-abcdefghij";
const urlPrueba = process.env.DATABASE_URL_TEST;
const USUARIO = "asesor_ruta_test";
const CLAVE = "Clave-Ruta-456";

const pedir = (POST: (r: Request) => Promise<Response>, cuerpo: unknown) =>
  POST(
    new Request("http://localhost/api/panel/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );

describe.skipIf(!urlPrueba)("POST /api/panel/login y /logout (rama de pruebas)", () => {
  let pool: Pool;
  let login: (r: Request) => Promise<Response>;
  let logout: (r: Request) => Promise<Response>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: urlPrueba });
    await pool.query(
      `INSERT INTO asesores (usuario, password_hash) VALUES ($1, $2)
       ON CONFLICT (usuario) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [USUARIO, await bcrypt.hash(CLAVE, 4)],
    );
    vi.stubEnv("DATABASE_URL", urlPrueba!);
    vi.stubEnv("AUTH_SECRET", AUTH);
    login = (await import("./route")).POST;
    logout = (await import("../logout/route")).POST;
  });

  beforeEach(async () => {
    await pool.query("DELETE FROM intentos_login WHERE usuario LIKE 'asesor_ruta_test%' OR usuario LIKE 'fantasma%'");
  });

  afterAll(async () => {
    await pool.query("DELETE FROM asesores WHERE usuario = $1", [USUARIO]);
    await pool.query("DELETE FROM intentos_login WHERE usuario LIKE 'asesor_ruta_test%' OR usuario LIKE 'fantasma%'");
    await pool.end();
    vi.unstubAllEnvs();
  });

  it("con credenciales correctas responde 200 y entrega una cookie httpOnly, secure, lax de 8 horas", async () => {
    const res = await pedir(login, { usuario: USUARIO, clave: CLAVE });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, datos: { usuario: USUARIO } });

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^lv_sesion=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=28800/);
    expect(cookie).toMatch(/Path=\//);

    const token = cookie.split(";")[0].split("=")[1];
    expect(await verificarSesion(token, AUTH)).toEqual({ usuario: USUARIO });
    expect(cookie).not.toContain(CLAVE);
  });

  it("credenciales erróneas: 401 con el mensaje único y sin cookie", async () => {
    for (const cuerpo of [
      { usuario: USUARIO, clave: "mala" },
      { usuario: "fantasma1", clave: CLAVE },
    ]) {
      const res = await pedir(login, cuerpo);
      expect(res.status).toBe(401);
      expect(res.headers.get("set-cookie")).toBeNull();
      const json = await res.json();
      expect(json).toEqual({ ok: false, error: { codigo: "credenciales", mensaje: "Usuario o contraseña incorrectos" } });
    }
  });

  it("no devuelve la contraseña ni el hash en ninguna respuesta", async () => {
    const res = await pedir(login, { usuario: USUARIO, clave: CLAVE });
    const texto = JSON.stringify(await res.json()) + (res.headers.get("set-cookie") ?? "");
    expect(texto).not.toContain(CLAVE);
    expect(texto).not.toMatch(/\$2[aby]\$/);
  });

  it("cuerpos inválidos responden 400 sin lanzar error", async () => {
    for (const cuerpo of ["no es json", "[]", "{}", { usuario: USUARIO }, { usuario: USUARIO, clave: 123 }, { usuario: USUARIO, clave: CLAVE, extra: 1 }]) {
      const res = await pedir(login, cuerpo);
      expect(res.status).toBe(400);
      expect(res.headers.get("set-cookie")).toBeNull();
    }
  });

  it("cerrar sesión borra la cookie", async () => {
    const res = await logout(new Request("http://localhost/api/panel/logout", { method: "POST" }));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^lv_sesion=;/);
    expect(cookie).toMatch(/Max-Age=0/);
    expect(cookie).toMatch(/HttpOnly/i);
  });
});
