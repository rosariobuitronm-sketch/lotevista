// @vitest-environment node
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearAsesores, leerAsesoresDeEntorno } from "../../scripts/lib/asesores.mjs";

describe("leerAsesoresDeEntorno", () => {
  it("lee usuario y clave desde variables ASESOR_n_USUARIO / ASESOR_n_CLAVE", () => {
    const r = leerAsesoresDeEntorno({
      ASESOR_1_USUARIO: "ana",
      ASESOR_1_CLAVE: "clave-ana",
      ASESOR_2_USUARIO: "luis",
      ASESOR_2_CLAVE: "clave-luis",
    });
    expect(r).toEqual([
      { usuario: "ana", clave: "clave-ana" },
      { usuario: "luis", clave: "clave-luis" },
    ]);
  });

  it("devuelve lista vacía si no hay variables", () => {
    expect(leerAsesoresDeEntorno({})).toEqual([]);
  });

  it("falla si falta la clave o el usuario de un asesor, sin mostrar la clave", () => {
    expect(() => leerAsesoresDeEntorno({ ASESOR_1_USUARIO: "ana" })).toThrow(/ASESOR_1_CLAVE/);
    expect(() => leerAsesoresDeEntorno({ ASESOR_1_CLAVE: "secreta123" })).toThrow(/ASESOR_1_USUARIO/);
    try {
      leerAsesoresDeEntorno({ ASESOR_1_CLAVE: "secreta123" });
    } catch (e) {
      expect(String(e)).not.toContain("secreta123");
    }
  });
});

const urlPrueba = process.env.DATABASE_URL_TEST;

describe.skipIf(!urlPrueba)("crearAsesores (rama de pruebas)", () => {
  let pool: Pool;
  const USUARIO = "asesor_de_prueba_tdd";

  beforeAll(async () => {
    if (new URL(urlPrueba!).hostname === new URL(process.env.DATABASE_URL ?? "http://x").hostname) {
      throw new Error("DATABASE_URL_TEST apunta a la misma base que DATABASE_URL: se cancela");
    }
    pool = new Pool({ connectionString: urlPrueba });
    const { readFileSync } = await import("node:fs");
    await pool.query(readFileSync("db/schema.sql", "utf8"));
  });

  afterAll(async () => {
    await pool?.query("DELETE FROM asesores WHERE usuario = $1", [USUARIO]);
    await pool?.end();
  });

  it("guarda la contraseña con hash (nunca en texto plano)", async () => {
    await crearAsesores(pool, [{ usuario: USUARIO, clave: "Clave-De-Prueba-1" }]);
    const { rows } = await pool.query("SELECT password_hash FROM asesores WHERE usuario = $1", [USUARIO]);
    expect(rows).toHaveLength(1);
    expect(rows[0].password_hash).not.toContain("Clave-De-Prueba-1");
    expect(await bcrypt.compare("Clave-De-Prueba-1", rows[0].password_hash)).toBe(true);
    expect(await bcrypt.compare("otra-clave", rows[0].password_hash)).toBe(false);
  });

  it("ejecutarlo dos veces no duplica y actualiza la clave", async () => {
    await crearAsesores(pool, [{ usuario: USUARIO, clave: "Clave-De-Prueba-1" }]);
    await crearAsesores(pool, [{ usuario: USUARIO, clave: "Clave-Nueva-2" }]);
    const { rows } = await pool.query("SELECT password_hash FROM asesores WHERE usuario = $1", [USUARIO]);
    expect(rows).toHaveLength(1);
    expect(await bcrypt.compare("Clave-Nueva-2", rows[0].password_hash)).toBe(true);
  });
});
