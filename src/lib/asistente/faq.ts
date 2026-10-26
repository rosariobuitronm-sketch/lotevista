import type { Faq } from "@/lib/proyectos";

/** Minúsculas, sin tildes ni signos, con espacios simples. */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Respaldo cuando la IA falla (ADR 0005): busca por palabras clave completas y elige la entrada con más coincidencias. */
export function buscarEnFaq(pregunta: string, faq: Faq[]): Faq | null {
  const q = ` ${normalizarTexto(pregunta)} `;
  if (q.trim() === "") return null;
  let mejor: Faq | null = null;
  let mejorPuntaje = 0;
  for (const entrada of faq) {
    const puntaje = entrada.palabrasClave.filter((clave) => {
      const k = normalizarTexto(clave);
      return k !== "" && q.includes(` ${k} `);
    }).length;
    if (puntaje > mejorPuntaje) {
      mejor = entrada;
      mejorPuntaje = puntaje;
    }
  }
  return mejor;
}
