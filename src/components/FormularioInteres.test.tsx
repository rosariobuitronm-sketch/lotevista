import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agregarPregunta, limpiarActividad, marcarUso } from "@/lib/actividad";
import { ProveedorLote, useLote } from "@/components/ContextoLote";
import { FormularioInteres } from "@/components/FormularioInteres";
import type { Lote } from "@/lib/proyectos";

const SLUG = "algarrobos-de-sunampe";
const fetchMock = vi.fn();

const respuesta = (status: number, json: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(json) });

const campo = (nombre: RegExp) => screen.getByLabelText(nombre);
const llenarBien = () => {
  fireEvent.change(campo(/Nombre/), { target: { value: "María Quispe" } });
  fireEvent.change(campo(/Celular/), { target: { value: "987 654 321" } });
  fireEvent.change(campo(/Correo/), { target: { value: "maria@example.com" } });
  fireEvent.click(screen.getByRole("checkbox"));
};
const enviar = () => fireEvent.click(screen.getByRole("button", { name: /Quiero que me contacten/ }));

describe("FormularioInteres", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    limpiarActividad(SLUG);
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tiene nombre, celular, correo, horario opcional y la casilla con el texto de consentimiento", () => {
    render(<FormularioInteres proyectoSlug={SLUG} proyectoNombre="Algarrobos de Sunampe" />);
    expect(campo(/Nombre/)).toBeRequired();
    expect(campo(/Celular/)).toBeRequired();
    expect(campo(/Correo/)).toBeRequired();
    expect(campo(/Horario/)).not.toBeRequired();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText(/Ley N\.° 29733/)).toBeInTheDocument();
    expect(screen.getByText(/^Autorizo a Inmobiliaria Demo S\.A\.C\./)).toBeInTheDocument();
  });

  it("no pide DNI", () => {
    const { container } = render(<FormularioInteres proyectoSlug={SLUG} proyectoNombre="X" />);
    expect(screen.queryByLabelText(/DNI|documento/i)).not.toBeInTheDocument();
    expect(container.querySelector("[name*='dni' i], [id*='dni' i]")).toBeNull();
  });

  it("vacío: muestra los errores en español junto a cada campo y no envía nada", () => {
    render(<FormularioInteres proyectoSlug={SLUG} proyectoNombre="X" />);
    enviar();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(campo(/Nombre/)).toHaveAccessibleDescription(/Escribe tu nombre completo/);
    expect(campo(/Celular/)).toHaveAccessibleDescription(/celular peruano de 9 dígitos/);
    expect(campo(/Correo/)).toHaveAccessibleDescription(/correo válido/);
    expect(campo(/Nombre/)).toBeInvalid();
  });

  it("sin consentimiento no se envía y se explica por qué", () => {
    render(<FormularioInteres proyectoSlug={SLUG} proyectoNombre="X" />);
    llenarBien();
    fireEvent.click(screen.getByRole("checkbox")); // se desmarca
    enviar();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox")).toHaveAccessibleDescription(/aceptar el tratamiento de tus datos personales/);
  });

  it("envía los datos con el uso de 3D/RA y las preguntas del chat guardados en el navegador", async () => {
    marcarUso(SLUG, "3d");
    marcarUso(SLUG, "ra");
    agregarPregunta(SLUG, { pregunta: "¿Hay agua?", respuesta: "Sí.", sabe: true });
    fetchMock.mockReturnValue(respuesta(200, { ok: true, datos: { mensaje: "¡Gracias!" } }));
    render(<FormularioInteres proyectoSlug={SLUG} proyectoNombre="Algarrobos de Sunampe" />);
    fireEvent.change(campo(/Horario/), { target: { value: "Tarde (12 m. a 6 p. m.)" } });
    llenarBien();
    enviar();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/leads");
    expect(init.method).toBe("POST");
    const cuerpo = JSON.parse(init.body);
    expect(cuerpo).toEqual({
      nombre: "María Quispe",
      celular: "987 654 321",
      correo: "maria@example.com",
      horario: "Tarde (12 m. a 6 p. m.)",
      consentimiento: true,
      proyecto: SLUG,
      uso3d: true,
      usoRa: true,
      preguntas: [{ pregunta: "¿Hay agua?", respuesta: "Sí.", sabe: true }],
    });
  });

  it("el botón se desactiva tras el primer clic: el doble clic envía una sola vez", async () => {
    let resolver: (v: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((r) => (resolver = r)));
    render(<FormularioInteres proyectoSlug={SLUG} proyectoNombre="X" />);
    llenarBien();
    const boton = screen.getByRole("button", { name: /Quiero que me contacten/ });
    fireEvent.click(boton);
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Enviando/ })).toBeDisabled();
    await act(async () => {
      resolver(await respuesta(200, { ok: true, datos: { mensaje: "¡Gracias!" } }));
    });
  });

  it("éxito: muestra un mensaje de agradecimiento", async () => {
    fetchMock.mockReturnValue(respuesta(200, { ok: true, datos: { mensaje: "¡Gracias! Un asesor te contactará." } }));
    render(<FormularioInteres proyectoSlug={SLUG} proyectoNombre="Algarrobos de Sunampe" />);
    llenarBien();
    enviar();
    expect(await screen.findByRole("status")).toHaveTextContent(/Gracias/);
    expect(screen.queryByRole("button", { name: /Quiero que me contacten/ })).not.toBeInTheDocument();
  });

  it("fallo del servidor: mensaje amable sin detalles técnicos y opción de reintentar", async () => {
    fetchMock.mockReturnValueOnce(respuesta(500, { ok: false, error: { codigo: "servidor", mensaje: "No pudimos guardar tus datos. Intenta de nuevo." } }));
    render(<FormularioInteres proyectoSlug={SLUG} proyectoNombre="X" />);
    llenarBien();
    enviar();
    expect(await screen.findByRole("alert")).toHaveTextContent(/No pudimos guardar tus datos/);
    const reintentar = screen.getByRole("button", { name: /Reintentar/ });
    expect(reintentar).toBeEnabled();

    fetchMock.mockReturnValueOnce(respuesta(200, { ok: true, datos: { mensaje: "¡Gracias!" } }));
    fireEvent.click(reintentar);
    expect(await screen.findByRole("status")).toHaveTextContent(/Gracias/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("si no hay conexión, mensaje amable y se puede reintentar", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<FormularioInteres proyectoSlug={SLUG} proyectoNombre="X" />);
    llenarBien();
    enviar();
    expect(await screen.findByRole("alert")).toHaveTextContent(/revisa tu conexión/i);
    expect(screen.getByRole("button", { name: /Reintentar/ })).toBeEnabled();
  });

  it("errores de validación del servidor aparecen junto a cada campo", async () => {
    fetchMock.mockReturnValue(
      respuesta(400, { ok: false, error: { codigo: "validacion", mensaje: "Revisa los datos.", campos: { correo: "Escribe un correo válido, por ejemplo nombre@correo.com." } } }),
    );
    render(<FormularioInteres proyectoSlug={SLUG} proyectoNombre="X" />);
    llenarBien();
    enviar();
    await waitFor(() => expect(campo(/Correo/)).toHaveAccessibleDescription(/correo válido/));
    expect(screen.getByRole("button", { name: /Quiero que me contacten/ })).toBeEnabled();
  });
});

const LOTE: Lote = { codigo: "Mz. A - Lt. 5", manzana: "A", numero: 5, estado: "disponible", areaM2: 120, frenteM: 8, fondoM: 15, precio: 37200 };
function ElegirLote() {
  const { elegirInteres } = useLote();
  return (
    <button type="button" onClick={() => elegirInteres(LOTE)}>
      elegir lote del plano
    </button>
  );
}

describe("FormularioInteres con el lote elegido en el plano", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    limpiarActividad(SLUG);
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const montar = () =>
    render(
      <ProveedorLote>
        <ElegirLote />
        <FormularioInteres proyectoSlug={SLUG} proyectoNombre="Algarrobos de Sunampe" />
      </ProveedorLote>,
    );

  it("sin lote elegido no muestra ninguna etiqueta de lote", () => {
    montar();
    expect(screen.queryByText(/Lote de interés/)).not.toBeInTheDocument();
  });

  it("precarga el lote elegido y lo envía junto con los datos", async () => {
    fetchMock.mockReturnValue(respuesta(200, { ok: true, datos: { mensaje: "¡Gracias!" } }));
    montar();
    fireEvent.click(screen.getByRole("button", { name: "elegir lote del plano" }));
    expect(screen.getByText("Lote de interés: Mz. A - Lt. 5 · 120 m²")).toBeInTheDocument();
    llenarBien();
    enviar();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).lote).toBe("Mz. A - Lt. 5");
  });

  it("el lote precargado se puede quitar y entonces no se envía", async () => {
    fetchMock.mockReturnValue(respuesta(200, { ok: true, datos: { mensaje: "¡Gracias!" } }));
    montar();
    fireEvent.click(screen.getByRole("button", { name: "elegir lote del plano" }));
    fireEvent.click(screen.getByRole("button", { name: /Quitar el lote/ }));
    expect(screen.queryByText(/Lote de interés/)).not.toBeInTheDocument();
    llenarBien();
    enviar();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("lote");
  });
});
