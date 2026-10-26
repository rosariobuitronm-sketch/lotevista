// @vitest-environment node
import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { firmarCanal } from "@/lib/canal";

const SECRETO = "secreto-de-prueba-para-cookies-0123456789";
const guardarLead = vi.fn();
const fin = vi.fn();

vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getPool: () => ({ end: fin }),
}));
vi.mock("@/lib/leads", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/leads")>()),
  guardarLead: (...args: unknown[]) => guardarLead(...args),
}));

import { ProyectoInexistenteError } from "@/lib/leads";
import { POST } from "./route";

const valido = {
  nombre: "María Quispe",
  celular: "987 654 321",
  correo: "maria@example.com",
  consentimiento: true,
  proyecto: "algarrobos-de-sunampe",
};

const pedir = (cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json", ...cabeceras },
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );

describe("POST /api/leads", () => {
  beforeEach(() => {
    guardarLead.mockReset();
    fin.mockReset();
    vi.stubEnv("COOKIE_SECRET", SECRETO);
  });

  it("guarda un lead válido y responde con la forma { ok, datos } sin datos de ningún lead", async () => {
    guardarLead.mockResolvedValue({ leadId: 77, nuevo: true, fusionado: false });
    const res = await pedir(valido);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.datos.mensaje).toMatch(/Gracias/);
    expect(JSON.stringify(json)).not.toMatch(/77|nuevo|fusionado|leadId|987654321|maria@/);

    expect(guardarLead).toHaveBeenCalledOnce();
    const [, datos, opciones] = guardarLead.mock.calls[0];
    expect(datos).toEqual(expect.objectContaining({ celular: "987654321", correo: "maria@example.com", proyecto: "algarrobos-de-sunampe" }));
    expect(opciones).toEqual(expect.objectContaining({ canal: "web", versionConsentimiento: "2026-10-borrador-1" }));
    expect(fin).toHaveBeenCalledOnce(); // se cierra la conexión
  });

  it("responde igual aunque el celular ya existiera (no revela si la persona ya estaba registrada)", async () => {
    guardarLead.mockResolvedValueOnce({ leadId: 1, nuevo: true, fusionado: false });
    guardarLead.mockResolvedValueOnce({ leadId: 1, nuevo: false, fusionado: false });
    const a = await (await pedir(valido)).json();
    const b = await (await pedir(valido)).json();
    expect(a).toEqual(b);
  });

  it("sin consentimiento responde 400 y no guarda nada", async () => {
    for (const consentimiento of [false, undefined, "true"]) {
      const res = await pedir({ ...valido, consentimiento });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error.campos.consentimiento).toMatch(/aceptar el tratamiento/);
    }
    expect(guardarLead).not.toHaveBeenCalled();
  });

  it("con datos inválidos responde 400 con los errores por campo en español", async () => {
    const res = await pedir({ ...valido, nombre: "", celular: "123", correo: "mal" });
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.codigo).toBe("validacion");
    expect(Object.keys(error.campos).sort()).toEqual(["celular", "correo", "nombre"]);
    expect(guardarLead).not.toHaveBeenCalled();
  });

  it("rechaza campos de más, por ejemplo dni", async () => {
    const res = await pedir({ ...valido, dni: "12345678" });
    expect(res.status).toBe(400);
    expect(guardarLead).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo que no es JSON o es demasiado grande", async () => {
    expect((await pedir("esto no es json")).status).toBe(400);
    expect((await pedir("[1,2,3]")).status).toBe(400);
    expect((await pedir(JSON.stringify({ ...valido, nombre: "x".repeat(200_000) }))).status).toBe(413);
    expect(guardarLead).not.toHaveBeenCalled();
  });

  it("toma el canal de la cookie firmada y usa web si es inválida", async () => {
    guardarLead.mockResolvedValue({ leadId: 1, nuevo: true, fusionado: false });
    await pedir(valido, { cookie: `lv_canal=${await firmarCanal("holograma", SECRETO)}` });
    expect(guardarLead.mock.calls[0][2].canal).toBe("holograma");
    await pedir(valido, { cookie: "lv_canal=manipulada" });
    expect(guardarLead.mock.calls[1][2].canal).toBe("web");
  });

  it("si el servidor falla, responde un mensaje amable sin detalles técnicos", async () => {
    guardarLead.mockRejectedValue(new Error("connect ECONNREFUSED postgres://u:clave-secreta@host/db"));
    const res = await pedir(valido);
    expect(res.status).toBe(500);
    const texto = await res.text();
    expect(JSON.parse(texto).error.mensaje).toMatch(/No pudimos guardar tus datos/);
    expect(texto).not.toMatch(/ECONNREFUSED|postgres|clave-secreta/);
    expect(fin).toHaveBeenCalledOnce();
  });

  it("un proyecto inexistente responde 404 amable", async () => {
    guardarLead.mockRejectedValue(new ProyectoInexistenteError());
    const res = await pedir(valido);
    expect(res.status).toBe(404);
    expect((await res.json()).error.mensaje).toMatch(/proyecto/i);
  });
});

// Integración real, solo contra la rama de pruebas de Neon.
const urlPrueba = process.env.DATABASE_URL_TEST;
describe.skipIf(!urlPrueba)("POST /api/leads guardando de verdad (rama de pruebas)", () => {
  const celular = "910009999";
  afterAll(async () => {
    const pool = new Pool({ connectionString: urlPrueba });
    await pool.query("DELETE FROM leads WHERE celular = $1", [celular]);
    await pool.end();
  });

  it("guarda el lead y el segundo envío con el mismo celular lo actualiza sin duplicar", async () => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/db");
    vi.doUnmock("@/lib/leads");
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", urlPrueba!);
    vi.stubEnv("COOKIE_SECRET", SECRETO);
    const { POST: POSTReal } = await import("./route");
    const enviar = (extra: object) =>
      POSTReal(
        new Request("http://localhost/api/leads", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...valido, celular, ...extra }),
        }),
      );

    expect((await enviar({})).status).toBe(200);
    expect((await enviar({ proyecto: "campina-de-huaral" })).status).toBe(200);

    const pool = new Pool({ connectionString: urlPrueba });
    const leads = await pool.query("SELECT id FROM leads WHERE celular = $1", [celular]);
    const intereses = await pool.query("SELECT 1 FROM lead_intereses WHERE lead_id = $1", [leads.rows[0].id]);
    await pool.end();
    expect(leads.rows).toHaveLength(1);
    expect(intereses.rows).toHaveLength(2);
  });
});
