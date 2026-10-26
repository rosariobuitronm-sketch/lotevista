// Formatos de precios y medidas para mostrar en pantalla (solo español de Perú).

const numero = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export const formatearSoles = (n: number) => `S/ ${numero(n)}`;

export const formatearArea = (n: number) => `${numero(n)} m²`;

export const formatearMetros = (n: number) => `${numero(n)} m`;

export const formatearRangoArea = (desde: number, hasta: number) =>
  desde === hasta ? formatearArea(desde) : `${numero(desde)} – ${formatearArea(hasta)}`;

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Fecha y hora en hora de Lima (UTC-5, sin horario de verano), por ejemplo "21 oct 2026, 3:30 p. m.". */
export function formatearFechaHora(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const lima = new Date(t - 5 * 3600_000);
  const hora24 = lima.getUTCHours();
  const hora12 = hora24 % 12 === 0 ? 12 : hora24 % 12;
  const minutos = String(lima.getUTCMinutes()).padStart(2, "0");
  const sufijo = hora24 < 12 ? "a. m." : "p. m.";
  return `${lima.getUTCDate()} ${MESES[lima.getUTCMonth()]} ${lima.getUTCFullYear()}, ${hora12}:${minutos} ${sufijo}`;
}
