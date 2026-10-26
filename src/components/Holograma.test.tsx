import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Holograma } from "@/components/Holograma";

const props = {
  slug: "algarrobos-de-sunampe",
  nombre: "Algarrobos de Sunampe",
  modeloUrl: "/modelos/casa-sunampe.glb",
  imagenUrl: "/proyectos/algarrobos-de-sunampe.jpg",
};
const cargaOk = () => Promise.resolve({});
const cargaFalla = () => Promise.reject(new Error("no cargó"));

const VISTAS = [
  ["Vista superior", 0],
  ["Vista inferior", 180],
  ["Vista izquierda", -90],
  ["Vista derecha", 90],
] as const;

const vistas = (c: HTMLElement) => [...c.querySelectorAll("figure")];

describe("Holograma", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("muestra una pantalla negra con el modelo 3D 4 veces: arriba, abajo, izquierda y derecha", () => {
    const { container } = render(<Holograma {...props} cargarVisor={cargaOk} />);
    expect(container.firstElementChild).toHaveClass("bg-black");
    expect(container.querySelectorAll("model-viewer")).toHaveLength(4);
    for (const [nombre] of VISTAS) {
      expect(screen.getByRole("figure", { name: new RegExp(nombre) })).toBeInTheDocument();
    }
  });

  it("cada vista está girada para que su base mire al centro de la pirámide", () => {
    const { container } = render(<Holograma {...props} cargarVisor={cargaOk} />);
    const hallado = vistas(container).map((f) => [f.getAttribute("aria-label"), (f.firstElementChild as HTMLElement).style.transform]);
    expect(hallado).toEqual(VISTAS.map(([n, g]) => [expect.stringContaining(n), `rotate(${g}deg)`]));
  });

  it("las 4 vistas giran solas, sin controles de cámara y sin RA", () => {
    const { container } = render(<Holograma {...props} cargarVisor={cargaOk} />);
    for (const visor of container.querySelectorAll("model-viewer")) {
      expect(visor).toHaveAttribute("src", "/modelos/casa-sunampe.glb");
      expect(visor).toHaveAttribute("auto-rotate");
      expect(visor).not.toHaveAttribute("camera-controls");
      expect(visor).not.toHaveAttribute("ar");
    }
  });

  it("las 4 vistas llevan la etiqueta Imagen referencial", () => {
    const { container } = render(<Holograma {...props} cargarVisor={cargaOk} />);
    for (const f of vistas(container)) expect(within(f as HTMLElement).getByText("Imagen referencial")).toBeInTheDocument();
    expect(screen.getAllByText("Imagen referencial")).toHaveLength(4);
  });

  it("si el modelo falla, las 4 vistas muestran la imagen del proyecto y las etiquetas siguen visibles", async () => {
    const { container } = render(<Holograma {...props} cargarVisor={cargaOk} />);
    act(() => {
      fireEvent(container.querySelector("model-viewer")!, new Event("error"));
    });
    await waitFor(() => expect(container.querySelectorAll("model-viewer")).toHaveLength(0));
    expect(screen.getAllByRole("img", { name: /Algarrobos de Sunampe/ })).toHaveLength(4);
    expect(screen.getAllByText("Imagen referencial")).toHaveLength(4);
  });

  it("si la librería del visor no carga, también muestra la imagen con las 4 etiquetas", async () => {
    const { container } = render(<Holograma {...props} cargarVisor={cargaFalla} />);
    await waitFor(() => expect(container.querySelectorAll("model-viewer")).toHaveLength(0));
    expect(screen.getAllByText("Imagen referencial")).toHaveLength(4);
  });

  it("si el modelo tarda demasiado, muestra la imagen con las 4 etiquetas", () => {
    vi.useFakeTimers();
    const { container } = render(<Holograma {...props} cargarVisor={cargaOk} tiempoMaxMs={5000} />);
    act(() => {
      vi.advanceTimersByTime(5001);
    });
    expect(container.querySelectorAll("model-viewer")).toHaveLength(0);
    expect(screen.getAllByText("Imagen referencial")).toHaveLength(4);
  });

  describe("controles discretos", () => {
    beforeEach(() => {
      Object.defineProperty(document, "fullscreenEnabled", { value: true, configurable: true });
    });

    it("hay enlaces para pedir información (conserva el canal holograma) y para salir", () => {
      render(<Holograma {...props} cargarVisor={cargaOk} />);
      expect(screen.getByRole("link", { name: "Quiero información" })).toHaveAttribute("href", "/proyectos/algarrobos-de-sunampe#contacto");
      expect(screen.getByRole("link", { name: "Salir del modo holograma" })).toHaveAttribute("href", "/proyectos/algarrobos-de-sunampe");
    });

    it("el botón de pantalla completa la pide sobre la pantalla negra", () => {
      const pedir = vi.fn().mockResolvedValue(undefined);
      const { container } = render(<Holograma {...props} cargarVisor={cargaOk} />);
      (container.firstElementChild as HTMLElement).requestFullscreen = pedir;
      fireEvent.click(screen.getByRole("button", { name: "Pantalla completa" }));
      expect(pedir).toHaveBeenCalledOnce();
    });

    it("sin soporte de pantalla completa, no muestra el botón", () => {
      Object.defineProperty(document, "fullscreenEnabled", { value: false, configurable: true });
      render(<Holograma {...props} cargarVisor={cargaOk} />);
      expect(screen.queryByRole("button", { name: "Pantalla completa" })).not.toBeInTheDocument();
    });

    it("los controles se esconden a los 4 segundos sin tocar la pantalla y reaparecen al tocarla", () => {
      vi.useFakeTimers();
      const { container } = render(<Holograma {...props} cargarVisor={cargaOk} />);
      const controles = () => container.querySelector("[data-controles]") as HTMLElement;
      expect(controles()).not.toHaveClass("opacity-0");
      act(() => {
        vi.advanceTimersByTime(4001);
      });
      expect(controles()).toHaveClass("opacity-0");
      act(() => {
        fireEvent.pointerMove(container.firstElementChild as HTMLElement);
      });
      expect(controles()).not.toHaveClass("opacity-0");
    });
  });

  it("mantiene la pantalla encendida mientras se usa (si el navegador lo permite) y no falla si no", async () => {
    const liberar = vi.fn();
    const pedir = vi.fn().mockResolvedValue({ release: liberar });
    Object.defineProperty(navigator, "wakeLock", { value: { request: pedir }, configurable: true });
    const { unmount } = render(<Holograma {...props} cargarVisor={cargaOk} />);
    await waitFor(() => expect(pedir).toHaveBeenCalledWith("screen"));
    unmount();
    await waitFor(() => expect(liberar).toHaveBeenCalled());

    Object.defineProperty(navigator, "wakeLock", { value: { request: vi.fn().mockRejectedValue(new Error("no")) }, configurable: true });
    expect(() => render(<Holograma {...props} cargarVisor={cargaOk} />)).not.toThrow();
  });
});
