import { normalizarTexto } from "@/lib/asistente/faq";
import type { Generador } from "@/lib/asistente/gemini";
import { MARCA_DATOS } from "@/lib/asistente/instruccion";

// Gemini SIMULADO para las pruebas (y para probar sin gastar cuota): lee los datos del proyecto que vienen en la
// instrucción y contesta por temas. Prueba la tubería del asistente; NO mide la calidad del modelo real
// (eso se mide aparte con scripts/evaluar-asistente.mjs).
const soles = (n: number) => `S/ ${n.toLocaleString("en-US")}`;
const responder = (respuesta: string, sabe = true) => JSON.stringify({ respuesta, sabe });

export function crearGeminiSimulado(): Generador {
  return async (instruccion, pregunta) => {
    const datos = JSON.parse(instruccion.split(MARCA_DATOS)[1]);
    const q = ` ${normalizarTexto(pregunta)} `;
    const tema = (...palabras: string[]) => palabras.some((p) => q.includes(` ${p} `));

    if (tema("donde", "ubicado", "queda", "ubicacion")) return responder(`${datos.nombre} está en ${datos.ubicacion}.`);
    if (tema("cuesta", "precio", "barato")) return responder(`Los lotes parten desde ${soles(datos.precio_desde)}.`);
    if (tema("servicios", "agua", "luz", "desague")) return responder(datos.servicios);
    if (tema("financiamiento", "cuota", "cuotas", "inicial", "pagar")) return responder(datos.financiamiento);
    if (tema("entregan", "entrega", "cuando")) return responder(datos.entrega);
    if (tema("metros", "tamano", "area", "m2", "grande")) {
      const mayor = Math.max(...datos.lotes.map((l: { area_m2: number }) => l.area_m2));
      return responder(`Los lotes van de ${datos.area_desde_m2} a ${datos.area_hasta_m2} m²; el más grande tiene ${mayor} m².`);
    }
    if (tema("casa", "vivienda", "incluida", "incluye")) {
      return responder("No. La empresa vende únicamente el lote; la casa en 3D es solo una imagen referencial.");
    }
    if (tema("habilitacion")) return responder(datos.habilitacion_urbana);
    return responder("", false);
  };
}
