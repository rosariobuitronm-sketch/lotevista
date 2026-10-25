// @vitest-environment node
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Estas pruebas SOLO usan la rama de pruebas de Neon (DATABASE_URL_TEST).
const urlPrueba = process.env.DATABASE_URL_TEST;
const urlDemo = process.env.DATABASE_URL;

const host = (url?: string) => (url ? new URL(url).hostname : "");
const leer = (archivo: string) => readFileSync(join(process.cwd(), "db", archivo), "utf8");

const TABLAS = [
  "proyectos",
  "lotes",
  "faq",
  "asesores",
  "leads",
  "lead_intereses",
  "lead_preguntas",
  "intentos_login",
  "limite_ip",
];

describe.skipIf(!urlPrueba)("esquema y datos demo (rama de pruebas)", () => {
  let pool: Pool;

  beforeAll(async () => {
    // Seguro extra: jamás correr contra la base de la demo.
    if (host(urlPrueba) === host(urlDemo)) {
      throw new Error("DATABASE_URL_TEST apunta a la misma base que DATABASE_URL: se cancela");
    }
    pool = new Pool({ connectionString: urlPrueba });
    await pool.query(leer("schema.sql"));
    await pool.query(leer("seed.sql"));
  });

  afterAll(async () => {
    await pool?.end();
  });

  const filas = async (texto: string, valores: unknown[] = []) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- filas de la BD, sin tipo fijo en pruebas
    (await pool.query(texto, valores)).rows as Record<string, any>[];

  it("el esquema y el seed se pueden ejecutar dos veces sin error ni duplicados", async () => {
    await pool.query(leer("schema.sql"));
    await pool.query(leer("seed.sql"));
    const [{ n }] = await filas("SELECT count(*)::int AS n FROM proyectos");
    expect(n).toBe(3);
  });

  it("crea las 9 tablas del ADR 0007", async () => {
    const r = await filas(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    const nombres = r.map((f) => f.table_name);
    for (const tabla of TABLAS) expect(nombres).toContain(tabla);
  });

  it("no existe ninguna columna de DNI", async () => {
    const r = await filas(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name ILIKE '%dni%'",
    );
    expect(r).toEqual([]);
  });

  it("canal_origen solo admite web, qr_sala o holograma", async () => {
    const [lead] = await filas(
      `INSERT INTO leads (celular, nombre, correo, consentimiento_aceptado, consentimiento_fecha, consentimiento_version)
       VALUES ('900000001', 'Prueba Esquema', 'prueba@example.com', true, now(), 'v1')
       ON CONFLICT (celular) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
    );
    const [proyecto] = await filas("SELECT id FROM proyectos LIMIT 1");
    try {
      for (const canal of ["web", "qr_sala", "holograma"]) {
        await pool.query(
          "INSERT INTO lead_intereses (lead_id, proyecto_id, canal_origen) VALUES ($1, $2, $3)",
          [lead.id, proyecto.id, canal],
        );
      }
      await expect(
        pool.query(
          "INSERT INTO lead_intereses (lead_id, proyecto_id, canal_origen) VALUES ($1, $2, 'facebook')",
          [lead.id, proyecto.id],
        ),
      ).rejects.toThrow();
    } finally {
      await pool.query("DELETE FROM leads WHERE id = $1", [lead.id]); // limpia en cascada
    }
  });

  it("un lead no se guarda sin consentimiento ni con celular mal formado", async () => {
    await expect(
      pool.query(
        `INSERT INTO leads (celular, nombre, correo, consentimiento_aceptado, consentimiento_fecha, consentimiento_version)
         VALUES ('900000002', 'Sin Permiso', 'a@example.com', false, now(), 'v1')`,
      ),
    ).rejects.toThrow();
    await expect(
      pool.query(
        `INSERT INTO leads (celular, nombre, correo, consentimiento_aceptado, consentimiento_fecha, consentimiento_version)
         VALUES ('12345', 'Celular Malo', 'a@example.com', true, now(), 'v1')`,
      ),
    ).rejects.toThrow();
  });

  it("el celular es único: no se pueden crear dos leads con el mismo", async () => {
    const insertar = () =>
      pool.query(
        `INSERT INTO leads (celular, nombre, correo, consentimiento_aceptado, consentimiento_fecha, consentimiento_version)
         VALUES ('900000003', 'Duplicado', 'a@example.com', true, now(), 'v1')`,
      );
    try {
      await insertar();
      await expect(insertar()).rejects.toThrow();
    } finally {
      await pool.query("DELETE FROM leads WHERE celular = '900000003'");
    }
  });

  it("el seed carga 3 proyectos con todos los datos pedidos", async () => {
    const proyectos = await filas("SELECT * FROM proyectos ORDER BY slug");
    expect(proyectos).toHaveLength(3);
    for (const p of proyectos) {
      for (const campo of [
        "slug",
        "nombre",
        "departamento",
        "provincia",
        "distrito",
        "descripcion",
        "imagen_url",
        "servicios",
        "habilitacion_urbana",
        "financiamiento",
        "entrega",
      ]) {
        expect(String(p[campo] ?? "").trim(), `${p.slug}.${campo}`).not.toBe("");
      }
      expect(Number(p.precio_desde)).toBeGreaterThan(0);
      expect(Number(p.area_desde)).toBeGreaterThanOrEqual(90);
      expect(Number(p.area_hasta)).toBeLessThanOrEqual(200);
    }
  });

  it("cada proyecto tiene al menos 3 lotes coherentes (área = frente x fondo, 90 a 200 m²)", async () => {
    const proyectos = await filas("SELECT id, slug, precio_desde, area_desde, area_hasta FROM proyectos");
    for (const p of proyectos) {
      const lotes = await filas("SELECT * FROM lotes WHERE proyecto_id = $1", [p.id]);
      expect(lotes.length, p.slug).toBeGreaterThanOrEqual(3);
      for (const l of lotes) {
        expect(Number(l.frente_m) * Number(l.fondo_m), `${p.slug} ${l.codigo}`).toBeCloseTo(Number(l.area_m2), 2);
        expect(Number(l.area_m2)).toBeGreaterThanOrEqual(90);
        expect(Number(l.area_m2)).toBeLessThanOrEqual(200);
      }
      // "precio desde" y metraje del proyecto concuerdan con sus lotes
      expect(Number(p.precio_desde)).toBe(Math.min(...lotes.map((l) => Number(l.precio))));
      expect(Number(p.area_desde)).toBe(Math.min(...lotes.map((l) => Number(l.area_m2))));
      expect(Number(p.area_hasta)).toBe(Math.max(...lotes.map((l) => Number(l.area_m2))));
    }
  });

  it("cada proyecto tiene al menos 6 preguntas frecuentes con palabras clave", async () => {
    const proyectos = await filas("SELECT id, slug FROM proyectos");
    for (const p of proyectos) {
      const faq = await filas("SELECT * FROM faq WHERE proyecto_id = $1", [p.id]);
      expect(faq.length, p.slug).toBeGreaterThanOrEqual(6);
      for (const f of faq) {
        expect(f.respuesta.trim()).not.toBe("");
        expect(f.palabras_clave.length).toBeGreaterThan(0);
      }
    }
  });

  it("cada proyecto tiene su modelo 3D con autor, licencia libre y fuente, y el archivo existe y pesa menos de 5 MB", async () => {
    const proyectos = await filas(
      "SELECT slug, modelo_archivo, modelo_autor, modelo_licencia, modelo_fuente FROM proyectos",
    );
    const archivos = new Set<string>();
    for (const p of proyectos) {
      expect(p.modelo_archivo, p.slug).toMatch(/^\/modelos\/[\w-]+\.glb$/);
      expect(p.modelo_autor, p.slug).toBe("Kenney");
      expect(p.modelo_licencia, p.slug).toBe("CC0 1.0");
      expect(p.modelo_fuente, p.slug).toMatch(/^https:\/\/poly\.pizza\/m\//);
      const ruta = join(process.cwd(), "public", p.modelo_archivo);
      expect(existsSync(ruta), ruta).toBe(true);
      expect(statSync(ruta).size, ruta).toBeLessThan(5 * 1024 * 1024);
      archivos.add(p.modelo_archivo);
    }
    expect(archivos.size).toBe(3); // un modelo distinto por proyecto
  });

  it("los textos públicos del seed no contienen la marca interna REVISAR", async () => {
    const r = await filas(
      `SELECT 1 FROM proyectos WHERE descripcion || servicios || habilitacion_urbana || financiamiento || entrega ILIKE '%REVISAR%'
       UNION ALL SELECT 1 FROM faq WHERE respuesta ILIKE '%REVISAR%'`,
    );
    expect(r).toEqual([]);
  });
});
