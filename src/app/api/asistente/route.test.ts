// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorGemini, type Generador } from "@/lib/asistente/gemini";
import { crearGeminiSimulado } from "@/lib/asistente/gemini-simulado";
import { firmarContador, hashIp, COOKIE_ASISTENTE } from "@/lib/asistente/limites";

// Nunca se usa la clave real de Gemini: se reemplaza el generador por uno simulado.
const COOKIES = "secreto-de-cookies-de-prueba-0123456789-abcdef";
const IP_SECRETO = "secreto-para-hash-de-ip-de-prueba-9876543210-xyz";
const CLAVE_FALSA = "AIza-clave-falsa-que-nunca-debe-aparecer-123";
const urlPrueba = process.env.DATABASE_URL_TEST;

let generadorActual: Generador = crearGeminiSimulado();
vi.mock("@/lib/asistente/gemini", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/asistente/gemini")>()),
  crearGeneradorGemini: () => (...args: Parameters<Generador>) => generadorActual(...args),
}));

const IP = "203.0.113.77";
const pedir = (POST: (r: Request) => Promise<Response>, cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/asistente", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": IP, ...cabeceras },
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );
const valido = { proyecto: "algarrobos-de-sunampe", pregunta: "¿Dónde queda el proyecto?" };

describe.skipIf(!urlPrueba)("POST /api/asistente (rama de pruebas, Gemini simulado)", () => {
  let pool: Pool;
  let POST: (r: Request) => Promise<Response>;
  const hashDeIp = () => hashIp(IP, IP_SECRETO);
  const limpiarIp = () => pool.query("DELETE FROM limite_ip WHERE ip_hash = $1", [hashDeIp()]);

  beforeAll(async () => {
    pool = new Pool({ connectionString: urlPrueba });
    vi.stubEnv("DATABASE_URL", urlPrueba!);
    vi.stubEnv("COOKIE_SECRET", COOKIES);
    vi.stubEnv("IP_HASH_SECRET", IP_SECRETO);
    vi.stubEnv("GEMINI_API_KEY", CLAVE_FALSA);
    POST = (await import("./route")).POST;
  });
  beforeEach(async () => {
    generadorActual = crearGeminiSimulado();
    await limpiarIp();
  });
  afterAll(async () => {
    await limpiarIp();
    await pool.end();
    vi.unstubAllEnvs();
  });

  it("responde { ok, datos } con la respuesta del asistente y cuenta la pregunta en una cookie firmada", async () => {
    const res = await pedir(POST, valido);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.datos).toEqual({ respuesta: expect.stringMatching(/Sunampe/), sabe: true, origen: "ia", restantes: 19 });
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(new RegExp(`^${COOKIE_ASISTENTE}=`));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it("valida la entrada y limita el largo de la pregunta", async () => {
    const casos: unknown[] = [
      "no es json",
      "[]",
      {},
      { proyecto: "algarrobos-de-sunampe" },
      { pregunta: "hola" },
      { ...valido, pregunta: "" },
      { ...valido, pregunta: "   " },
      { ...valido, pregunta: "x".repeat(301) },
      { ...valido, pregunta: 42 },
      { ...valido, proyecto: "../../etc" },
      { ...valido, dni: "12345678" },
    ];
    for (const caso of casos) {
      const res = await pedir(POST, caso);
      expect(res.status, JSON.stringify(caso)).toBe(400);
      expect((await res.json()).ok).toBe(false);
    }
    expect((await pedir(POST, { ...valido, pregunta: "x".repeat(300) })).status).toBe(200); // justo en el límite
    expect((await pedir(POST, JSON.stringify({ ...valido, pregunta: "x".repeat(20_000) }))).status).toBe(413);
  });

  it("un proyecto inexistente responde 404 amable", async () => {
    const res = await pedir(POST, { ...valido, proyecto: "proyecto-que-no-existe" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.mensaje).toMatch(/proyecto/i);
  });

  it("tras 20 preguntas en la sesión, la 21 responde el aviso del límite y no llama a la IA", async () => {
    const generar = vi.fn(crearGeminiSimulado());
    generadorActual = generar;
    const cookie = `${COOKIE_ASISTENTE}=${await firmarContador(20, COOKIES)}`;
    const res = await pedir(POST, valido, { cookie });
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.codigo).toBe("limite_sesion");
    expect(json.error.mensaje).toMatch(/límite de preguntas/);
    expect(json.error.mensaje).toMatch(/formulario/);
    expect(generar).not.toHaveBeenCalled();
    // con 19 hechas todavía se puede (es la pregunta 20)
    const ok = await pedir(POST, valido, { cookie: `${COOKIE_ASISTENTE}=${await firmarContador(19, COOKIES)}` });
    expect(ok.status).toBe(200);
    expect((await ok.json()).datos.restantes).toBe(0);
  });

  it("al llegar a 500 preguntas por IP en 24 h, la 501 se bloquea", async () => {
    await pool.query("INSERT INTO limite_ip (ip_hash, ventana_inicio, contador) VALUES ($1, now(), 500)", [hashDeIp()]);
    const res = await pedir(POST, valido);
    expect(res.status).toBe(429);
    expect((await res.json()).error.codigo).toBe("limite_ip");
  });

  it("no guarda preguntas ni respuestas: solo el contador por IP en hash", async () => {
    // Se busca ESTA pregunta en concreto (otras pruebas en paralelo también crean leads, así que no sirve contar filas).
    const marca = "Pregunta-única-" + Date.now();
    await pedir(POST, { ...valido, pregunta: `¿Cuánto cuesta el lote más barato? ${marca} mi celular es 987654321` });
    const guardadas = await pool.query("SELECT 1 FROM lead_preguntas WHERE pregunta LIKE $1 OR respuesta LIKE $1", [`%${marca}%`]);
    expect(guardadas.rowCount).toBe(0);
    const { rows } = await pool.query("SELECT * FROM limite_ip WHERE ip_hash = $1", [hashDeIp()]);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(["contador", "ip_hash", "ventana_inicio"]);
    expect(JSON.stringify(rows[0])).not.toMatch(/987654321|cuesta|203.0.113|Pregunta-única/);
  });

  it("con la IA caída responde el FAQ y el cliente nunca ve un error técnico", async () => {
    for (const falla of [
      new ErrorGemini("cuota", "429"),
      new ErrorGemini("servicio", "503"),
      new ErrorGemini("red", "fetch failed"),
      new Error(`connect ECONNREFUSED con la clave ${CLAVE_FALSA}`),
    ]) {
      generadorActual = async () => {
        throw falla;
      };
      await limpiarIp();
      const res = await pedir(POST, { ...valido, pregunta: "¿Qué servicios tiene? ¿hay agua y luz?" });
      expect(res.status).toBe(200);
      const texto = await res.text();
      expect(JSON.parse(texto).datos.origen).toBe("faq");
      expect(texto).not.toMatch(/ECONNREFUSED|fetch failed|429|503|AIza/);
    }
  });

  it("sin coincidencia en el FAQ y con la IA caída, deriva a un asesor", async () => {
    generadorActual = async () => {
      throw new ErrorGemini("cuota", "429");
    };
    const json = await (await pedir(POST, { ...valido, pregunta: "¿Hay piscina?" })).json();
    expect(json.datos).toEqual(expect.objectContaining({ sabe: false, origen: "derivacion" }));
    expect(json.datos.respuesta).toMatch(/asesor/);
  });

  it("negociar o agendar se deriva sin llamar a la IA", async () => {
    const generar = vi.fn(crearGeminiSimulado());
    generadorActual = generar;
    const json = await (await pedir(POST, { ...valido, pregunta: "¿Me haces un descuento y agendamos una cita?" })).json();
    expect(json.datos.origen).toBe("derivacion");
    expect(generar).not.toHaveBeenCalled();
  });

  it("la clave de Gemini no aparece en ninguna respuesta ni cookie", async () => {
    const res = await pedir(POST, valido);
    expect((await res.text()) + (res.headers.get("set-cookie") ?? "")).not.toContain(CLAVE_FALSA);
    const bloqueada = await pedir(POST, valido, { cookie: `${COOKIE_ASISTENTE}=${await firmarContador(20, COOKIES)}` });
    expect(await bloqueada.text()).not.toContain(CLAVE_FALSA);
  });

  it("si falta un secreto del servidor, responde un mensaje amable (nunca un error técnico)", async () => {
    vi.stubEnv("IP_HASH_SECRET", "");
    const res = await pedir(POST, valido);
    vi.stubEnv("IP_HASH_SECRET", IP_SECRETO);
    expect(res.status).toBe(503);
    const texto = await res.text();
    expect(JSON.parse(texto).error.mensaje).toMatch(/formulario/);
    expect(texto).not.toMatch(/IP_HASH_SECRET|secreto|TypeError|Falta|stack/i);
  });
});

describe("seguridad: la clave de Gemini solo existe en código de servidor", () => {
  const archivos = (dir: string): string[] =>
    readdirSync(dir).flatMap((nombre) => {
      const ruta = join(dir, nombre);
      return statSync(ruta).isDirectory() ? archivos(ruta) : /\.(ts|tsx)$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : [];
    });

  it("GEMINI_API_KEY y GEMINI_MODEL solo se leen en la ruta del servidor", () => {
    const usan = archivos(join(process.cwd(), "src")).filter((f) => /process.env.GEMINI_(API_KEY|MODEL)/.test(readFileSync(f, "utf8")));
    expect(usan.map((f) => f.replace(process.cwd(), "").replaceAll("\\", "/"))).toEqual(["/src/app/api/asistente/route.ts"]);
  });

  it("ningún componente de navegador ('use client') menciona Gemini ni claves", () => {
    const delNavegador = archivos(join(process.cwd(), "src")).filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));
    expect(delNavegador.length).toBeGreaterThan(5);
    for (const f of delNavegador) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/GEMINI|generativelanguage|x-goog-api-key|process\.env\.(?!NODE_ENV)/);
    }
  });

  it("ninguna variable pública (NEXT_PUBLIC_) expone secretos", () => {
    const todo = archivos(join(process.cwd(), "src")).map((f) => readFileSync(f, "utf8")).join("\n");
    expect(todo).not.toMatch(/NEXT_PUBLIC_(GEMINI|AUTH|COOKIE|IP_HASH|DATABASE)/);
  });
});
