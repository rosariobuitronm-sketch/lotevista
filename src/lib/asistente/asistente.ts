import { buscarEnFaq } from "@/lib/asistente/faq";
import type { Generador } from "@/lib/asistente/gemini";
import { pideNegociarOAgendar } from "@/lib/asistente/guardas";
import { construirInstruccion } from "@/lib/asistente/instruccion";
import { MENSAJE_DERIVACION, parsearRespuestaModelo } from "@/lib/asistente/respuesta";
import type { ProyectoDetalle } from "@/lib/proyectos";

// Lógica del asistente (ADR 0005): responde solo con los datos del proyecto, deriva a un asesor ante la duda,
// y si la IA falla, se agota la cuota o tarda más de 8 segundos, usa el FAQ. El cliente nunca ve un error técnico.

export const TIEMPO_MAX_MS = 8000;

export type OrigenRespuesta = "ia" | "faq" | "derivacion";
export type RespuestaAsistente = { respuesta: string; sabe: boolean; origen: OrigenRespuesta };

const derivacion = (): RespuestaAsistente => ({ respuesta: MENSAJE_DERIVACION, sabe: false, origen: "derivacion" });

export async function responderPregunta(args: {
  pregunta: string;
  proyecto: ProyectoDetalle;
  generar: Generador;
  tiempoMaxMs?: number;
}): Promise<RespuestaAsistente> {
  const { pregunta, proyecto, generar, tiempoMaxMs = TIEMPO_MAX_MS } = args;

  // Negociar o agendar nunca lo resuelve la IA: se deriva sin llamarla.
  if (pideNegociarOAgendar(pregunta)) return derivacion();

  const control = new AbortController();
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    reloj = setTimeout(() => {
      control.abort();
      rechazar(new Error("tiempo agotado"));
    }, tiempoMaxMs);
  });

  // La IA falló, no hay cuota, tardó demasiado o devolvió texto dañado: respaldo de FAQ y, si no hay coincidencia, derivación.
  const respaldo = (): RespuestaAsistente => {
    const entrada = buscarEnFaq(pregunta, proyecto.faq);
    return entrada ? { respuesta: entrada.respuesta, sabe: true, origen: "faq" } : derivacion();
  };

  let texto: string;
  try {
    texto = await Promise.race([generar(construirInstruccion(proyecto), pregunta, { signal: control.signal }), limite]);
  } catch {
    return respaldo();
  } finally {
    clearTimeout(reloj);
  }

  const parseada = parsearRespuestaModelo(texto);
  if (!parseada || !parseada.sabe) return derivacion(); // formato inválido o «no sé»
  // Visto con la IA real: a veces devuelve letras corruptas (carácter de reemplazo). Nunca se le muestra al cliente.
  if (parseada.respuesta.includes("�")) return respaldo();
  return { respuesta: parseada.respuesta, sabe: true, origen: "ia" };
}
