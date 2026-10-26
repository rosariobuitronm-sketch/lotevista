import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agregarPregunta, leerActividad, limpiarActividad, marcarUso } from "@/lib/actividad";

const SLUG = "algarrobos-de-sunampe";

describe("actividad del visitante (solo en el navegador)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    limpiarActividad(SLUG);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("empieza vacía: sin uso de 3D ni RA y sin preguntas", () => {
    expect(leerActividad(SLUG)).toEqual({ uso3d: false, usoRa: false, preguntas: [] });
  });

  it("recuerda el uso de 3D y de RA por proyecto", () => {
    marcarUso(SLUG, "3d");
    expect(leerActividad(SLUG)).toEqual({ uso3d: true, usoRa: false, preguntas: [] });
    marcarUso(SLUG, "ra");
    expect(leerActividad(SLUG).usoRa).toBe(true);
    expect(leerActividad("campina-de-huaral").uso3d).toBe(false);
  });

  it("sobrevive a recargar la pestaña (queda en sessionStorage)", () => {
    marcarUso(SLUG, "3d");
    agregarPregunta(SLUG, { pregunta: "¿Hay agua?", respuesta: "Sí.", sabe: true });
    const crudo = window.sessionStorage.getItem(`lv:actividad:${SLUG}`);
    expect(crudo).toContain("¿Hay agua?");
    expect(leerActividad(SLUG).preguntas).toHaveLength(1);
  });

  it("guarda las preguntas en orden y conserva solo las 20 más recientes", () => {
    for (let i = 1; i <= 25; i++) agregarPregunta(SLUG, { pregunta: `P${i}`, respuesta: `R${i}`, sabe: true });
    const { preguntas } = leerActividad(SLUG);
    expect(preguntas).toHaveLength(20);
    expect(preguntas[0].pregunta).toBe("P6");
    expect(preguntas[19].pregunta).toBe("P25");
  });

  it("recorta textos demasiado largos para no pasar el límite del servidor", () => {
    agregarPregunta(SLUG, { pregunta: "x".repeat(900), respuesta: "y".repeat(3000), sabe: false });
    const [p] = leerActividad(SLUG).preguntas;
    expect(p.pregunta.length).toBe(500);
    expect(p.respuesta.length).toBe(2000);
  });

  it("si el almacenamiento está bloqueado, sigue funcionando en memoria", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() => marcarUso(SLUG, "ra")).not.toThrow();
    expect(leerActividad(SLUG).usoRa).toBe(true);
  });

  it("si el contenido guardado está dañado, empieza de cero sin romper", () => {
    window.sessionStorage.setItem(`lv:actividad:${SLUG}`, "{no es json");
    expect(leerActividad(SLUG)).toEqual({ uso3d: false, usoRa: false, preguntas: [] });
    window.sessionStorage.setItem(`lv:actividad:${SLUG}`, JSON.stringify({ preguntas: "hola", uso3d: "sí" }));
    expect(leerActividad(SLUG)).toEqual({ uso3d: false, usoRa: false, preguntas: [] });
  });

  it("limpiarActividad borra todo", () => {
    marcarUso(SLUG, "3d");
    limpiarActividad(SLUG);
    expect(leerActividad(SLUG).uso3d).toBe(false);
  });
});
