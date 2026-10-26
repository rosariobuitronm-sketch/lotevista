// @vitest-environment node
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { esCanal, firmarCanal, leerCanal, leerCookie } from "@/lib/canal";

const SECRETO = "secreto-de-prueba-para-cookies-0123456789";
const OTRO = "otro-secreto-distinto-de-prueba-9876543210";

describe("canal de origen", () => {
  it("solo admite web, qr_sala y holograma", () => {
    expect(esCanal("web")).toBe(true);
    expect(esCanal("qr_sala")).toBe(true);
    expect(esCanal("holograma")).toBe(true);
    for (const malo of ["facebook", "", "WEB", null, undefined, 3, {}]) expect(esCanal(malo)).toBe(false);
  });

  it("una cookie firmada se lee de vuelta", async () => {
    for (const canal of ["web", "qr_sala", "holograma"] as const) {
      expect(await leerCanal(await firmarCanal(canal, SECRETO), SECRETO)).toBe(canal);
    }
  });

  it("si falta, está mal firmada, manipulada o el canal es inválido, el canal es web", async () => {
    expect(await leerCanal(undefined, SECRETO)).toBe("web");
    expect(await leerCanal("", SECRETO)).toBe("web");
    expect(await leerCanal("basura", SECRETO)).toBe("web");
    expect(await leerCanal(await firmarCanal("holograma", OTRO), SECRETO)).toBe("web"); // firma de otro secreto
    const firmadoConCanalMalo = await new SignJWT({ c: "facebook" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(SECRETO));
    expect(await leerCanal(firmadoConCanalMalo, SECRETO)).toBe("web");
    const [a, , c] = (await firmarCanal("holograma", SECRETO)).split(".");
    const cuerpoFalso = Buffer.from(JSON.stringify({ c: "qr_sala" })).toString("base64url");
    expect(await leerCanal(`${a}.${cuerpoFalso}.${c}`, SECRETO)).toBe("web"); // cuerpo cambiado
  });

  it("si no hay secreto configurado, el canal es web y nunca lanza error", async () => {
    expect(await leerCanal(await firmarCanal("holograma", SECRETO), undefined)).toBe("web");
    await expect(firmarCanal("web", "")).rejects.toThrow();
  });

  it("una cookie vencida vuelve a web", async () => {
    const vencido = await new SignJWT({ c: "holograma" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRETO));
    expect(await leerCanal(vencido, SECRETO)).toBe("web");
  });
});

describe("leerCookie", () => {
  it("encuentra una cookie por nombre dentro de la cabecera", () => {
    expect(leerCookie("a=1; lv_canal=xyz; b=2", "lv_canal")).toBe("xyz");
    expect(leerCookie("lv_canal=abc", "lv_canal")).toBe("abc");
    expect(leerCookie("otra=1", "lv_canal")).toBeUndefined();
    expect(leerCookie(null, "lv_canal")).toBeUndefined();
  });
});
