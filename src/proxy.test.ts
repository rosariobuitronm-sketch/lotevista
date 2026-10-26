// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearSesion } from "@/lib/auth";
import { leerCanal } from "@/lib/canal";
import { proxy } from "@/proxy";

const AUTH = "auth-secreto-de-prueba-0123456789-abcdefghij";
const pedir = (ruta: string, cookie?: string) =>
  proxy(new NextRequest(`http://localhost:3000${ruta}`, { headers: cookie ? { cookie } : {} }));

describe("proxy: protección del panel", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", AUTH);
  });

  it("sin sesión, /panel redirige al login", async () => {
    for (const ruta of ["/panel", "/panel/", "/panel/leads", "/panel?proyecto=x"]) {
      const res = await pedir(ruta);
      expect(res.status, ruta).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname, ruta).toBe("/panel/login");
    }
  });

  it("con una cookie inválida, manipulada o vencida también redirige", async () => {
    expect((await pedir("/panel", "lv_sesion=basura")).status).toBe(307);
    const otro = await crearSesion("x", "otro-secreto-distinto-de-prueba-111222333444");
    expect((await pedir("/panel", `lv_sesion=${otro}`)).status).toBe(307);
    const vieja = await crearSesion("x", AUTH, new Date(Date.now() - 9 * 3600_000));
    expect((await pedir("/panel", `lv_sesion=${vieja}`)).status).toBe(307);
  });

  it("con sesión válida deja pasar", async () => {
    const token = await crearSesion("asesor1", AUTH);
    const res = await pedir("/panel", `lv_sesion=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("/panel/login es público", async () => {
    const res = await pedir("/panel/login");
    expect(res.status).toBe(200);
  });

  it("sin sesión, /api/panel/* responde 401 en JSON (menos el login)", async () => {
    for (const ruta of ["/api/panel/leads", "/api/panel/leads?proyecto=x", "/api/panel/lo-que-sea"]) {
      const res = await pedir(ruta);
      expect(res.status, ruta).toBe(401);
      expect(await res.json()).toEqual({ ok: false, error: { codigo: "no_autorizado", mensaje: "Inicia sesión para continuar." } });
    }
    expect((await pedir("/api/panel/login")).status).toBe(200);
    expect((await pedir("/api/panel/logout")).status).toBe(200);
  });

  it("con sesión válida /api/panel/* pasa", async () => {
    const token = await crearSesion("asesor1", AUTH);
    expect((await pedir("/api/panel/leads", `lv_sesion=${token}`)).status).toBe(200);
  });

  describe("canal de origen", () => {
    const COOKIES = "secreto-de-cookies-de-prueba-0123456789-abc";
    const cookieCanal = (res: Response) => /lv_canal=([^;]+)/.exec(res.headers.get("set-cookie") ?? "")?.[1];

    beforeEach(() => {
      vi.stubEnv("COOKIE_SECRET", COOKIES);
    });

    it("el parámetro ?canal= de la ficha se guarda en una cookie firmada", async () => {
      for (const canal of ["qr_sala", "holograma", "web"] as const) {
        const res = await pedir(`/proyectos/algarrobos-de-sunampe?canal=${canal}`);
        expect(res.status).toBe(200);
        const valor = cookieCanal(res);
        expect(valor, canal).toBeDefined();
        expect(await leerCanal(valor, COOKIES)).toBe(canal);
      }
    });

    it("la cookie del canal es httpOnly, secure y sameSite=lax", async () => {
      const cookie = (await pedir("/proyectos/x?canal=qr_sala")).headers.get("set-cookie") ?? "";
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/Secure/i);
      expect(cookie).toMatch(/SameSite=lax/i);
      expect(cookie).toMatch(/Path=\//);
    });

    it("la página de holograma fija el canal holograma aunque no traiga parámetro", async () => {
      const res = await pedir("/holograma/algarrobos-de-sunampe");
      expect(await leerCanal(cookieCanal(res), COOKIES)).toBe("holograma");
    });

    it("un canal inválido o ausente no cambia nada (no se emite cookie)", async () => {
      for (const ruta of ["/proyectos/x?canal=facebook", "/proyectos/x?canal=", "/proyectos/x", "/proyectos/x?canal=QR_SALA", "/proyectos/x?canal=web%00"]) {
        const res = await pedir(ruta);
        expect(res.status, ruta).toBe(200);
        expect(res.headers.get("set-cookie"), ruta).toBeNull();
      }
    });

    it("sin COOKIE_SECRET no falla ni emite cookie", async () => {
      vi.stubEnv("COOKIE_SECRET", "");
      const res = await pedir("/proyectos/x?canal=qr_sala");
      expect(res.status).toBe(200);
      expect(res.headers.get("set-cookie")).toBeNull();
    });
  });

  it("si falta AUTH_SECRET, nadie entra", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    const token = await crearSesion("asesor1", AUTH);
    expect((await pedir("/panel", `lv_sesion=${token}`)).status).toBe(307);
  });
});
