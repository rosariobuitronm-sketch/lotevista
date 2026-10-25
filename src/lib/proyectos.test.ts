// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getSql } from "@/lib/db";
import { listarProyectos, obtenerProyecto } from "@/lib/proyectos";

// Solo la rama de pruebas de Neon, nunca la de la demo.
const urlPrueba = process.env.DATABASE_URL_TEST;

describe.skipIf(!urlPrueba)("datos de proyectos (rama de pruebas)", () => {
  const sql = () => getSql(urlPrueba);

  it("listarProyectos devuelve los 3 proyectos con los datos del catálogo", async () => {
    const proyectos = await listarProyectos(sql());
    expect(proyectos).toHaveLength(3);
    for (const p of proyectos) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(p.nombre).not.toBe("");
      expect(p.distrito).not.toBe("");
      expect(typeof p.precioDesde).toBe("number");
      expect(p.precioDesde).toBeGreaterThan(0);
      expect(p.areaDesde).toBeLessThanOrEqual(p.areaHasta);
      expect(p.imagenUrl).toMatch(/^\/proyectos\/.+\.jpg$/);
    }
  });

  it("obtenerProyecto devuelve la ficha con lotes y preguntas frecuentes", async () => {
    const p = await obtenerProyecto("algarrobos-de-sunampe", sql());
    expect(p).not.toBeNull();
    expect(p!.nombre).toBe("Algarrobos de Sunampe");
    expect(p!.lotes.length).toBeGreaterThanOrEqual(3);
    expect(p!.lotes[0]).toEqual(
      expect.objectContaining({ codigo: expect.any(String), areaM2: expect.any(Number), precio: expect.any(Number) }),
    );
    expect(p!.faq.length).toBeGreaterThanOrEqual(6);
    expect(Array.isArray(p!.faq[0].palabrasClave)).toBe(true);
    expect(p!.modeloArchivo).toBe("/modelos/casa-sunampe.glb");
  });

  it("los lotes vienen ordenados por área y luego por código", async () => {
    const p = await obtenerProyecto("campina-de-huaral", sql());
    const areas = p!.lotes.map((l) => l.areaM2);
    expect(areas).toEqual([...areas].sort((a, b) => a - b));
  });

  it("un slug inexistente o raro devuelve null sin lanzar error", async () => {
    expect(await obtenerProyecto("no-existe", sql())).toBeNull();
    expect(await obtenerProyecto("'; DROP TABLE proyectos; --", sql())).toBeNull();
    expect(await obtenerProyecto("", sql())).toBeNull();
  });
});
