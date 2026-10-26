import { describe, expect, it } from "vitest";
import { distribuirLotes, VISTA_PLANO } from "@/lib/plano";
import type { EstadoLote, Lote } from "@/lib/proyectos";
import {
  CAMARA_INICIAL,
  COLORES_ESTADO,
  crearEscenaMaqueta,
  ESCALA_MAQUETA,
  escalaCasa,
  LIMITES_CAMARA,
  objetivoCamara,
  planoAMundo,
} from "@/lib/maqueta";

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

const lotes22: Lote[] = [
  ...Array.from({ length: 8 }, (_, i) => crear("A", i + 1, i === 2 ? "vendido" : i === 5 ? "separado" : "disponible")),
  ...Array.from({ length: 8 }, (_, i) => crear("B", i + 1)),
  ...Array.from({ length: 6 }, (_, i) => crear("C", i + 1)),
];

describe("colores de estado", () => {
  it("usan los de la marca: disponible verde, separado ámbar, vendido gris", () => {
    expect(COLORES_ESTADO).toEqual({ disponible: "#2BB673", separado: "#F2A900", vendido: "#9CA3AF" });
  });
});

describe("crearEscenaMaqueta (los mismos lotes del plano, ahora en 3D)", () => {
  const escena = crearEscenaMaqueta(lotes22);

  it("genera un bloque de terreno por lote, con el color de su estado", () => {
    expect(escena.lotes).toHaveLength(22);
    for (const l of escena.lotes) {
      expect(l.color).toBe(COLORES_ESTADO[l.lote.estado]);
      expect(l.ancho).toBeGreaterThan(1);
      expect(l.fondo).toBeGreaterThan(1);
      expect(l.altura).toBeGreaterThan(0);
    }
    const colores = new Set(escena.lotes.map((l) => l.color));
    expect(colores).toEqual(new Set(Object.values(COLORES_ESTADO)));
  });

  it("conserva el orden y la ubicación relativa del plano (A y B arriba, C abajo; izquierda a derecha)", () => {
    const por = (codigo: string) => escena.lotes.find((l) => l.lote.codigo === codigo)!;
    expect(por("Mz. A - Lt. 1").x).toBeLessThan(por("Mz. A - Lt. 4").x);
    expect(por("Mz. A - Lt. 1").z).toBeLessThan(por("Mz. A - Lt. 5").z); // la fila 2 está más cerca de la cámara (+z)
    expect(por("Mz. A - Lt. 1").x).toBeLessThan(por("Mz. B - Lt. 1").x);
    expect(por("Mz. C - Lt. 1").z).toBeGreaterThan(por("Mz. A - Lt. 5").z); // la manzana C está al otro lado de la calle
  });

  it("coincide con el plano 2D: cada bloque está donde el plano dibuja su lote", () => {
    const plano = distribuirLotes(lotes22).dibujados;
    for (const p of plano) {
      const b = escena.lotes.find((l) => l.lote.codigo === p.codigo)!;
      const [x, z] = planoAMundo(p.x + p.ancho / 2, p.y + p.alto / 2);
      expect(b.x).toBeCloseTo(x, 5);
      expect(b.z).toBeCloseTo(z, 5);
      expect(b.ancho).toBeCloseTo(p.ancho * ESCALA_MAQUETA, 5);
      expect(b.fondo).toBeCloseTo(p.alto * ESCALA_MAQUETA, 5);
    }
  });

  it("los bloques no se superponen", () => {
    const l = escena.lotes;
    for (let i = 0; i < l.length; i++) {
      for (let j = i + 1; j < l.length; j++) {
        const sup = Math.abs(l[i].x - l[j].x) < (l[i].ancho + l[j].ancho) / 2 - 0.001 && Math.abs(l[i].z - l[j].z) < (l[i].fondo + l[j].fondo) / 2 - 0.001;
        expect(sup, `${l[i].lote.codigo} con ${l[j].lote.codigo}`).toBe(false);
      }
    }
  });

  it("incluye una calle curva (que cruza todo el ancho) y un parque circular entre las manzanas A y B", () => {
    expect(escena.calle.puntos.length).toBeGreaterThanOrEqual(20);
    const xs = escena.calle.puntos.map((p) => p[0]);
    expect(Math.min(...xs)).toBeLessThan(-24); // sale por la izquierda
    expect(Math.max(...xs)).toBeGreaterThan(24); // y por la derecha
    const zs = escena.calle.puntos.map((p) => p[1]);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(1); // no es una recta
    expect(escena.calle.ancho).toBeGreaterThan(1.5);
    const a = escena.lotes.find((l) => l.lote.codigo === "Mz. A - Lt. 4")!;
    const b = escena.lotes.find((l) => l.lote.codigo === "Mz. B - Lt. 1")!;
    expect(escena.parque.x).toBeGreaterThan(a.x);
    expect(escena.parque.x).toBeLessThan(b.x);
    expect(escena.parque.radio).toBeGreaterThan(2);
  });

  it("pone árboles sencillos sin taparse con lotes ni con el parque", () => {
    expect(escena.arboles.length).toBeGreaterThanOrEqual(10);
    for (const a of escena.arboles) {
      expect(Number.isFinite(a.x + a.z)).toBe(true);
      expect(a.escala).toBeGreaterThan(0.5);
      expect(Math.hypot(a.x - escena.parque.x, a.z - escena.parque.z), "dentro del parque").toBeGreaterThan(escena.parque.radio);
      for (const l of escena.lotes) {
        const dentro = Math.abs(a.x - l.x) < l.ancho / 2 + 0.2 && Math.abs(a.z - l.z) < l.fondo / 2 + 0.2;
        expect(dentro, `árbol (${a.x}, ${a.z}) sobre ${l.lote.codigo}`).toBe(false);
      }
    }
  });

  it("es determinista: las mismas entradas dan la misma escena", () => {
    expect(crearEscenaMaqueta(lotes22)).toEqual(crearEscenaMaqueta(lotes22));
  });

  it("funciona con pocos lotes o ninguno y no dibuja manzanas desconocidas", () => {
    expect(crearEscenaMaqueta([]).lotes).toEqual([]);
    expect(crearEscenaMaqueta([crear("A", 1), crear("Z", 1)]).lotes).toHaveLength(1);
    expect(crearEscenaMaqueta([]).arboles.length).toBeGreaterThan(0); // el entorno se dibuja igual
  });

  it("el suelo cubre todo el plano con un margen", () => {
    expect(escena.suelo.ancho).toBeGreaterThan(VISTA_PLANO.ancho * ESCALA_MAQUETA);
    expect(escena.suelo.fondo).toBeGreaterThan(VISTA_PLANO.alto * ESCALA_MAQUETA);
  });
});

describe("cámara orbital", () => {
  const escena = crearEscenaMaqueta(lotes22);

  it("empieza viendo toda la maqueta desde arriba, dentro de los límites", () => {
    const [x, y, z] = CAMARA_INICIAL.posicion;
    const distancia = Math.hypot(x, y, z);
    expect(distancia).toBeGreaterThan(LIMITES_CAMARA.distanciaMin);
    expect(distancia).toBeLessThan(LIMITES_CAMARA.distanciaMax);
    expect(y).toBeGreaterThan(5);
  });

  it("tiene límites para no perderse: no baja del suelo, no se aleja demasiado y no se acerca de más", () => {
    expect(LIMITES_CAMARA.anguloMaxPolar).toBeLessThan(Math.PI / 2); // nunca por debajo del terreno
    expect(LIMITES_CAMARA.distanciaMin).toBeGreaterThan(2);
    expect(LIMITES_CAMARA.distanciaMax).toBeLessThan(120);
    expect(LIMITES_CAMARA.movimientoMaxX).toBeGreaterThan(10);
    expect(LIMITES_CAMARA.movimientoMaxZ).toBeGreaterThan(8);
  });

  it("al elegir un lote, la cámara vuela hacia él: lo mira de frente y desde arriba, a una distancia cómoda", () => {
    for (const l of escena.lotes) {
      const { posicion, objetivo } = objetivoCamara(l);
      expect(objetivo[0]).toBeCloseTo(l.x, 5);
      expect(objetivo[2]).toBeCloseTo(l.z, 5);
      expect(posicion[1]).toBeGreaterThan(objetivo[1] + 3); // desde arriba
      expect(posicion[2]).toBeGreaterThan(objetivo[2]); // del lado de la calle (hacia +z)
      const distancia = Math.hypot(posicion[0] - objetivo[0], posicion[1] - objetivo[1], posicion[2] - objetivo[2]);
      expect(distancia).toBeGreaterThanOrEqual(LIMITES_CAMARA.distanciaMin);
      expect(distancia).toBeLessThanOrEqual(LIMITES_CAMARA.distanciaMax);
    }
  });
});

describe("escalaCasa (la casa de referencia sobre el lote, a escala aproximada)", () => {
  const bloque = { ancho: 4.4, fondo: 5.6 };

  it("la casa cabe en el bloque con margen y mantiene su proporción", () => {
    const e = escalaCasa({ ancho: 1.31, fondo: 1.31 }, bloque);
    expect(1.31 * e).toBeLessThanOrEqual(bloque.ancho * 0.75);
    expect(1.31 * e).toBeGreaterThan(bloque.ancho * 0.5); // no queda minúscula
  });

  it("una casa ancha se limita por el ancho del lote y una profunda por el fondo", () => {
    const ancha = escalaCasa({ ancho: 1.74, fondo: 1.01 }, bloque);
    expect(1.74 * ancha).toBeLessThanOrEqual(bloque.ancho * 0.75);
    const honda = escalaCasa({ ancho: 1, fondo: 3 }, bloque);
    expect(3 * honda).toBeLessThanOrEqual(bloque.fondo * 0.75);
  });

  it("con tamaños inválidos devuelve 1 en vez de fallar", () => {
    expect(escalaCasa({ ancho: 0, fondo: 1 }, bloque)).toBe(1);
    expect(escalaCasa({ ancho: Number.NaN, fondo: 1 }, bloque)).toBe(1);
  });
});
