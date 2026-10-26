import { describe, expect, it } from "vitest";
import { formatearArea, formatearFechaHora, formatearMetros, formatearRangoArea, formatearSoles } from "@/lib/formato";

describe("formatearFechaHora (hora de Lima, UTC-5)", () => {
  it("convierte a hora de Lima con mes abreviado y a. m. / p. m.", () => {
    expect(formatearFechaHora("2026-10-21T20:30:00Z")).toBe("21 oct 2026, 3:30 p. m.");
    expect(formatearFechaHora("2026-10-21T14:05:00Z")).toBe("21 oct 2026, 9:05 a. m.");
  });

  it("maneja medianoche, mediodía y el cambio de día por la zona horaria", () => {
    expect(formatearFechaHora("2026-10-21T05:05:00Z")).toBe("21 oct 2026, 12:05 a. m.");
    expect(formatearFechaHora("2026-10-21T17:00:00Z")).toBe("21 oct 2026, 12:00 p. m.");
    expect(formatearFechaHora("2026-10-21T03:00:00Z")).toBe("20 oct 2026, 10:00 p. m.");
  });

  it("si la fecha no es válida devuelve un guion", () => {
    expect(formatearFechaHora("no es fecha")).toBe("—");
  });
});

describe("formato", () => {
  it("formatea soles con separador de miles", () => {
    expect(formatearSoles(37200)).toBe("S/ 37,200");
    expect(formatearSoles(96000)).toBe("S/ 96,000");
    expect(formatearSoles(44640)).toBe("S/ 44,640");
  });

  it("formatea áreas y medidas sin decimales innecesarios", () => {
    expect(formatearArea(120)).toBe("120 m²");
    expect(formatearArea(112.5)).toBe("112.5 m²");
    expect(formatearMetros(8)).toBe("8 m");
    expect(formatearMetros(7.5)).toBe("7.5 m");
  });

  it("formatea el rango de metraje y lo simplifica si es un solo valor", () => {
    expect(formatearRangoArea(120, 200)).toBe("120 – 200 m²");
    expect(formatearRangoArea(150, 150)).toBe("150 m²");
  });
});
