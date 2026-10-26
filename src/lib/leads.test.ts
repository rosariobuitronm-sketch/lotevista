// @vitest-environment node
import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardarLead, ProyectoInexistenteError } from "@/lib/leads";
import type { DatosLead } from "@/lib/lead-schema";

// Solo la rama de pruebas de Neon. Todos los celulares de esta prueba empiezan con 91000 y se limpian al terminar.
const urlPrueba = process.env.DATABASE_URL_TEST;
const T0 = new Date("2026-10-20T15:00:00Z");
const minutos = (m: number) => new Date(T0.getTime() + m * 60_000);
const opciones = (extra: Partial<{ canal: "web" | "qr_sala" | "holograma"; ahora: Date }> = {}) => ({
  canal: "web" as const,
  versionConsentimiento: "v-test",
  ahora: T0,
  ...extra,
});

let contador = 0;
const celularNuevo = () => `91000${String(++contador).padStart(4, "0")}`;

const lead = (extra: Partial<DatosLead> = {}): DatosLead => ({
  nombre: "Lead de Prueba",
  celular: celularNuevo(),
  correo: "prueba@example.com",
  horario: undefined,
  consentimiento: true,
  proyecto: "algarrobos-de-sunampe",
  uso3d: false,
  usoRa: false,
  preguntas: [],
  ...extra,
});

describe.skipIf(!urlPrueba)("guardar y actualizar leads (rama de pruebas)", () => {
  let pool: Pool;
  const filas = async (texto: string, valores: unknown[] = []) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- filas de la BD en pruebas
    (await pool.query(texto, valores)).rows as Record<string, any>[];
  const limpiar = () => pool.query("DELETE FROM leads WHERE celular LIKE '91000%'");

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

  it("un lead nuevo se guarda con sus datos, consentimiento (fecha y versión), interés y fechas", async () => {
    const datos = lead({ nombre: "Ana Torres", horario: "Mañanas", uso3d: true });
    const r = await guardarLead(pool, datos, opciones({ canal: "qr_sala" }));
    expect(r).toEqual(expect.objectContaining({ nuevo: true, fusionado: false }));

    const [l] = await filas("SELECT * FROM leads WHERE celular = $1", [datos.celular]);
    expect(l).toEqual(
      expect.objectContaining({
        nombre: "Ana Torres",
        correo: "prueba@example.com",
        horario_preferido: "Mañanas",
        consentimiento_aceptado: true,
        consentimiento_version: "v-test",
      }),
    );
    expect(new Date(l.consentimiento_fecha).getTime()).toBe(T0.getTime());
    expect(new Date(l.creado_en).getTime()).toBe(T0.getTime());
    expect(new Date(l.ultimo_contacto).getTime()).toBe(T0.getTime());

    const intereses = await filas(
      "SELECT i.*, p.slug FROM lead_intereses i JOIN proyectos p ON p.id = i.proyecto_id WHERE lead_id = $1",
      [l.id],
    );
    expect(intereses).toHaveLength(1);
    expect(intereses[0]).toEqual(expect.objectContaining({ slug: "algarrobos-de-sunampe", canal_origen: "qr_sala", uso_3d: true, uso_ra: false }));
  });

  it("guarda las preguntas del chat con su proyecto, respuesta y si el asistente sabía", async () => {
    const datos = lead({
      preguntas: [
        { pregunta: "¿Hay agua?", respuesta: "Sí, agua potable.", sabe: true },
        { pregunta: "¿Me hacen descuento?", respuesta: "Un asesor te ayudará.", sabe: false },
      ],
    });
    await guardarLead(pool, datos, opciones());
    const r = await filas(
      `SELECT q.pregunta, q.respuesta, q.asistente_sabia, p.slug FROM lead_preguntas q
       JOIN leads l ON l.id = q.lead_id JOIN proyectos p ON p.id = q.proyecto_id
       WHERE l.celular = $1 ORDER BY q.id`,
      [datos.celular],
    );
    expect(r).toEqual([
      { pregunta: "¿Hay agua?", respuesta: "Sí, agua potable.", asistente_sabia: true, slug: "algarrobos-de-sunampe" },
      { pregunta: "¿Me hacen descuento?", respuesta: "Un asesor te ayudará.", asistente_sabia: false, slug: "algarrobos-de-sunampe" },
    ]);
  });

  it("el mismo celular no crea otro lead: agrega interés y preguntas, actualiza el último contacto y no borra nada", async () => {
    const celular = celularNuevo();
    const primero = lead({
      celular,
      nombre: "Rosa Díaz",
      preguntas: [{ pregunta: "¿Dónde queda?", respuesta: "En Sunampe.", sabe: true }],
    });
    await guardarLead(pool, primero, opciones());

    const segundo = lead({
      celular,
      nombre: "Otro Nombre Escrito",
      correo: "otro@example.com",
      proyecto: "campina-de-huaral",
      usoRa: true,
      preguntas: [{ pregunta: "¿Hay financiamiento?", respuesta: "Sí.", sabe: true }],
    });
    const r = await guardarLead(pool, segundo, opciones({ ahora: minutos(120), canal: "holograma" }));
    expect(r).toEqual(expect.objectContaining({ nuevo: false, fusionado: false }));

    expect(await filas("SELECT 1 FROM leads WHERE celular = $1", [celular])).toHaveLength(1);
    const [l] = await filas("SELECT * FROM leads WHERE celular = $1", [celular]);
    expect(l.nombre).toBe("Rosa Díaz"); // no se pisan los datos originales
    expect(l.correo).toBe("prueba@example.com");
    expect(new Date(l.creado_en).getTime()).toBe(T0.getTime());
    expect(new Date(l.ultimo_contacto).getTime()).toBe(minutos(120).getTime());

    const intereses = await filas(
      "SELECT p.slug, i.canal_origen, i.uso_ra FROM lead_intereses i JOIN proyectos p ON p.id = i.proyecto_id WHERE lead_id = $1 ORDER BY i.id",
      [l.id],
    );
    expect(intereses).toEqual([
      { slug: "algarrobos-de-sunampe", canal_origen: "web", uso_ra: false },
      { slug: "campina-de-huaral", canal_origen: "holograma", uso_ra: true },
    ]);
    const preguntas = await filas("SELECT pregunta FROM lead_preguntas WHERE lead_id = $1 ORDER BY id", [l.id]);
    expect(preguntas.map((p) => p.pregunta)).toEqual(["¿Dónde queda?", "¿Hay financiamiento?"]);
  });

  it("el horario se actualiza solo si llega uno nuevo", async () => {
    const celular = celularNuevo();
    await guardarLead(pool, lead({ celular, horario: "Tardes" }), opciones());
    await guardarLead(pool, lead({ celular, horario: undefined, proyecto: "campina-de-huaral" }), opciones({ ahora: minutos(60) }));
    expect((await filas("SELECT horario_preferido h FROM leads WHERE celular = $1", [celular]))[0].h).toBe("Tardes");
    await guardarLead(pool, lead({ celular, horario: "Noches", proyecto: "jardines-del-chira" }), opciones({ ahora: minutos(120) }));
    expect((await filas("SELECT horario_preferido h FROM leads WHERE celular = $1", [celular]))[0].h).toBe("Noches");
  });

  it("dos envíos del mismo lead y proyecto en menos de 10 minutos se fusionan", async () => {
    const celular = celularNuevo();
    const pregunta = { pregunta: "¿Hay agua?", respuesta: "Sí.", sabe: true };
    await guardarLead(pool, lead({ celular, uso3d: true, preguntas: [pregunta] }), opciones());
    const r = await guardarLead(
      pool,
      lead({ celular, usoRa: true, preguntas: [pregunta, { pregunta: "¿Y luz?", respuesta: "Sí.", sabe: true }] }),
      opciones({ ahora: minutos(5) }),
    );
    expect(r).toEqual(expect.objectContaining({ nuevo: false, fusionado: true }));

    const [l] = await filas("SELECT id FROM leads WHERE celular = $1", [celular]);
    const intereses = await filas("SELECT uso_3d, uso_ra FROM lead_intereses WHERE lead_id = $1", [l.id]);
    expect(intereses).toEqual([{ uso_3d: true, uso_ra: true }]); // un solo interés, con las marcas sumadas
    const preguntas = await filas("SELECT pregunta FROM lead_preguntas WHERE lead_id = $1 ORDER BY id", [l.id]);
    expect(preguntas.map((p) => p.pregunta)).toEqual(["¿Hay agua?", "¿Y luz?"]); // sin duplicar la repetida
  });

  it("pasados 10 minutos, el mismo proyecto sí agrega otro interés", async () => {
    const celular = celularNuevo();
    await guardarLead(pool, lead({ celular }), opciones());
    const r = await guardarLead(pool, lead({ celular }), opciones({ ahora: minutos(11) }));
    expect(r).toEqual(expect.objectContaining({ fusionado: false }));
    const [l] = await filas("SELECT id FROM leads WHERE celular = $1", [celular]);
    expect(await filas("SELECT 1 FROM lead_intereses WHERE lead_id = $1", [l.id])).toHaveLength(2);
  });

  it("dos envíos simultáneos (doble clic) no duplican el lead ni el interés", async () => {
    const celular = celularNuevo();
    const [a, b] = await Promise.all([
      guardarLead(pool, lead({ celular }), opciones()),
      guardarLead(pool, lead({ celular }), opciones()),
    ]);
    expect([a, b].filter((r) => r.nuevo)).toHaveLength(1);
    expect(await filas("SELECT 1 FROM leads WHERE celular = $1", [celular])).toHaveLength(1);
    const [l] = await filas("SELECT id FROM leads WHERE celular = $1", [celular]);
    expect(await filas("SELECT 1 FROM lead_intereses WHERE lead_id = $1", [l.id])).toHaveLength(1);
  });

  it("sin consentimiento no se guarda nada", async () => {
    const datos = lead();
    await expect(guardarLead(pool, { ...datos, consentimiento: false } as unknown as DatosLead, opciones())).rejects.toThrow(/consentimiento/i);
    expect(await filas("SELECT 1 FROM leads WHERE celular = $1", [datos.celular])).toHaveLength(0);
  });

  it("un proyecto inexistente no guarda nada", async () => {
    const datos = lead({ proyecto: "no-existe" });
    await expect(guardarLead(pool, datos, opciones())).rejects.toBeInstanceOf(ProyectoInexistenteError);
    expect(await filas("SELECT 1 FROM leads WHERE celular = $1", [datos.celular])).toHaveLength(0);
  });

  it("todo ocurre en una transacción: si algo falla a mitad, no queda un lead a medias", async () => {
    const datos = lead({ preguntas: [{ pregunta: "¿Hola?", respuesta: "Hola.", sabe: true }] });
    // El canal inválido hace fallar el INSERT del interés, que ocurre DESPUÉS de crear el lead.
    await expect(
      guardarLead(pool, datos, { ...opciones(), canal: "facebook" as unknown as "web" }),
    ).rejects.toThrow();
    expect(await filas("SELECT 1 FROM leads WHERE celular = $1", [datos.celular])).toHaveLength(0);
  });
});
