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
    expect(p!.lotes.length).toBe(22);
    expect(p!.lotes[0]).toEqual(
      expect.objectContaining({
        codigo: "Mz. A - Lt. 1",
        manzana: "A",
        numero: 1,
        areaM2: expect.any(Number),
        precio: expect.any(Number),
        estado: expect.stringMatching(/^(disponible|separado|vendido)$/),
      }),
    );
    expect(p!.faq.length).toBeGreaterThanOrEqual(6);
    expect(Array.isArray(p!.faq[0].palabrasClave)).toBe(true);
    expect(p!.modeloArchivo).toBe("/modelos/casa-sunampe.glb");
  });

  it("los lotes vienen ordenados por manzana y número, como en el plano", async () => {
    const p = await obtenerProyecto("campina-de-huaral", sql());
    const claves = p!.lotes.map((l) => [l.manzana, l.numero] as const);
    const ordenadas = [...claves].sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]);
    expect(claves).toEqual(ordenadas);
    expect(p!.lotes[0].codigo).toBe("Mz. A - Lt. 1");
    expect(p!.lotes.at(-1)!.codigo).toBe("Mz. C - Lt. 6");
  });

  it("un slug inexistente o raro devuelve null sin lanzar error", async () => {
    expect(await obtenerProyecto("no-existe", sql())).toBeNull();
    expect(await obtenerProyecto("'; DROP TABLE proyectos; --", sql())).toBeNull();
    expect(await obtenerProyecto("", sql())).toBeNull();
  });
});
