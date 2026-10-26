// @vitest-environment node
import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hashIp } from "@/lib/asistente/limites";

// Ítem 21: las preguntas del chat viajan con el formulario y se guardan solo con consentimiento.
// Integración real contra la rama de pruebas de Neon (sin mocks).
const urlPrueba = process.env.DATABASE_URL_TEST;
const COOKIES = "secreto-de-cookies-de-prueba-0123456789-abcdef";
const IP_SECRETO = "secreto-para-hash-de-ip-de-prueba-9876543210-xyz";

describe.skipIf(!urlPrueba)("las preguntas del chat y el lead (rama de pruebas)", () => {
  let pool: Pool;
  let POST: (r: Request) => Promise<Response>;
  let n = 0;
  let ips = 0;
  const ipsUsadas: string[] = []; // cada envío usa su propia IP para no chocar con el límite de 20 por IP
  const celular = () => `91004${String(++n).padStart(4, "0")}`;
  const limpiar = () => pool.query("DELETE FROM leads WHERE celular LIKE '91004%'");
  const base = (cel: string, extra: object = {}) => ({
    nombre: "Cliente del Chat",
    celular: cel,
    correo: "chat@example.com",
    consentimiento: true,
    proyecto: "algarrobos-de-sunampe",
    ...extra,
  });
  const enviar = (cuerpo: unknown) => {
    const ip = `10.88.0.${++ips}`;
    ipsUsadas.push(ip);
    return POST(
      new Request("http://localhost/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify(cuerpo),
      }),
    );
  };
  const preguntasDe = async (cel: string) =>
    (
      await pool.query(
        `SELECT q.pregunta, q.respuesta, q.asistente_sabia AS sabe, p.slug FROM lead_preguntas q
         JOIN leads l ON l.id = q.lead_id JOIN proyectos p ON p.id = q.proyecto_id WHERE l.celular = $1 ORDER BY q.id`,
        [cel],
      )
    ).rows;
  const hayLead = async (cel: string) => (await pool.query("SELECT 1 FROM leads WHERE celular = $1", [cel])).rowCount === 1;

  beforeAll(async () => {
    pool = new Pool({ connectionString: urlPrueba });
    await limpiar();
    vi.stubEnv("DATABASE_URL", urlPrueba!);
    vi.stubEnv("COOKIE_SECRET", COOKIES);
    vi.stubEnv("IP_HASH_SECRET", IP_SECRETO);
    POST = (await import("./route")).POST;
  });
  afterAll(async () => {
    await limpiar();
    for (const ip of ipsUsadas) await pool.query("DELETE FROM limite_ip WHERE ip_hash = $1", [hashIp(`leads|${ip}`, IP_SECRETO)]);
    await pool.end();
    vi.unstubAllEnvs();
  });

  it("con consentimiento, el chat se guarda con su proyecto, la respuesta y si el asistente sabía", async () => {
    const cel = celular();
    const res = await enviar(
      base(cel, {
        preguntas: [
          { pregunta: "¿Cuánto cuesta?", respuesta: "Desde S/ 37,200.", sabe: true },
          { pregunta: "¿Hay piscina?", respuesta: "No tengo esa información registrada.", sabe: false },
        ],
      }),
    );
    expect(res.status).toBe(200);
    expect(await preguntasDe(cel)).toEqual([
      { pregunta: "¿Cuánto cuesta?", respuesta: "Desde S/ 37,200.", sabe: true, slug: "algarrobos-de-sunampe" },
      { pregunta: "¿Hay piscina?", respuesta: "No tengo esa información registrada.", sabe: false, slug: "algarrobos-de-sunampe" },
    ]);
  });

  it("sin consentimiento no se guarda ninguna pregunta ni el lead", async () => {
    for (const consentimiento of [false, undefined, "true", null]) {
      const cel = celular();
      const res = await enviar(base(cel, { consentimiento, preguntas: [{ pregunta: "¿Dónde?", respuesta: "Aquí.", sabe: true }] }));
      expect(res.status).toBe(400);
      expect(await preguntasDe(cel)).toEqual([]);
      expect(await hayLead(cel)).toBe(false);
    }
  });

  it("si la persona no usó el chat, el lead se guarda igual", async () => {
    const cel = celular();
    expect((await enviar(base(cel))).status).toBe(200);
    expect((await enviar(base(celular(), { preguntas: [] }))).status).toBe(200);
    expect(await hayLead(cel)).toBe(true);
    expect(await preguntasDe(cel)).toEqual([]);
  });

  it("se limitan la cantidad y el tamaño de las preguntas", async () => {
    const una = { pregunta: "¿Hola?", respuesta: "Hola.", sabe: true };
    const cel = celular();
    expect((await enviar(base(cel, { preguntas: Array.from({ length: 21 }, () => una) }))).status).toBe(400);
    expect((await enviar(base(cel, { preguntas: [{ ...una, pregunta: "x".repeat(501) }] }))).status).toBe(400);
    expect((await enviar(base(cel, { preguntas: [{ ...una, respuesta: "x".repeat(2001) }] }))).status).toBe(400);
    expect(await hayLead(cel)).toBe(false); // nada se guardó
    expect((await enviar(base(cel, { preguntas: Array.from({ length: 20 }, (_, i) => ({ ...una, pregunta: `Pregunta ${i}` })) }))).status).toBe(200);
    expect(await preguntasDe(cel)).toHaveLength(20);
  });

  it("un texto malicioso en una pregunta se guarda tal cual, como texto", async () => {
    const cel = celular();
    await enviar(base(cel, { preguntas: [{ pregunta: "<script>alert(1)</script>", respuesta: "<img src=x onerror=alert(2)>", sabe: true }] }));
    const [p] = await preguntasDe(cel);
    expect(p.pregunta).toBe("<script>alert(1)</script>");
    expect(p.respuesta).toBe("<img src=x onerror=alert(2)>");
  });

  it("un segundo envío del mismo celular agrega las preguntas nuevas sin borrar las anteriores", async () => {
    const cel = celular();
    await enviar(base(cel, { preguntas: [{ pregunta: "Primera", respuesta: "Uno.", sabe: true }] }));
    await enviar(base(cel, { proyecto: "campina-de-huaral", preguntas: [{ pregunta: "Segunda", respuesta: "Dos.", sabe: true }] }));
    const r = await preguntasDe(cel);
    expect(r.map((x) => [x.pregunta, x.slug])).toEqual([
      ["Primera", "algarrobos-de-sunampe"],
      ["Segunda", "campina-de-huaral"],
    ]);
  });
});
