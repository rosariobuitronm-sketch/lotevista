import { normalizarTexto } from "@/lib/asistente/faq";

// Barrera previa a la IA: el asistente no negocia precios, descuentos ni promociones y no agenda citas ni visitas.
// Si la pregunta lo pide, se deriva a un asesor sin llamar a Gemini (más seguro y no gasta cuota).
const PATRONES = [
  /\bdescuentos?\b/,
  /\brebaj\w*/,
  /\bpromocion(es)?\b/,
  /\bofertas?\b/,
  /\bnegoci\w*/,
  /\bregate\w*/,
  /\bmejor precio\b/,
  /\bprecio (final|especial)\b/,
  /\bdej\w* mas (barato|economico)\b/,
  /\bcitas?\b/,
  /\bagend\w*/,
  /\bprogramar\b/,
  /\bvisit\w*/,
  /\breserv\w*/,
  /\bseparar\b/,
  /\bseparacion\b/,
  /\bapartar\b/,
  /\bcoordinar\b/,
];

export function pideNegociarOAgendar(pregunta: string): boolean {
  const texto = normalizarTexto(pregunta);
  return PATRONES.some((p) => p.test(texto));
}
