// Formatos de precios y medidas para mostrar en pantalla (solo español de Perú).

const numero = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export const formatearSoles = (n: number) => `S/ ${numero(n)}`;

export const formatearArea = (n: number) => `${numero(n)} m²`;

export const formatearMetros = (n: number) => `${numero(n)} m`;

export const formatearRangoArea = (desde: number, hasta: number) =>
  desde === hasta ? formatearArea(desde) : `${numero(desde)} – ${formatearArea(hasta)}`;
