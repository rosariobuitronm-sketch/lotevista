import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leerActividad, limpiarActividad } from "@/lib/actividad";
import { EtiquetaReferencial } from "@/components/EtiquetaReferencial";
import { VisorCasa } from "@/components/VisorCasa";

const props = {
  nombre: "Algarrobos de Sunampe",
  modeloUrl: "/modelos/casa-sunampe.glb",
  imagenUrl: "/proyectos/algarrobos-de-sunampe.jpg",
};
const cargaOk = () => Promise.resolve({});
const cargaFalla = () => Promise.reject(new Error("no se pudo cargar la librería"));

const modelo = (c: HTMLElement) => c.querySelector("model-viewer") as HTMLElement;

describe("EtiquetaReferencial", () => {
  it("siempre incluye el texto Imagen referencial", () => {
    render(<EtiquetaReferencial />);
    expect(screen.getByText("Imagen referencial")).toBeInTheDocument();
  });

  it("la versión completa agrega el texto de apoyo y la compacta solo la insignia", () => {
    const { rerender } = render(<EtiquetaReferencial />);
    expect(screen.getByText(/la empresa vende únicamente el lote/)).toBeInTheDocument();
    rerender(<EtiquetaReferencial compacta />);
    expect(screen.getByText("Imagen referencial")).toBeInTheDocument();
    expect(screen.queryByText(/la empresa vende únicamente el lote/)).not.toBeInTheDocument();
  });
});

describe("VisorCasa", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra la casa en un model-viewer que se gira y acerca, con la etiqueta visible", () => {
    const { container } = render(<VisorCasa {...props} cargarVisor={cargaOk} />);
    const visor = modelo(container);
    expect(visor).toBeInTheDocument();
    expect(visor).toHaveAttribute("src", "/modelos/casa-sunampe.glb");
    expect(visor).toHaveAttribute("camera-controls");
    expect(screen.getAllByText("Imagen referencial").length).toBeGreaterThan(0);
    expect(screen.getByText(/la empresa vende únicamente el lote/)).toBeInTheDocument();
  });

  it("indica que el modelo está cargando y lo oculta cuando termina", async () => {
    const { container } = render(<VisorCasa {...props} cargarVisor={cargaOk} />);
    expect(screen.getByText(/Cargando la casa en 3D/)).toBeInTheDocument();
    act(() => {
      fireEvent(modelo(container), new Event("load"));
    });
    await waitFor(() => expect(screen.queryByText(/Cargando la casa en 3D/)).not.toBeInTheDocument());
    expect(screen.getAllByText("Imagen referencial").length).toBeGreaterThan(0);
  });

  it("si el modelo falla, muestra la imagen del proyecto y la etiqueta sigue visible", async () => {
    const { container } = render(<VisorCasa {...props} cargarVisor={cargaOk} />);
    act(() => {
      fireEvent(modelo(container), new Event("error"));
    });
    await waitFor(() => expect(container.querySelector("model-viewer")).toBeNull());
    expect(screen.getByRole("img", { name: /Algarrobos de Sunampe/ })).toBeInTheDocument();
    expect(screen.getAllByText("Imagen referencial").length).toBeGreaterThan(0);
    expect(screen.getByText(/la empresa vende únicamente el lote/)).toBeInTheDocument();
  });

  it("si la librería del visor no carga, muestra la imagen con la etiqueta", async () => {
    const { container } = render(<VisorCasa {...props} cargarVisor={cargaFalla} />);
    await waitFor(() => expect(container.querySelector("model-viewer")).toBeNull());
    expect(screen.getByRole("img", { name: /Algarrobos de Sunampe/ })).toBeInTheDocument();
    expect(screen.getAllByText("Imagen referencial").length).toBeGreaterThan(0);
  });

  it("si el modelo tarda demasiado, muestra la imagen con la etiqueta", () => {
    vi.useFakeTimers();
    const { container } = render(<VisorCasa {...props} cargarVisor={cargaOk} tiempoMaxMs={5000} />);
    expect(container.querySelector("model-viewer")).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(5001);
    });
    expect(container.querySelector("model-viewer")).toBeNull();
    expect(screen.getByRole("img", { name: /Algarrobos de Sunampe/ })).toBeInTheDocument();
    expect(screen.getAllByText("Imagen referencial").length).toBeGreaterThan(0);
  });

  it("si el proyecto no tiene modelo, muestra la imagen con la etiqueta", () => {
    const { container } = render(<VisorCasa {...props} modeloUrl={null} cargarVisor={cargaOk} />);
    expect(container.querySelector("model-viewer")).toBeNull();
    expect(screen.getByRole("img", { name: /Algarrobos de Sunampe/ })).toBeInTheDocument();
    expect(screen.getAllByText("Imagen referencial").length).toBeGreaterThan(0);
  });

  describe("Realidad Aumentada", () => {
    const cargarYAvisar = async (soportaAR: boolean) => {
      const { container } = render(<VisorCasa {...props} cargarVisor={cargaOk} />);
      const visor = modelo(container);
      Object.defineProperty(visor, "canActivateAR", { value: soportaAR, configurable: true });
      act(() => {
        fireEvent(visor, new Event("load"));
      });
      return { container, visor };
    };

    it("el visor admite RA (WebXR, Scene Viewer y Quick Look) con un botón Ver en tu espacio", () => {
      const { container } = render(<VisorCasa {...props} cargarVisor={cargaOk} />);
      const visor = modelo(container);
      expect(visor).toHaveAttribute("ar");
      expect(visor.getAttribute("ar-modes")).toBe("webxr scene-viewer quick-look");
      const boton = container.querySelector("[slot='ar-button']");
      expect(boton).toHaveTextContent("Ver en tu espacio");
    });

    it("en un equipo compatible muestra el botón y no muestra ningún aviso", async () => {
      const { container } = await cargarYAvisar(true);
      expect(container.querySelector("[slot='ar-button']")).toBeVisible();
      expect(screen.queryByText(/no admite Realidad Aumentada/)).not.toBeInTheDocument();
    });

    it("en laptop o equipo sin RA mantiene el 3D y avisa claramente en español", async () => {
      const { container } = await cargarYAvisar(false);
      expect(container.querySelector("model-viewer")).not.toBeNull(); // sigue el 3D
      expect(screen.getByRole("note")).toHaveTextContent(/Tu dispositivo o navegador no admite Realidad Aumentada/);
      expect(screen.getByRole("note")).toHaveTextContent(/Android con ARCore o iPhone/);
      expect(container.querySelector("[slot='ar-button']")).not.toBeVisible();
    });

    it("si la RA falla al abrirse, avisa sin romper el 3D", async () => {
      const { container, visor } = await cargarYAvisar(true);
      act(() => {
        fireEvent(visor, new CustomEvent("ar-status", { detail: { status: "failed" } }));
      });
      expect(await screen.findByRole("alert")).toHaveTextContent(/No pudimos abrir la Realidad Aumentada/);
      expect(container.querySelector("model-viewer")).not.toBeNull();
    });

    it("la etiqueta Imagen referencial va DENTRO del visor, para verse también en la RA de Chrome (WebXR)", () => {
      const { container } = render(<VisorCasa {...props} cargarVisor={cargaOk} />);
      const dentro = within(modelo(container)).getByText("Imagen referencial");
      expect(dentro).toBeInTheDocument();
    });

    it("antes de entrar a la RA recuerda que la casa es referencial", async () => {
      await cargarYAvisar(true);
      expect(screen.getByText(/la casa es solo una referencia/i)).toBeInTheDocument();
    });
  });

  describe("uso de 3D y RA (solo en el navegador)", () => {
    const SLUG = "algarrobos-de-sunampe";
    const fetchMock = vi.fn();
    beforeEach(() => {
      window.sessionStorage.clear();
      limpiarActividad(SLUG);
      fetchMock.mockReset();
      vi.stubGlobal("fetch", fetchMock);
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });
    const visorCon = () => {
      const { container } = render(<VisorCasa {...props} proyectoSlug={SLUG} cargarVisor={cargaOk} />);
      return { container, visor: modelo(container) };
    };

    it("al girar o acercar la casa con el mouse o el dedo, recuerda que usó el 3D", () => {
      const { visor } = visorCon();
      expect(leerActividad(SLUG).uso3d).toBe(false);
      act(() => {
        fireEvent(visor, new CustomEvent("camera-change", { detail: { source: "user-interaction" } }));
      });
      expect(leerActividad(SLUG).uso3d).toBe(true);
    });

    it("el giro automático del modelo no cuenta como uso", () => {
      const { visor } = visorCon();
      act(() => {
        fireEvent(visor, new CustomEvent("camera-change", { detail: { source: "none" } }));
      });
      expect(leerActividad(SLUG).uso3d).toBe(false);
    });

    it("al abrir la RA (botón o sesión iniciada) recuerda que usó la RA", () => {
      const a = visorCon();
      act(() => {
        fireEvent.click(a.container.querySelector("[slot='ar-button']")!);
      });
      expect(leerActividad(SLUG).usoRa).toBe(true);
      window.sessionStorage.clear();
      limpiarActividad(SLUG);
      cleanup();
      const b = visorCon();
      act(() => {
        fireEvent(b.visor, new CustomEvent("ar-status", { detail: { status: "session-started" } }));
      });
      expect(leerActividad(SLUG).usoRa).toBe(true);
    });

    it("no envía nada al servidor mientras el visitante usa el 3D o la RA", () => {
      const { container, visor } = visorCon();
      act(() => {
        fireEvent(visor, new CustomEvent("camera-change", { detail: { source: "user-interaction" } }));
        fireEvent.click(container.querySelector("[slot='ar-button']")!);
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("explica cómo girar y acercar la casa", () => {
    render(<VisorCasa {...props} cargarVisor={cargaOk} />);
    expect(screen.getByText(/Arrastra para girar/)).toBeInTheDocument();
  });
});
