// @vitest-environment node
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { crearSesion, DURACION_SESION_SEGUNDOS, opcionesCookieSesion, requerirSesion, verificarSesion } from "@/lib/auth";

const SECRETO = "auth-secreto-de-prueba-0123456789-abcdefghij";
const OTRO = "otro-secreto-de-prueba-9876543210-zyxwvutsrq";
const T0 = new Date("2026-10-20T12:00:00Z");
const horas = (h: number) => new Date(T0.getTime() + h * 3600_000);

describe("sesión del asesor (cookie firmada de 8 horas)", () => {
  it("una sesión recién creada se verifica y devuelve el usuario", async () => {
    const token = await crearSesion("asesor1", SECRETO, T0);
    expect(await verificarSesion(token, SECRETO, T0)).toEqual({ usuario: "asesor1" });
  });

  it("dura 8 horas: vale a las 7 h 59 min y vence a las 8 h", async () => {
    expect(DURACION_SESION_SEGUNDOS).toBe(8 * 3600);
    const token = await crearSesion("asesor1", SECRETO, T0);
    expect(await verificarSesion(token, SECRETO, new Date(T0.getTime() + (8 * 3600 - 60) * 1000))).not.toBeNull();
    expect(await verificarSesion(token, SECRETO, horas(8.01))).toBeNull();
    expect(await verificarSesion(token, SECRETO, horas(24))).toBeNull();
  });

  it("rechaza tokens firmados con otro secreto, manipulados, vacíos o sin firma", async () => {
    const token = await crearSesion("asesor1", SECRETO, T0);
    expect(await verificarSesion(token, OTRO, T0)).toBeNull();
    const [a, , c] = token.split(".");
    const falso = Buffer.from(JSON.stringify({ sub: "admin", exp: 9999999999 })).toString("base64url");
    expect(await verificarSesion(`${a}.${falso}.${c}`, SECRETO, T0)).toBeNull();
    for (const malo of [undefined, null, "", "basura", "a.b.c"]) expect(await verificarSesion(malo, SECRETO, T0)).toBeNull();
    const sinFirma = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from('{"sub":"admin"}').toString("base64url")}.`;
    expect(await verificarSesion(sinFirma, SECRETO, T0)).toBeNull();
  });

  it("rechaza un token sin usuario o firmado con otro algoritmo", async () => {
    const clave = new TextEncoder().encode(SECRETO);
    const sinSub = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(clave);
    expect(await verificarSesion(sinSub, SECRETO)).toBeNull();
    const hs512 = await new SignJWT({ sub: "x" }).setProtectedHeader({ alg: "HS512" }).setExpirationTime("1h").sign(clave);
    expect(await verificarSesion(hs512, SECRETO)).toBeNull();
  });

  it("sin AUTH_SECRET configurado nadie entra y crear una sesión falla", async () => {
    const token = await crearSesion("asesor1", SECRETO, T0);
    expect(await verificarSesion(token, undefined, T0)).toBeNull();
    expect(await verificarSesion(token, "", T0)).toBeNull();
    await expect(crearSesion("asesor1", undefined)).rejects.toThrow();
  });

  it("la cookie es httpOnly, secure, sameSite=lax y caduca en 8 horas", () => {
    expect(opcionesCookieSesion).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 28800 });
  });
});

describe("requerirSesion", () => {
  it("devuelve el usuario si hay sesión válida y null si no", async () => {
    const token = await crearSesion("asesor1", SECRETO, new Date());
    expect(await requerirSesion(token, SECRETO)).toEqual({ usuario: "asesor1" });
    expect(await requerirSesion(undefined, SECRETO)).toBeNull();
    expect(await requerirSesion("basura", SECRETO)).toBeNull();
  });
});
