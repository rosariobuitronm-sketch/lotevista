import { describe, expect, it } from "vitest";
import { contarPorEstado, descripcionLote, distribuirLotes, loteDeReferencia, MANZANAS_PLANO, VISTA_PLANO } from "@/lib/plano";
import type { EstadoLote, Lote } from "@/lib/proyectos";

const crear = (manzana: string, numero: number, estado: EstadoLote = "disponible"): Lote => ({
  codigo: `Mz. ${manzana} - Lt. ${numero}`,
  manzana,
  numero,
  estado,
  areaM2: 120,
  frenteM: 8,
  fondoM: 15,
  precio: 37200,
});

const lotes22 = [
  ...Array.from({ length: 8 }, (_, i) => crear("A", i + 1)),
  ...Array.from({ length: 8 }, (_, i) => crear("B", i + 1)),
  ...Array.from({ length: 6 }, (_, i) => crear("C", i + 1)),
];

describe("distribuirLotes", () => {
  it("ubica los 22 lotes dentro de su manzana, en dos filas, sin superponerse", () => {
    const { dibujados, sinUbicar } = distribuirLotes(lotes22);
    expect(sinUbicar).toEqual([]);
    expect(dibujados).toHaveLength(22);

    for (const d of dibujados) {
      const mz = MANZANAS_PLANO[d.manzana as keyof typeof MANZANAS_PLANO];
      expect(d.x, d.codigo).toBeGreaterThanOrEqual(mz.x);
      expect(d.y, d.codigo).toBeGreaterThanOrEqual(mz.y);
      expect(d.x + d.ancho, d.codigo).toBeLessThanOrEqual(mz.x + mz.ancho + 0.001);
      expect(d.y + d.alto, d.codigo).toBeLessThanOrEqual(mz.y + mz.alto + 0.001);
      expect(d.ancho).toBeGreaterThan(40);
      expect(d.alto).toBeGreaterThan(40);
    }
    for (let i = 0; i < dibujados.length; i++) {
      for (let j = i + 1; j < dibujados.length; j++) {
        const a = dibujados[i], b = dibujados[j];
        const seSuperponen = a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;
        expect(seSuperponen, `${a.codigo} con ${b.codigo}`).toBe(false);
      }
    }
  });

  it("la manzana se numera de izquierda a derecha y de arriba abajo", () => {
    const { dibujados } = distribuirLotes(lotes22);
    const a = dibujados.filter((d) => d.manzana === "A");
    expect(a.map((d) => d.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const fila1 = a.slice(0, 4), fila2 = a.slice(4);
    expect(new Set(fila1.map((d) => d.y)).size).toBe(1);
    expect(new Set(fila2.map((d) => d.y)).size).toBe(1);
    expect(fila2[0].y).toBeGreaterThan(fila1[0].y);
    expect(fila1.map((d) => d.x)).toEqual([...fila1.map((d) => d.x)].sort((p, q) => p - q));
    expect(a[0].x).toBe(a[4].x); // el lote 5 queda justo debajo del 1
  });

  it("las manzanas A y B quedan sobre la calle y la C debajo", () => {
    const { dibujados } = distribuirLotes(lotes22);
    const y = (mz: string) => dibujados.filter((d) => d.manzana === mz).map((d) => d.y + d.alto);
    expect(Math.max(...y("A"))).toBeLessThan(VISTA_PLANO.calleYMin);
    expect(Math.max(...y("B"))).toBeLessThan(VISTA_PLANO.calleYMin);
    expect(Math.min(...dibujados.filter((d) => d.manzana === "C").map((d) => d.y))).toBeGreaterThan(VISTA_PLANO.calleYMax);
  });

  it("los lotes de una manzana desconocida no se dibujan pero se devuelven aparte", () => {
    const { dibujados, sinUbicar } = distribuirLotes([crear("A", 1), crear("Z", 1)]);
    expect(dibujados).toHaveLength(1);
    expect(sinUbicar.map((l) => l.codigo)).toEqual(["Mz. Z - Lt. 1"]);
  });

  it("funciona con una manzana de cantidad impar de lotes y con lista vacía", () => {
    const { dibujados } = distribuirLotes([crear("C", 1), crear("C", 2), crear("C", 3)]);
    expect(dibujados).toHaveLength(3);
    expect(distribuirLotes([])).toEqual({ dibujados: [], sinUbicar: [] });
  });
});

describe("contarPorEstado", () => {
  it("cuenta disponibles, separados y vendidos", () => {
    const lotes = [crear("A", 1), crear("A", 2), crear("A", 3, "separado"), crear("A", 4, "vendido"), crear("A", 5, "vendido")];
    expect(contarPorEstado(lotes)).toEqual({ disponible: 2, separado: 1, vendido: 2 });
    expect(contarPorEstado([])).toEqual({ disponible: 0, separado: 0, vendido: 0 });
  });
});

describe("descripcionLote (texto para lectores de pantalla)", () => {
  it("dice el lote, el área, las medidas, el precio y el estado", () => {
    expect(descripcionLote(crear("A", 5))).toBe("Mz. A - Lt. 5, 120 m², 8 m de frente por 15 m de fondo, S/ 37,200, disponible");
    expect(descripcionLote(crear("B", 2, "vendido"))).toMatch(/vendido$/);
  });
});

describe("loteDeReferencia (el terreno que se muestra por defecto bajo la casa)", () => {
  const con = (numero: number, estado: EstadoLote, precio: number, areaM2 = 120): Lote => ({ ...crear("A", numero, estado), precio, areaM2 });

  it("es el lote disponible más barato, es decir, el del «precio desde»", () => {
    const lotes = [con(1, "disponible", 50000), con(2, "disponible", 37200), con(3, "disponible", 62000)];
    expect(loteDeReferencia(lotes)?.numero).toBe(2);
  });

  it("ignora los lotes vendidos y separados, aunque sean más baratos", () => {
    const lotes = [con(1, "vendido", 30000), con(2, "separado", 31000), con(3, "disponible", 45000)];
    expect(loteDeReferencia(lotes)?.numero).toBe(3);
  });

  it("si hay empate de precio, prefiere el de menor área y luego el de menor número", () => {
    const lotes = [con(5, "disponible", 40000, 150), con(2, "disponible", 40000, 120), con(1, "disponible", 40000, 120)];
    expect(loteDeReferencia(lotes)?.numero).toBe(1);
  });

  it("si no hay ninguno disponible usa el primero de la lista; sin lotes devuelve null", () => {
    expect(loteDeReferencia([con(4, "vendido", 1), con(2, "separado", 2)])?.numero).toBe(4);
    expect(loteDeReferencia([])).toBeNull();
  });
});
