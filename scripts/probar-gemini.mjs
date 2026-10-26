// Prueba manual: ¿qué modelos de Gemini responden con tu clave y qué tan rápido?
// Uso: node --env-file=.env.local scripts/probar-gemini.mjs [modelo[:nivel] ...]   (nunca imprime la clave)
//   modelo:nivel  prueba el modelo con thinkingLevel (minimal, low, medium, high); modelo:presupuesto0 usa thinkingBudget 0.
//   VECES=3 repite cada prueba; TIEMPO=15000 es el máximo de espera por llamada (en ms).
const args = process.argv.slice(2).length ? process.argv.slice(2) : ["gemini-3.5-flash:minimal", "gemini-3.5-flash:low", "gemini-3.5-flash-lite"];
const veces = Number(process.env.VECES ?? 2);
const tiempoMax = Number(process.env.TIEMPO ?? 15000);

const cuerpoBase = {
  systemInstruction: {
    parts: [{ text: 'Eres un asistente. Responde SOLO con JSON {"respuesta":"texto","sabe":true}. Datos: el lote cuesta S/ 37,200.' }],
  },
  contents: [{ role: "user", parts: [{ text: "¿Cuánto cuesta el lote?" }] }],
};

for (const arg of args) {
  const [modelo, nivel] = arg.split(":");
  const thinkingConfig = !nivel ? undefined : nivel === "presupuesto0" ? { thinkingBudget: 0 } : { thinkingLevel: nivel };
  const tiempos = [];
  let detalle = "";
  for (let i = 0; i < veces; i++) {
    const t0 = Date.now();
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          ...cuerpoBase,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: { respuesta: { type: "STRING" }, sabe: { type: "BOOLEAN" } },
              required: ["respuesta", "sabe"],
            },
            ...(thinkingConfig ? { thinkingConfig } : {}),
          },
        }),
        signal: AbortSignal.timeout(tiempoMax),
      });
      const j = await r.json();
      const texto = j.candidates?.[0]?.content?.parts?.[0]?.text;
      tiempos.push(`${r.status}:${Date.now() - t0}ms`);
      detalle = texto ? texto.slice(0, 60).replace(/\n/g, " ") : (j.error?.message ?? "").slice(0, 80);
    } catch (e) {
      tiempos.push(`${e.name === "TimeoutError" ? "TIEMPO>" + tiempoMax : "ERROR"}`);
    }
  }
  console.log(`${arg.padEnd(30)} ${tiempos.join("  ")}   ${detalle}`);
}
