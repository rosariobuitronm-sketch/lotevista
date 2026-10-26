// @vitest-environment node
import { describe, expect, it } from "vitest";
import config from "../../next.config";

// SP-04 del informe de seguridad: cabeceras que impiden incrustar el sitio en otra página (clickjacking).
describe("cabeceras de seguridad (next.config.ts)", () => {
  const cabeceras = async () => {
    const reglas = await config.headers!();
    const regla = reglas.find((r) => r.source === "/:path*");
    expect(regla, "debe haber una regla para todas las rutas").toBeDefined();
    return Object.fromEntries(regla!.headers.map((h) => [h.key.toLowerCase(), h.value]));
  };

  it("impide que otra página incruste el sitio (formulario, login del panel, etc.)", async () => {
    const h = await cabeceras();
    expect(h["content-security-policy"]).toBe("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY"); // respaldo para navegadores antiguos
  });

  it("evita que el navegador adivine tipos de archivo y limita lo que se envía como referencia", async () => {
    const h = await cabeceras();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("no restringe la cámara ni el seguimiento espacial: la Realidad Aumentada los necesita", async () => {
    const h = await cabeceras();
    expect(h["permissions-policy"]).toBeUndefined();
    expect(Object.keys(h).join(" ")).not.toMatch(/feature-policy/);
  });

  it("no revela el framework en cada respuesta", () => {
    expect(config.poweredByHeader).toBe(false);
  });
});
