// @vitest-environment node
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BLOQUEO_MINUTOS, MAX_INTENTOS } from "@/lib/bloqueo";
import { getSql } from "@/lib/db";
import { iniciarSesion } from "@/lib/login";

// Solo la rama de pruebas de Neon. El tiempo se simula con la hora inyectada: no se espera 15 minutos reales.
const urlPrueba = process.env.DATABASE_URL_TEST;
const USUARIO = "asesor_bloqueo_test";
const OTRO = "asesor_bloqueo_test2";
const CLAVE = "Clave-Bloqueo-789";
const T0 = new Date("2026-10-20T15:00:00Z");
const despues = (minutos: number, segundos = 0) => new Date(T0.getTime() + (minutos * 60 + segundos) * 1000);

describe.skipIf(!urlPrueba)("bloqueo por intentos fallidos (rama de pruebas)", { timeout: 30_000 }, () => {
  const sql = () => getSql(urlPrueba);
  let pool: Pool;
  const intentar = (usuario: string, clave: string, ahora: Date) => iniciarSesion(sql(), { usuario, clave }, ahora);
  const fallar = async (usuario: string, veces: number, ahora = T0) => {
    const resultados = [];
    for (let i = 0; i < veces; i++) resultados.push(await intentar(usuario, "clave-mala", ahora));
    return resultados;
  };
  const filaIntentos = async (usuario: string) =>
    (await pool.query("SELECT intentos_fallidos, bloqueado_hasta FROM intentos_login WHERE usuario = $1", [usuario])).rows[0];
  const limpiar = () => pool.query("DELETE FROM intentos_login WHERE usuario LIKE 'asesor_bloqueo_test%' OR usuario LIKE 'fantasma_bloqueo%'");

  beforeAll(async () => {
    if (new URL(urlPrueba!).hostname === new URL(process.env.DATABASE_URL ?? "http://x").hostname) {
      throw new Error("DATABASE_URL_TEST apunta a la misma base que DATABASE_URL: se cancela");
    }
    pool = new Pool({ connectionString: urlPrueba });
    const hash = await bcrypt.hash(CLAVE, 4);
    for (const u of [USUARIO, OTRO]) {
      await pool.query(
        `INSERT INTO asesores (usuario, password_hash) VALUES ($1, $2) ON CONFLICT (usuario) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [u, hash],
      );
    }
  });
  beforeEach(async () => {
    await limpiar();
  });
  afterAll(async () => {
    await pool.query("DELETE FROM asesores WHERE usuario LIKE 'asesor_bloqueo_test%'");
    await limpiar();
    await pool.end();
  });

  it("los límites son 5 intentos y 15 minutos", () => {
    expect(MAX_INTENTOS).toBe(5);
    expect(BLOQUEO_MINUTOS).toBe(15);
  });

  it("4 fallos no bloquean; el 5.º fallo bloquea", async () => {
    const r = await fallar(USUARIO, 5);
    expect(r.slice(0, 4).every((x) => !x.ok && x.motivo === "credenciales")).toBe(true);
    expect(r[4]).toEqual(expect.objectContaining({ ok: false, motivo: "bloqueado" }));
  });

  it("estando bloqueado, ni la contraseña correcta entra", async () => {
    await fallar(USUARIO, 5);
    const r = await intentar(USUARIO, CLAVE, despues(5));
    expect(r).toEqual(expect.objectContaining({ ok: false, motivo: "bloqueado" }));
  });

  it("el bloqueo dura 15 minutos: a los 14:59 sigue y a los 15:01 vuelve a funcionar", async () => {
    await fallar(USUARIO, 5);
    expect(await intentar(USUARIO, CLAVE, despues(14, 59))).toEqual(expect.objectContaining({ motivo: "bloqueado" }));
    expect(await intentar(USUARIO, CLAVE, despues(15, 1))).toEqual({ ok: true, usuario: USUARIO });
  });

  it("pasado el tiempo, un fallo nuevo empieza a contar desde 1 (no vuelve a bloquear de inmediato)", async () => {
    await fallar(USUARIO, 5);
    const r = await intentar(USUARIO, "mala", despues(16));
    expect(r).toEqual({ ok: false, motivo: "credenciales" });
    expect((await filaIntentos(USUARIO)).intentos_fallidos).toBe(1);
  });

  it("un login correcto reinicia el contador", async () => {
    await fallar(USUARIO, 4);
    expect(await intentar(USUARIO, CLAVE, T0)).toEqual({ ok: true, usuario: USUARIO });
    expect(await filaIntentos(USUARIO)).toBeUndefined();
    const r = await fallar(USUARIO, 4); // 4 más: sigue sin bloquear porque el contador volvió a cero
    expect(r.every((x) => !x.ok && x.motivo === "credenciales")).toBe(true);
  });

  it("los usuarios inexistentes también cuentan y reciben exactamente el mismo resultado", async () => {
    const real = await fallar(USUARIO, 5);
    const falso = await fallar("fantasma_bloqueo_1", 5);
    expect(falso).toEqual(real);
    expect(falso[4]).toEqual(expect.objectContaining({ motivo: "bloqueado" }));
    const realBloqueado = await intentar(USUARIO, CLAVE, despues(1));
    const falsoBloqueado = await intentar("fantasma_bloqueo_1", CLAVE, despues(1));
    expect(falsoBloqueado).toEqual(realBloqueado); // el mensaje de espera no revela si el usuario existe
  }, 30_000);

  it("el bloqueo es por usuario: no afecta a otros asesores", async () => {
    await fallar(USUARIO, 5);
    expect(await intentar(OTRO, CLAVE, despues(1))).toEqual({ ok: true, usuario: OTRO });
  });

  it("mayúsculas y espacios cuentan como el mismo usuario", async () => {
    await intentar(`  ${USUARIO.toUpperCase()}`, "mala", T0);
    await intentar(USUARIO, "mala", T0);
    await intentar(`${USUARIO} `, "mala", T0);
    expect((await filaIntentos(USUARIO)).intentos_fallidos).toBe(3);
  });

  it("estando bloqueado no se alarga el castigo con más intentos", async () => {
    await fallar(USUARIO, 5);
    const antes = (await filaIntentos(USUARIO)).bloqueado_hasta;
    await intentar(USUARIO, "mala", despues(10));
    expect((await filaIntentos(USUARIO)).bloqueado_hasta).toEqual(antes);
  });

  it("dos intentos fallidos simultáneos se cuentan los dos", async () => {
    await Promise.all([intentar(USUARIO, "mala", T0), intentar(USUARIO, "mala", T0), intentar(USUARIO, "mala", T0)]);
    expect((await filaIntentos(USUARIO)).intentos_fallidos).toBe(3);
  });
});
