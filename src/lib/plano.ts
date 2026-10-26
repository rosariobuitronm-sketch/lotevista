import { formatearArea, formatearMetros, formatearSoles } from "@/lib/formato";
import type { EstadoLote, Lote } from "@/lib/proyectos";

// Geometría del plano de lotización (referencial, no a escala). Todo se dibuja en un lienzo de 1000 x 640:
// las manzanas A y B arriba, una calle curva en el medio (con un parque circular entre A y B) y la manzana C abajo.
// Cada manzana es un rectángulo con dos filas de lotes, numerados de izquierda a derecha y de arriba abajo.

export const VISTA_PLANO = {
  ancho: 1000,
  alto: 640,
  /** La calle curva ocupa, a lo ancho, la franja entre estas dos alturas. */
  calleYMin: 285,
  calleYMax: 385,
} as const;

type Rect = { x: number; y: number; ancho: number; alto: number };

export const MANZANAS_PLANO = {
  A: { x: 30, y: 40, ancho: 370, alto: 230 },
  B: { x: 600, y: 40, ancho: 370, alto: 230 },
  C: { x: 300, y: 400, ancho: 400, alto: 200 },
} satisfies Record<string, Rect>;

const SEPARACION = 6;

export type LoteDibujado = Lote & Rect;

export function distribuirLotes(lotes: Lote[]): { dibujados: LoteDibujado[]; sinUbicar: Lote[] } {
  const dibujados: LoteDibujado[] = [];
  const sinUbicar: Lote[] = [];
  const porManzana = new Map<string, Lote[]>();

  for (const lote of lotes) {
    if (lote.manzana in MANZANAS_PLANO) {
      porManzana.set(lote.manzana, [...(porManzana.get(lote.manzana) ?? []), lote]);
    } else {
      sinUbicar.push(lote);
    }
  }

  for (const [manzana, delaManzana] of porManzana) {
    const mz = MANZANAS_PLANO[manzana as keyof typeof MANZANAS_PLANO];
    const ordenados = [...delaManzana].sort((a, b) => a.numero - b.numero);
    const columnas = Math.ceil(ordenados.length / 2);
    const ancho = (mz.ancho - SEPARACION * (columnas - 1)) / columnas;
    const alto = (mz.alto - SEPARACION) / 2;
    ordenados.forEach((lote, i) => {
      const fila = Math.floor(i / columnas);
      const columna = i % columnas;
      dibujados.push({
        ...lote,
        x: mz.x + columna * (ancho + SEPARACION),
        y: mz.y + fila * (alto + SEPARACION),
        ancho,
        alto,
      });
    });
  }
  return { dibujados, sinUbicar };
}

export function contarPorEstado(lotes: Lote[]): Record<EstadoLote, number> {
  const cuenta: Record<EstadoLote, number> = { disponible: 0, separado: 0, vendido: 0 };
  for (const l of lotes) cuenta[l.estado]++;
  return cuenta;
}

/** Texto completo del lote para lectores de pantalla. */
export const descripcionLote = (l: Lote) =>
  `${l.codigo}, ${formatearArea(l.areaM2)}, ${formatearMetros(l.frenteM)} de frente por ${formatearMetros(l.fondoM)} de fondo, ${formatearSoles(l.precio)}, ${l.estado}`;

/** Lote cuyo terreno se muestra por defecto bajo la casa: el disponible más barato (el del «precio desde»). */
export function loteDeReferencia(lotes: Lote[]): Lote | null {
  if (lotes.length === 0) return null;
  const disponibles = lotes.filter((l) => l.estado === "disponible");
  if (disponibles.length === 0) return lotes[0];
  return [...disponibles].sort((a, b) => a.precio - b.precio || a.areaM2 - b.areaM2 || a.numero - b.numero)[0];
}
