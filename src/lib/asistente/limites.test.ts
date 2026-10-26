// @vitest-environment node
import { Pool } from "@neondatabase/serverless";
import { SignJWT } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSql } from "@/lib/db";
import {
  firmarContador,
  hashIp,
  ipDeLaPeticion,
  LIMITE_IP,
  LIMITE_SESION,
  leerContador,
  registrarPreguntaPorIp,
  sesionPermitida,
  VENTANA_IP_HORAS,
} from "@/lib/asistente/limites";

const SECRETO = "secreto-de-cookies-de-prueba-0123456789-abcdef";
const OTRO = "otro-secreto-de-prueba-distinto-9876543210-zzzz";

describe("límites configurables", () => {
  it("son 20 preguntas por sesión, 500 por IP y una ventana de 24 horas", () => {
    expect(LIMITE_SESION).toBe(20);
    expect(LIMITE_IP).toBe(500);
    expect(VENTANA_IP_HORAS).toBe(24);
  });
});

describe("contador de sesión (cookie firmada)", () => {
  it("una cookie firmada se lee de vuelta", async () => {
    for (const n of [0, 1, 7, 19, 20]) expect(await leerContador(await firmarContador(n, SECRETO), SECRETO)).toBe(n);
  });

  it("si falta, está manipulada, vencida o firmada con otro secreto, el contador vuelve a 0", async () => {
    expect(await leerContador(undefined, SECRETO)).toBe(0);
    expect(await leerContador("", SECRETO)).toBe(0);
    expect(await leerContador("basura", SECRETO)).toBe(0);
    expect(await leerContador(await firmarContador(19, OTRO), SECRETO)).toBe(0);
    const [a, , c] = (await firmarContador(19, SECRETO)).split(".");
    expect(await leerContador(`${a}.${Buffer.from('{"n":0}').toString("base64url")}.${c}`, SECRETO)).toBe(0);
    const vencida = await new SignJWT({ n: 19 })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRETO));
    expect(await leerContador(vencida, SECRETO)).toBe(0);
  });

  it("rechaza contadores absurdos (negativos, decimales o no numéricos)", async () => {
    const firmar = (n: unknown) =>
      new SignJWT({ n }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(new TextEncoder().encode(SECRETO));
    for (const n of [-5, 2.5, "9", null, 10_000_000]) expect(await leerContador(await firmar(n), SECRETO), String(n)).toBe(0);
  });

  it("sin secreto no se puede firmar y leer devuelve 0", async () => {
    await expect(firmarContador(1, undefined)).rejects.toThrow();
    expect(await leerContador(await firmarContador(5, SECRETO), undefined)).toBe(0);
  });

  it("se permiten 20 preguntas por sesión y la 21 se bloquea", () => {
    for (let hechas = 0; hechas < 20; hechas++) expect(sesionPermitida(hechas), `ya hizo ${hechas}`).toBe(true);
    expect(sesionPermitida(20)).toBe(false); // la pregunta 21
    expect(sesionPermitida(35)).toBe(false);
  });
});

describe("hashIp (HMAC-SHA256 con IP_HASH_SECRET)", () => {
  it("es estable, de 64 caracteres, y no contiene la IP", () => {
    const h = hashIp("190.12.34.56", SECRETO);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(hashIp("190.12.34.56", SECRETO));
    expect(h).not.toContain("190");
  });

  it("cambia con la IP y con el secreto", () => {
    expect(hashIp("1.1.1.1", SECRETO)).not.toBe(hashIp("1.1.1.2", SECRETO));
    expect(hashIp("1.1.1.1", SECRETO)).not.toBe(hashIp("1.1.1.1", OTRO));
  });

  it("sin secreto falla (nunca se guarda la IP sin proteger)", () => {
    expect(() => hashIp("1.1.1.1", undefined)).toThrow();
    expect(() => hashIp("1.1.1.1", "")).toThrow();
  });
});

describe("ipDeLaPeticion", () => {
  const con = (cabeceras: Record<string, string>) => ipDeLaPeticion(new Headers(cabeceras));
  it("toma la primera dirección de x-forwarded-for, luego x-real-ip, y si no hay usa un valor fijo", () => {
    expect(con({ "x-forwarded-for": "190.1.2.3, 10.0.0.1" })).toBe("190.1.2.3");
    expect(con({ "x-forwarded-for": "  190.1.2.3  " })).toBe("190.1.2.3");
    expect(con({ "x-real-ip": "200.4.5.6" })).toBe("200.4.5.6");
    expect(con({})).toBe("desconocida");
    expect(con({ "x-forwarded-for": "" })).toBe("desconocida");
  });
});

// Solo la rama de pruebas de Neon.
const urlPrueba = process.env.DATABASE_URL_TEST;
describe.skipIf(!urlPrueba)("límite por IP (rama de pruebas)", () => {
  let pool: Pool;
  const sql = () => getSql(urlPrueba);
  // La hora de la prueba es la actual: así la limpieza de "filas de más de 24 h" que hacen otras pruebas en paralelo
  // (con su propia hora) nunca borra estas filas a mitad de camino.
  const T0 = new Date();
  const horas = (h: number) => new Date(T0.getTime() + h * 3600_000);
  const limpiar = () => pool.query("DELETE FROM limite_ip WHERE ip_hash LIKE 'test-ip-%'");
  const fila = async (hash: string) => (await pool.query("SELECT * FROM limite_ip WHERE ip_hash = $1", [hash])).rows[0];

  beforeAll(async () => {
    if (new URL(urlPrueba!).hostname === new URL(process.env.DATABASE_URL ?? "http://x").hostname) {
      throw new Error("DATABASE_URL_TEST apunta a la misma base que DATABASE_URL: se cancela");
    }
    pool = new Pool({ connectionString: urlPrueba });
    await limpiar();
  });
  afterAll(async () => {
    await limpiar();
    await pool.end();
  });

  it("la primera pregunta se permite y cuenta 1; las siguientes suman", async () => {
    expect(await registrarPreguntaPorIp(sql(), "test-ip-a", T0)).toEqual({ permitido: true, contador: 1 });
    expect(await registrarPreguntaPorIp(sql(), "test-ip-a", T0)).toEqual({ permitido: true, contador: 2 });
  });

  it("se permiten 500 preguntas por IP y la 501 se bloquea", async () => {
    await pool.query("INSERT INTO limite_ip (ip_hash, ventana_inicio, contador) VALUES ('test-ip-b', $1, 499)", [T0]);
    expect(await registrarPreguntaPorIp(sql(), "test-ip-b", T0)).toEqual({ permitido: true, contador: 500 }); // la 500
    expect(await registrarPreguntaPorIp(sql(), "test-ip-b", T0)).toEqual({ permitido: false, contador: 501 }); // la 501
  });

  it("el límite se puede cambiar", async () => {
    const r = [];
    for (let i = 0; i < 4; i++) r.push((await registrarPreguntaPorIp(sql(), "test-ip-c", T0, 3)).permitido);
    expect(r).toEqual([true, true, true, false]);
  });

  it("las filas con más de 24 horas se borran en cada escritura (limpieza perezosa)", async () => {
    await pool.query("INSERT INTO limite_ip (ip_hash, ventana_inicio, contador) VALUES ('test-ip-vieja', $1, 40)", [horas(-25)]);
    await pool.query("INSERT INTO limite_ip (ip_hash, ventana_inicio, contador) VALUES ('test-ip-reciente', $1, 40)", [horas(-23)]);
    await registrarPreguntaPorIp(sql(), "test-ip-d", T0);
    expect(await fila("test-ip-vieja")).toBeUndefined();
    expect(await fila("test-ip-reciente")).toBeDefined(); // 23 h: todavía vale
  });

  it("pasadas 24 horas la IP empieza una ventana nueva (el bloqueo termina)", async () => {
    await pool.query("INSERT INTO limite_ip (ip_hash, ventana_inicio, contador) VALUES ('test-ip-e', $1, 600)", [horas(-1)]);
    expect((await registrarPreguntaPorIp(sql(), "test-ip-e", T0)).permitido).toBe(false); // sigue bloqueada
    // Se simula el paso del tiempo retrocediendo el inicio de la ventana. (Nunca se adelanta el reloj: la limpieza de
    // "filas de más de 24 h" también borraría las filas recientes que otras pruebas crean en paralelo.)
    await pool.query("UPDATE limite_ip SET ventana_inicio = $1 WHERE ip_hash = 'test-ip-e'", [horas(-25)]);
    expect(await registrarPreguntaPorIp(sql(), "test-ip-e", T0)).toEqual({ permitido: true, contador: 1 });
  });

  it("solo guarda el hash, el inicio de la ventana y el contador: ni IP real ni contenido", async () => {
    const hash = hashIp("190.12.34.56", SECRETO);
    await registrarPreguntaPorIp(sql(), hash, T0);
    const { rows } = await pool.query("SELECT * FROM limite_ip WHERE ip_hash = $1", [hash]);
    expect(Object.keys(rows[0]).sort()).toEqual(["contador", "ip_hash", "ventana_inicio"]);
    expect(JSON.stringify(rows[0])).not.toContain("190.12.34.56");
    await pool.query("DELETE FROM limite_ip WHERE ip_hash = $1", [hash]);
  });

  it("cinco preguntas simultáneas se cuentan las cinco", async () => {
    const r = await Promise.all(Array.from({ length: 5 }, () => registrarPreguntaPorIp(sql(), "test-ip-f", T0)));
    expect(r.map((x) => x.contador).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
