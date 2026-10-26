// Actividad del visitante ANTES de dejar sus datos (ADR 0006): uso de 3D/RA y preguntas al asistente.
// Vive solo en el navegador (sessionStorage, con respaldo en memoria si está bloqueado) y se envía al
// servidor junto con el formulario, cuando existe el consentimiento. Antes de eso no se manda nada.

export type PreguntaChat = { pregunta: string; respuesta: string; sabe: boolean };
export type Actividad = { uso3d: boolean; usoRa: boolean; preguntas: PreguntaChat[] };

const MAX_PREGUNTAS = 20;
const MAX_PREGUNTA = 500;
const MAX_RESPUESTA = 2000;

const memoria = new Map<string, Actividad>();
const clave = (slug: string) => `lv:actividad:${slug}`;
const vacia = (): Actividad => ({ uso3d: false, usoRa: false, preguntas: [] });

function sanear(crudo: unknown): Actividad {
  if (!crudo || typeof crudo !== "object") return vacia();
  const c = crudo as Record<string, unknown>;
  const preguntas = Array.isArray(c.preguntas)
    ? c.preguntas
        .filter(
          (p): p is PreguntaChat =>
            !!p && typeof p.pregunta === "string" && typeof p.respuesta === "string" && typeof p.sabe === "boolean",
        )
        .map((p) => ({
          pregunta: p.pregunta.slice(0, MAX_PREGUNTA),
          respuesta: p.respuesta.slice(0, MAX_RESPUESTA),
          sabe: p.sabe,
        }))
        .slice(-MAX_PREGUNTAS)
    : [];
  return { uso3d: c.uso3d === true, usoRa: c.usoRa === true, preguntas };
}

export function leerActividad(slug: string): Actividad {
  try {
    const crudo = window.sessionStorage.getItem(clave(slug));
    return crudo ? sanear(JSON.parse(crudo)) : vacia();
  } catch {
    return memoria.get(slug) ?? vacia();
  }
}

function guardar(slug: string, actividad: Actividad) {
  memoria.set(slug, actividad);
  try {
    window.sessionStorage.setItem(clave(slug), JSON.stringify(actividad));
  } catch {
    // Almacenamiento bloqueado: se queda en memoria.
  }
}

export function marcarUso(slug: string, tipo: "3d" | "ra") {
  const a = leerActividad(slug);
  guardar(slug, tipo === "3d" ? { ...a, uso3d: true } : { ...a, usoRa: true });
}

export function agregarPregunta(slug: string, pregunta: PreguntaChat) {
  const a = leerActividad(slug);
  guardar(slug, sanear({ ...a, preguntas: [...a.preguntas, pregunta] }));
}

export function limpiarActividad(slug: string) {
  memoria.delete(slug);
  try {
    window.sessionStorage.removeItem(clave(slug));
  } catch {
    // nada que borrar
  }
}
