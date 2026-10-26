// @vitest-environment node
import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { crearSesion } from "@/lib/auth";
import { guardarLead } from "@/lib/leads";

const AUTH = "auth-secreto-de-prueba-0123456789-abcdefghij";
const urlPrueba = process.env.DATABASE_URL_TEST;

const pedir = (GET: (r: Request) => Promise<Response>, ruta = "/api/panel/leads", cookie?: string) =>
  GET(new Request(`http://localhost${ruta}`, { headers: cookie ? { cookie } : {} }));

describe.skipIf(!urlPrueba)("GET /api/panel/leads (rama de pruebas)", () => {
  let pool: Pool;
  let GET: (r: Request) => Promise<Response>;
  let sesion: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: urlPrueba });
    await pool.query("DELETE FROM leads WHERE celular LIKE '91003%'");
    await guardarLead(
      pool,
      {
        nombre: "<img src=x onerror=alert(1)>",
        celular: "910030001",
        correo: "xss@example.com",
        horario: undefined,
        lote: undefined,
        consentimiento: true,
        proyecto: "jardines-del-chira",
        uso3d: true,
        usoRa: false,
        preguntas: [{ pregunta: "¿Hay luz?", respuesta: "Sí.", sabe: true }],
      },
      { canal: "qr_sala", versionConsentimiento: "v-test" },
    );
    vi.stubEnv("DATABASE_URL", urlPrueba!);
    vi.stubEnv("AUTH_SECRET", AUTH);
    GET = (await import("./route")).GET;
    sesion = `lv_sesion=${await crearSesion("asesor1", AUTH)}`;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM leads WHERE celular LIKE '91003%'");
    await pool.end();
    vi.unstubAllEnvs();
  });

  it("sin sesión responde 401 y no devuelve ningún dato personal", async () => {
    for (const cookie of [undefined, "lv_sesion=basura", "otra=1"]) {
      const res = await pedir(GET, "/api/panel/leads", cookie);
      expect(res.status).toBe(401);
      const texto = await res.text();
      expect(JSON.parse(texto)).toEqual({ ok: false, error: { codigo: "no_autorizado", mensaje: "Inicia sesión para continuar." } });
      expect(texto).not.toMatch(/910030001|xss@example|celular|correo/);
    }
  });

  it("con una sesión vencida o de otro secreto también responde 401", async () => {
    const vieja = await crearSesion("asesor1", AUTH, new Date(Date.now() - 9 * 3600_000));
    expect((await pedir(GET, "/api/panel/leads", `lv_sesion=${vieja}`)).status).toBe(401);
    const ajena = await crearSesion("asesor1", "otro-secreto-distinto-de-prueba-111222333444");
    expect((await pedir(GET, "/api/panel/leads", `lv_sesion=${ajena}`)).status).toBe(401);
  });

  it("con sesión devuelve { ok, datos } con los leads y su historial", async () => {
    const res = await pedir(GET, "/api/panel/leads", sesion);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    const mio = json.datos.leads.find((l: { celular: string }) => l.celular === "910030001");
    expect(mio.nombre).toBe("<img src=x onerror=alert(1)>"); // texto tal cual, nunca interpretado
    expect(mio.intereses[0]).toEqual(expect.objectContaining({ slug: "jardines-del-chira", canal: "qr_sala", uso3d: true }));
    expect(mio.preguntas[0].pregunta).toBe("¿Hay luz?");
    expect(JSON.stringify(json)).not.toMatch(/password|hash|consentimiento/i);
  });

  it("filtra por proyecto y valida el parámetro", async () => {
    const filtrado = await (await pedir(GET, "/api/panel/leads?proyecto=jardines-del-chira", sesion)).json();
    expect(filtrado.datos.leads.some((l: { celular: string }) => l.celular === "910030001")).toBe(true);
    const otro = await (await pedir(GET, "/api/panel/leads?proyecto=campina-de-huaral", sesion)).json();
    expect(otro.datos.leads.some((l: { celular: string }) => l.celular === "910030001")).toBe(false);
    expect((await pedir(GET, "/api/panel/leads?proyecto=../../etc", sesion)).status).toBe(400);
  });
});
