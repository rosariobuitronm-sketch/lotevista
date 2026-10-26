import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BotonCerrarSesion } from "@/components/BotonCerrarSesion";
import { FormularioLogin } from "@/components/FormularioLogin";

const fetchMock = vi.fn();
const respuesta = (status: number, json: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(json) });

const escribir = (usuario: string, clave: string) => {
  fireEvent.change(screen.getByLabelText("Usuario"), { target: { value: usuario } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: clave } });
};
const entrar = () => fireEvent.click(screen.getByRole("button", { name: /Entrar/ }));

describe("FormularioLogin", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tiene usuario y contraseña (oculta) y no recuerda la contraseña en el navegador", () => {
    render(<FormularioLogin alExito={() => {}} />);
    expect(screen.getByLabelText("Usuario")).toBeRequired();
    const clave = screen.getByLabelText("Contraseña");
    expect(clave).toHaveAttribute("type", "password");
    expect(clave).toHaveAttribute("autocomplete", "current-password");
  });

  it("vacío: pide los datos y no envía nada", () => {
    render(<FormularioLogin alExito={() => {}} />);
    entrar();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Escribe tu usuario y tu contraseña.");
  });

  it("con credenciales correctas envía el login y avisa del éxito", async () => {
    fetchMock.mockReturnValue(respuesta(200, { ok: true, datos: { usuario: "asesor" } }));
    const alExito = vi.fn();
    render(<FormularioLogin alExito={alExito} />);
    escribir("asesor", "mi-clave");
    entrar();
    await waitFor(() => expect(alExito).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/panel/login");
    expect(JSON.parse(init.body)).toEqual({ usuario: "asesor", clave: "mi-clave" });
  });

  it("con credenciales erróneas muestra el mensaje único y limpia la contraseña", async () => {
    fetchMock.mockReturnValue(
      respuesta(401, { ok: false, error: { codigo: "credenciales", mensaje: "Usuario o contraseña incorrectos" } }),
    );
    const alExito = vi.fn();
    render(<FormularioLogin alExito={alExito} />);
    escribir("asesor", "mala");
    entrar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Usuario o contraseña incorrectos");
    expect(alExito).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");
    expect(screen.getByRole("button", { name: /Entrar/ })).toBeEnabled();
  });

  it("muestra el mensaje de espera cuando el servidor bloquea por intentos", async () => {
    fetchMock.mockReturnValue(
      respuesta(429, { ok: false, error: { codigo: "bloqueado", mensaje: "Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo." } }),
    );
    render(<FormularioLogin alExito={() => {}} />);
    escribir("asesor", "x");
    entrar();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Espera 15 minutos/);
  });

  it("se desactiva mientras envía (sin doble envío)", async () => {
    let resolver: (v: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((r) => (resolver = r)));
    render(<FormularioLogin alExito={() => {}} />);
    escribir("asesor", "x");
    const boton = screen.getByRole("button", { name: /Entrar/ });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Entrando/ })).toBeDisabled();
    resolver(await respuesta(401, { ok: false, error: { codigo: "credenciales", mensaje: "Usuario o contraseña incorrectos" } }));
    await screen.findByRole("alert");
  });

  it("si no hay conexión, muestra un mensaje amable", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<FormularioLogin alExito={() => {}} />);
    escribir("asesor", "x");
    entrar();
    expect(await screen.findByRole("alert")).toHaveTextContent(/conexión/i);
  });
});

describe("BotonCerrarSesion", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("cierra la sesión en el servidor y luego navega al login", async () => {
    fetchMock.mockReturnValue(respuesta(200, { ok: true, datos: {} }));
    const alTerminar = vi.fn();
    render(<BotonCerrarSesion alTerminar={alTerminar} />);
    fireEvent.click(screen.getByRole("button", { name: /Cerrar sesión/ }));
    await waitFor(() => expect(alTerminar).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/panel/logout");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });
});
