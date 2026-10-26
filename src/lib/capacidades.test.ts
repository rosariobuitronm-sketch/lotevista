import { describe, expect, it, vi } from "vitest";
import { dispositivoLimitado, soportaWebGL } from "@/lib/capacidades";

const documentoCon = (contextos: Record<string, unknown>) =>
  ({ createElement: () => ({ getContext: (tipo: string) => contextos[tipo] ?? null }) }) as unknown as Document;

describe("soportaWebGL", () => {
  it("es verdadero si el navegador crea un contexto webgl2 o webgl", () => {
    expect(soportaWebGL(documentoCon({ webgl2: {} }))).toBe(true);
    expect(soportaWebGL(documentoCon({ webgl: {} }))).toBe(true);
    expect(soportaWebGL(documentoCon({ "experimental-webgl": {} }))).toBe(true);
  });

  it("es falso si no hay ningún contexto", () => {
    expect(soportaWebGL(documentoCon({}))).toBe(false);
  });

  it("es falso (sin lanzar error) si crear el contexto falla o el documento no existe", () => {
    const roto = { createElement: () => ({ getContext: vi.fn(() => { throw new Error("bloqueado"); }) }) } as unknown as Document;
    expect(soportaWebGL(roto)).toBe(false);
    expect(soportaWebGL(undefined)).toBe(false);
  });
});

describe("dispositivoLimitado (celulares lentos: se empieza en el plano 2D)", () => {
  it("es verdadero con poca memoria, pocos núcleos o ahorro de datos", () => {
    expect(dispositivoLimitado({ deviceMemory: 1 } as unknown as Navigator)).toBe(true);
    expect(dispositivoLimitado({ deviceMemory: 2 } as unknown as Navigator)).toBe(true);
    expect(dispositivoLimitado({ hardwareConcurrency: 2 } as unknown as Navigator)).toBe(true);
    expect(dispositivoLimitado({ connection: { saveData: true } } as unknown as Navigator)).toBe(true);
    expect(dispositivoLimitado({ connection: { effectiveType: "2g" } } as unknown as Navigator)).toBe(true);
    expect(dispositivoLimitado({ connection: { effectiveType: "slow-2g" } } as unknown as Navigator)).toBe(true);
  });

  it("es falso en un equipo normal o cuando el navegador no da la información", () => {
    expect(dispositivoLimitado({ deviceMemory: 8, hardwareConcurrency: 8, connection: { effectiveType: "4g" } } as unknown as Navigator)).toBe(false);
    expect(dispositivoLimitado({} as Navigator)).toBe(false);
    expect(dispositivoLimitado(undefined)).toBe(false);
  });
});
