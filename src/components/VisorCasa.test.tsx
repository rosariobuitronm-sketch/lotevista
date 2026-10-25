import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("explica cómo girar y acercar la casa", () => {
    render(<VisorCasa {...props} cargarVisor={cargaOk} />);
    expect(screen.getByText(/Arrastra para girar/)).toBeInTheDocument();
  });
});
