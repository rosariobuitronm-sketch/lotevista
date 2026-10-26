import { distribuirLotes, VISTA_PLANO } from "@/lib/plano";
import type { EstadoLote, Lote } from "@/lib/proyectos";

// Maqueta 3D del proyecto: se arma con los MISMOS lotes y la misma distribución que el plano 2D, así lo que se ve en 3D
// coincide con el plano. Aquí solo hay cálculos (sin three.js), para poder probarlos; el dibujo está en Maqueta3D.tsx.
// Igual que el plano, no está a escala real: es una representación referencial.

export const ESCALA_MAQUETA = 0.05; // 1 unidad del plano = 0,05 unidades del mundo 3D
export const ALTURA_BLOQUE = 0.35;

export const COLORES_ESTADO: Record<EstadoLote, string> = {
  disponible: "#2BB673",
  separado: "#F2A900",
  vendido: "#9CA3AF",
};

/** Convierte un punto del plano (1000 x 640) al mundo 3D: el centro del plano es el origen; el plano "y" pasa a ser "z". */
export const planoAMundo = (px: number, py: number): [number, number] => [
  (px - VISTA_PLANO.ancho / 2) * ESCALA_MAQUETA,
  (py - VISTA_PLANO.alto / 2) * ESCALA_MAQUETA,
];

export type Lote3D = {
  lote: Lote;
  x: number;
  z: number;
  ancho: number;
  fondo: number;
  altura: number;
  color: string;
};

export type EscenaMaqueta = {
  lotes: Lote3D[];
  parque: { x: number; z: number; radio: number };
  calle: { puntos: [number, number][]; ancho: number };
  arboles: { x: number; z: number; escala: number }[];
  suelo: { ancho: number; fondo: number };
};

// Calle curva del plano (la misma curva de Bézier que dibuja el SVG).
const CALLE_PLANO = { p0: [-20, 340], c1: [250, 260], c2: [600, 420], p3: [1020, 300] } as const;
const ANCHO_CALLE_PLANO = 60;
const PARQUE_PLANO = { x: 500, y: 150, radio: 70 };

// Posiciones (en el plano) de los árboles: alrededor del parque, entre las manzanas y en los bordes. Ninguna cae sobre un lote.
const ARBOLES_PLANO: [number, number][] = [
  ...[0, 60, 120, 180, 240, 300].map((g): [number, number] => [
    PARQUE_PLANO.x + 85 * Math.cos((g * Math.PI) / 180),
    PARQUE_PLANO.y + 85 * Math.sin((g * Math.PI) / 180),
  ]),
  [415, 100], [585, 100], [415, 200], [585, 200], [500, 45],
  [150, 500], [220, 560], [250, 460], [750, 470], [780, 570], [850, 500], [120, 420], [880, 430],
  [200, 20], [800, 20], [60, 600], [940, 610],
];

function puntosDeLaCalle(cantidad = 40): [number, number][] {
  const { p0, c1, c2, p3 } = CALLE_PLANO;
  const puntos: [number, number][] = [];
  for (let i = 0; i <= cantidad; i++) {
    const t = i / cantidad;
    const u = 1 - t;
    const px = u ** 3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * p3[0];
    const py = u ** 3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * p3[1];
    puntos.push(planoAMundo(px, py));
  }
  return puntos;
}

export function crearEscenaMaqueta(lotes: Lote[]): EscenaMaqueta {
  const { dibujados } = distribuirLotes(lotes);
  const [parqueX, parqueZ] = planoAMundo(PARQUE_PLANO.x, PARQUE_PLANO.y);
  return {
    lotes: dibujados.map((d) => {
      const [x, z] = planoAMundo(d.x + d.ancho / 2, d.y + d.alto / 2);
      const { x: _x, y: _y, ancho: _a, alto: _h, ...lote } = d;
      void _x; void _y; void _a; void _h;
      return {
        lote: lote as Lote,
        x,
        z,
        ancho: d.ancho * ESCALA_MAQUETA,
        fondo: d.alto * ESCALA_MAQUETA,
        altura: ALTURA_BLOQUE,
        color: COLORES_ESTADO[d.estado],
      };
    }),
    parque: { x: parqueX, z: parqueZ, radio: PARQUE_PLANO.radio * ESCALA_MAQUETA },
    calle: { puntos: puntosDeLaCalle(), ancho: ANCHO_CALLE_PLANO * ESCALA_MAQUETA },
    arboles: ARBOLES_PLANO.map(([px, py], i) => {
      const [x, z] = planoAMundo(px, py);
      return { x, z, escala: 0.8 + 0.1 * (i % 4) };
    }),
    suelo: { ancho: (VISTA_PLANO.ancho + 900) * ESCALA_MAQUETA, fondo: (VISTA_PLANO.alto + 800) * ESCALA_MAQUETA },
  };
}

// ---- Cámara orbital ----

export const CAMARA_INICIAL = { posicion: [0, 40, 30] as [number, number, number], objetivo: [0, 0, 0] as [number, number, number] };

/** Límites para que nadie se pierda: no baja del terreno, no se aleja ni se acerca de más y no se sale de la maqueta. */
export const LIMITES_CAMARA = {
  distanciaMin: 5,
  distanciaMax: 100,
  anguloMaxPolar: 1.35, // radianes (~77°): nunca llega al horizonte ni pasa por debajo del terreno
  movimientoMaxX: 24,
  movimientoMaxZ: 16,
};

/** A dónde vuela la cámara al elegir un lote: lo mira de frente (desde la calle) y desde arriba. */
export function objetivoCamara(l: Pick<Lote3D, "x" | "z">): { posicion: [number, number, number]; objetivo: [number, number, number] } {
  return {
    objetivo: [l.x, 0.4, l.z],
    posicion: [l.x + 2, 7.5, l.z + 9.5],
  };
}

/** Escala (pareja) para que la casa de referencia quepa sobre el bloque del lote con margen: a escala aproximada. */
export function escalaCasa(casa: { ancho: number; fondo: number }, bloque: { ancho: number; fondo: number }): number {
  if (!(casa.ancho > 0) || !(casa.fondo > 0) || !Number.isFinite(casa.ancho + casa.fondo)) return 1;
  return Math.min((0.72 * bloque.ancho) / casa.ancho, (0.72 * bloque.fondo) / casa.fondo);
}
