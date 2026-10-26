// @vitest-environment node
import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { crearSesion } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { guardarLead } from "@/lib/leads";
import type { DatosLead } from "@/lib/lead-schema";
import { listarLeads, obtenerPanel } from "@/lib/panel";

// Solo la rama de pruebas de Neon. Los celulares de esta prueba empiezan con 91002 y se limpian al terminar.
const urlPrueba = process.env.DATABASE_URL_TEST;
const AUTH = "auth-secreto-de-prueba-0123456789-abcdefghij";
const T0 = new Date("2026-10-20T15:00:00Z");
const minutos = (m: number) => new Date(T0.getTime() + m * 60_000);

const lead = (extra: Partial<DatosLead>): DatosLead => ({
  nombre: "Lead",
  celular: "910020000",
  correo: "l@example.com",
  horario: undefined,
  consentimiento: true,
  proyecto: "algarrobos-de-sunampe",
  uso3d: false,
  usoRa: false,
  preguntas: [],
  ...extra,
});

describe.skipIf(!urlPrueba)("datos del panel de leads (rama de pruebas)", () => {
  let pool: Pool;
  const sql = () => getSql(urlPrueba);
  const limpiar = () => pool.query("DELETE FROM leads WHERE celular LIKE '91002%'");
  const guardar = (datos: DatosLead, ahora: Date, canal: "web" | "qr_sala" | "holograma" = "web") =>
    guardarLead(pool, datos, { canal, versionConsentimiento: "v-test", ahora });
  const mios = async (proyecto?: string) => (await listarLeads(sql(), { proyecto })).filter((l) => l.celular.startsWith("91002"));

  beforeAll(async () => {
    pool = new Pool({ connectionString: urlPrueba });
    await limpiar();
    await guardar(lead({ nombre: "Ana Antigua", celular: "910020001", horario: "Mañana (8 a. m. a 12 m.)", uso3d: true }), minutos(0), "qr_sala");
    await guardar(
      lead({
        nombre: "Beto Reciente",
        celular: "910020002",
        proyecto: "campina-de-huaral",
        usoRa: true,
        preguntas: [
          { pregunta: "¿Hay agua?", respuesta: "Sí.", sabe: true },
          { pregunta: "¿Me hacen descuento?", respuesta: "Un asesor te ayudará.", sabe: false },
        ],
      }),
      minutos(30),
      "holograma",
    );
    // Ana vuelve a escribir por otro proyecto: pasa a ser la más reciente y tiene 2 intereses
    await guardar(lead({ nombre: "Ana Antigua", celular: "910020001", proyecto: "jardines-del-chira" }), minutos(60));
  });

  afterAll(async () => {
    await limpiar();
    await pool.end();
  });

  it("lista los leads con sus datos, del contacto más reciente al más antiguo", async () => {
    const leads = await mios();
    expect(leads.map((l) => l.nombre)).toEqual(["Ana Antigua", "Beto Reciente"]);
    expect(leads[0]).toEqual(
      expect.objectContaining({ celular: "910020001", correo: "l@example.com", horario: "Mañana (8 a. m. a 12 m.)" }),
    );
    expect(new Date(leads[0].ultimoContacto).getTime()).toBe(minutos(60).getTime());
  });

  it("cada lead trae su historial de proyectos con canal, uso de 3D/RA y fecha", async () => {
    const [ana, beto] = await mios();
    expect(ana.intereses.map((i) => [i.slug, i.canal, i.uso3d, i.usoRa])).toEqual([
      ["jardines-del-chira", "web", false, false],
      ["algarrobos-de-sunampe", "qr_sala", true, false],
    ]);
    expect(beto.intereses).toEqual([expect.objectContaining({ slug: "campina-de-huaral", canal: "holograma", usoRa: true })]);
    expect(typeof beto.intereses[0].fecha).toBe("string");
  });

  it("cada lead trae las preguntas que hizo al asistente y si el asistente sabía", async () => {
    const [, beto] = await mios();
    expect(beto.preguntas.map((p) => [p.pregunta, p.sabe, p.proyecto])).toEqual([
      ["¿Hay agua?", true, "Campiña de Huaral"],
      ["¿Me hacen descuento?", false, "Campiña de Huaral"],
    ]);
  });

  it("filtra por proyecto (cualquier lead con interés en ese proyecto)", async () => {
    expect((await mios("campina-de-huaral")).map((l) => l.nombre)).toEqual(["Beto Reciente"]);
    expect((await mios("algarrobos-de-sunampe")).map((l) => l.nombre)).toEqual(["Ana Antigua"]);
    expect((await mios("jardines-del-chira")).map((l) => l.nombre)).toEqual(["Ana Antigua"]);
  });

  it("un proyecto sin leads devuelve una lista vacía (estado vacío)", async () => {
    expect(await listarLeads(sql(), { proyecto: "proyecto-sin-leads" })).toEqual([]);
  });

  it("nunca devuelve campos internos como consentimiento o el hash de ningún asesor", async () => {
    const [ana] = await mios();
    expect(Object.keys(ana).sort()).toEqual(["celular", "correo", "creadoEn", "horario", "id", "intereses", "nombre", "preguntas", "ultimoContacto"]);
  });

  it("un texto malicioso se devuelve tal cual, como texto", async () => {
    await guardar(lead({ nombre: "<script>alert('x')</script>", celular: "910020003" }), minutos(90));
    const [primero] = await mios();
    expect(primero.nombre).toBe("<script>alert('x')</script>");
  });
});

describe("obtenerPanel: sin sesión no se toca la base de datos", () => {
  it("con cookie ausente o inválida devuelve no autorizado y no hace ninguna consulta", async () => {
    const sqlEspia = vi.fn() as unknown as Parameters<typeof obtenerPanel>[0]["sql"];
    for (const token of [undefined, "", "basura"]) {
      const r = await obtenerPanel({ token, secreto: AUTH, sql: sqlEspia });
      expect(r).toEqual({ autorizado: false });
    }
    const vieja = await crearSesion("x", AUTH, new Date(Date.now() - 9 * 3600_000));
    expect(await obtenerPanel({ token: vieja, secreto: AUTH, sql: sqlEspia })).toEqual({ autorizado: false });
    expect(sqlEspia).not.toHaveBeenCalled();
  });

  it.skipIf(!urlPrueba)("con sesión válida devuelve el usuario, los leads y los proyectos para el filtro", async () => {
    const token = await crearSesion("asesor1", AUTH);
    const r = await obtenerPanel({ token, secreto: AUTH, sql: getSql(urlPrueba) });
    expect(r.autorizado).toBe(true);
    if (!r.autorizado) return;
    expect(r.usuario).toBe("asesor1");
    expect(Array.isArray(r.leads)).toBe(true);
    expect(r.proyectos.map((p) => p.slug)).toEqual(["algarrobos-de-sunampe", "campina-de-huaral", "jardines-del-chira"]);
  });
});
