import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AsistenteChat } from "@/components/AsistenteChat";
import { agregarPregunta, leerActividad, limpiarActividad } from "@/lib/actividad";

const SLUG = "algarrobos-de-sunampe";
const fetchMock = vi.fn();
const respuesta = (status: number, json: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(json) });
const ok = (texto: string, extra: Record<string, unknown> = {}) =>
  respuesta(200, { ok: true, datos: { respuesta: texto, sabe: true, origen: "ia", restantes: 19, ...extra } });

const escribir = (texto: string) => fireEvent.change(screen.getByLabelText("Tu pregunta"), { target: { value: texto } });
const enviar = () => fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
const registro = () => screen.getByRole("log", { name: /Conversación con Vicha/ });

describe("AsistenteChat", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    limpiarActividad(SLUG);
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const montar = () => render(<AsistenteChat proyectoSlug={SLUG} proyectoNombre="Algarrobos de Sunampe" />);

  it("muestra siempre el aviso de no compartir datos personales", () => {
    montar();
    expect(screen.getByText("No compartas datos personales en el chat. Si deseas que te contactemos, usa el formulario.")).toBeVisible();
  });

  it("presenta a Vicha con su imagen y un saludo", () => {
    montar();
    expect(screen.getByRole("img", { name: /Vicha/ })).toBeInTheDocument();
    expect(within(registro()).getByText(/Soy Vicha/)).toBeInTheDocument();
  });

  it("envía la pregunta con el proyecto, muestra un indicador de carga y luego la respuesta", async () => {
    let resolver: (v: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((r) => (resolver = r)));
    montar();
    escribir("¿Dónde queda?");
    enviar();

    expect(within(registro()).getByText("¿Dónde queda?")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Vicha está escribiendo/);
    expect(screen.getByLabelText("Tu pregunta")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/asistente");
    expect(JSON.parse(init.body)).toEqual({ proyecto: SLUG, pregunta: "¿Dónde queda?" });

    await act(async () => {
      resolver(await ok("Está en Sunampe, Chincha."));
    });
    expect(await within(registro()).findByText("Está en Sunampe, Chincha.")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("guarda la conversación solo en el navegador (sessionStorage) para enviarla con el formulario", async () => {
    fetchMock.mockReturnValue(ok("Desde S/ 37,200."));
    montar();
    escribir("¿Cuánto cuesta?");
    enviar();
    await within(registro()).findByText("Desde S/ 37,200.");
    expect(leerActividad(SLUG).preguntas).toEqual([{ pregunta: "¿Cuánto cuesta?", respuesta: "Desde S/ 37,200.", sabe: true }]);
    expect(fetchMock).toHaveBeenCalledTimes(1); // solo la llamada al asistente: nada se manda a otro lado
  });

  it("al recargar la pestaña recupera el historial", () => {
    agregarPregunta(SLUG, { pregunta: "¿Hay agua?", respuesta: "Sí, agua potable.", sabe: true });
    agregarPregunta(SLUG, { pregunta: "¿Y luz?", respuesta: "También.", sabe: true });
    montar();
    const r = within(registro());
    expect(r.getByText("¿Hay agua?")).toBeInTheDocument();
    expect(r.getByText("Sí, agua potable.")).toBeInTheDocument();
    expect(r.getByText("¿Y luz?")).toBeInTheDocument();
  });

  it("cuando deriva a un asesor invita a usar el formulario", async () => {
    fetchMock.mockReturnValue(ok("No tengo esa información registrada. Un asesor podrá ayudarte.", { sabe: false, origen: "derivacion" }));
    montar();
    escribir("¿Hay piscina?");
    enviar();
    await within(registro()).findByText(/No tengo esa información/);
    expect(within(registro()).getByRole("link", { name: /Ir al formulario/ })).toHaveAttribute("href", "#contacto");
    expect(leerActividad(SLUG).preguntas[0].sabe).toBe(false);
  });

  it("al llegar al límite de la sesión avisa, invita al formulario y bloquea el chat", async () => {
    fetchMock.mockReturnValue(
      respuesta(429, { ok: false, error: { codigo: "limite_sesion", mensaje: "Llegaste al límite de preguntas de esta sesión. Si deseas que te contactemos, usa el formulario." } }),
    );
    montar();
    escribir("otra más");
    enviar();
    await within(registro()).findByText(/Llegaste al límite de preguntas/);
    expect(within(registro()).getByRole("link", { name: /Ir al formulario/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Tu pregunta")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(leerActividad(SLUG).preguntas).toEqual([]); // el aviso del límite no es una pregunta respondida
  });

  it("si el servidor está muy ocupado (límite por IP) muestra su mensaje e invita al formulario", async () => {
    fetchMock.mockReturnValue(
      respuesta(429, { ok: false, error: { codigo: "limite_ip", mensaje: "Vicha está recibiendo muchas preguntas en este momento. Deja tus datos en el formulario y un asesor te contactará." } }),
    );
    montar();
    escribir("hola");
    enviar();
    await within(registro()).findByText(/muchas preguntas/);
    expect(within(registro()).getByRole("link", { name: /Ir al formulario/ })).toBeInTheDocument();
  });

  it("si no hay conexión muestra un mensaje amable, sin detalles técnicos, y no guarda nada", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    montar();
    escribir("¿Dónde queda?");
    enviar();
    const aviso = await within(registro()).findByText(/revisa tu conexión/i);
    expect(aviso.textContent).not.toMatch(/Failed to fetch|TypeError/);
    expect(leerActividad(SLUG).preguntas).toEqual([]);
    expect(screen.getByLabelText("Tu pregunta")).toBeEnabled();
  });

  it("un error inesperado del servidor se muestra con un mensaje amable", async () => {
    fetchMock.mockReturnValue(respuesta(503, { ok: false, error: { codigo: "no_disponible", mensaje: "El asistente no está disponible ahora. Si deseas que te contactemos, usa el formulario." } }));
    montar();
    escribir("hola");
    enviar();
    expect(await within(registro()).findByText(/no está disponible ahora/)).toBeInTheDocument();
  });

  it("no envía preguntas vacías y limita el largo a 300 caracteres", () => {
    montar();
    escribir("   ");
    enviar();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Tu pregunta")).toHaveAttribute("maxlength", "300");
  });

  it("Enter envía la pregunta y el doble envío no se duplica", async () => {
    let resolver: (v: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((r) => (resolver = r)));
    montar();
    escribir("¿Dónde queda?");
    const formulario = screen.getByLabelText("Tu pregunta").closest("form")!;
    fireEvent.submit(formulario);
    escribir("otra");
    fireEvent.submit(formulario);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolver(await ok("Aquí."));
    });
  });

  it("ofrece preguntas sugeridas que se envían con un toque", async () => {
    fetchMock.mockReturnValue(ok("Desde S/ 37,200."));
    montar();
    fireEvent.click(screen.getByRole("button", { name: "¿Cuánto cuesta el lote más barato?" }));
    await within(registro()).findByText("Desde S/ 37,200.");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).pregunta).toBe("¿Cuánto cuesta el lote más barato?");
  });

  it("el texto de la conversación se muestra como texto, nunca como HTML", async () => {
    fetchMock.mockReturnValue(ok("<img src=x onerror=alert(1)> <b>negrita</b>"));
    const { container } = montar();
    escribir("<script>alert(2)</script>");
    enviar();
    await within(registro()).findByText("<img src=x onerror=alert(1)> <b>negrita</b>");
    expect(container.querySelector("img[src='x']")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
  });

  it("el registro de la conversación se anuncia a los lectores de pantalla", () => {
    montar();
    expect(registro()).toHaveAttribute("aria-live", "polite");
  });

  it("recordar la espera: mientras responde se puede seguir leyendo (el botón vuelve al terminar)", async () => {
    fetchMock.mockReturnValue(ok("Listo."));
    montar();
    escribir("hola");
    enviar();
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled());
  });
});
