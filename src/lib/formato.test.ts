import { describe, expect, it } from "vitest";
import { formatearArea, formatearMetros, formatearRangoArea, formatearSoles } from "@/lib/formato";

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
