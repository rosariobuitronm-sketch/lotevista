import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProveedorLote, useLote } from "@/components/ContextoLote";
import { VisorCasa } from "@/components/VisorCasa";
import type { Lote } from "@/lib/proyectos";

const cargaOk = () => Promise.resolve({});
const lote = { codigo: "Mz. A - Lt. 2", frenteM: 8, fondoM: 15, areaM2: 120 };
const props = { nombre: "Algarrobos de Sunampe", modeloUrl: "/modelos/casa-sunampe.glb", imagenUrl: "/proyectos/algarrobos-de-sunampe.jpg" };

const preparado = (src = "blob:terreno-1") => ({
  src,
  hotspots: [
    { id: "frente", texto: "Frente 8 m", posicion: "0m 0.05m 7.5m" },
    { id: "fondo", texto: "Fondo 15 m", posicion: "4m 0.05m 0m" },
    { id: "area", texto: "120 m²", posicion: "-2.8m 0.05m -5.25m" },
  ],
  liberar: vi.fn(),
});

const visor = (c: HTMLElement) => c.querySelector("model-viewer") as HTMLElement;

describe("VisorCasa sobre un terreno con las medidas del lote", () => {
  it("espera a armar el terreno y luego muestra la casa sobre él, con las medidas ancladas", async () => {
    const prep = preparado();
    const prepararModelo = vi.fn().mockResolvedValue(prep);
    const { container } = render(<VisorCasa {...props} lote={lote} prepararModelo={prepararModelo} cargarVisor={cargaOk} />);

    expect(visor(container)).toBeNull(); // todavía arma el modelo
    expect(screen.getByRole("status")).toHaveTextContent(/Cargando la casa en 3D/);
    await waitFor(() => expect(visor(container)).not.toBeNull());

    expect(prepararModelo).toHaveBeenCalledWith("/modelos/casa-sunampe.glb", lote);
    expect(visor(container)).toHaveAttribute("src", "blob:terreno-1");
    for (const [id, texto] of [["frente", "Frente 8 m"], ["fondo", "Fondo 15 m"], ["area", "120 m²"]]) {
      const h = container.querySelector(`[slot='hotspot-${id}']`);
      expect(h).toHaveTextContent(texto);
      expect(h).toHaveAttribute("data-position");
    }
  });

  it("encuadra el modelo: cámara con ángulo fijo de inicio, sin poder ver por debajo del terreno y sin sombra duplicada", async () => {
    const { container } = render(<VisorCasa {...props} lote={lote} prepararModelo={async () => preparado()} cargarVisor={cargaOk} />);
    await waitFor(() => expect(visor(container)).not.toBeNull());
    const v = visor(container);
    expect(v.getAttribute("camera-orbit")).toMatch(/^\d+deg \d+deg \d+%$/); // distancia relativa: la casa llena bien el cuadro
    expect(Number(/ (\d+)%$/.exec(v.getAttribute("camera-orbit")!)![1])).toBeLessThan(100);
    expect(v.getAttribute("max-camera-orbit")).toMatch(/auto \d+deg auto/);
    expect(Number(/ (\d+)deg auto$/.exec(v.getAttribute("max-camera-orbit")!)![1])).toBeLessThan(90);
    expect(v).toHaveAttribute("camera-controls");
    expect(v).toHaveAttribute("auto-rotate");
    expect(v.getAttribute("shadow-intensity")).toBe("0");
  });

  it("muestra una sola etiqueta Imagen referencial visible, junto al texto legal; la del visor es solo para la RA", async () => {
    const { container } = render(<VisorCasa {...props} lote={lote} prepararModelo={async () => preparado()} cargarVisor={cargaOk} />);
    await waitFor(() => expect(visor(container)).not.toBeNull());
    const etiquetas = [...container.querySelectorAll("[data-testid=etiqueta-referencial]")] as HTMLElement[];
    expect(etiquetas).toHaveLength(2);
    const dentro = etiquetas.find((e) => visor(container).contains(e))!;
    const fuera = etiquetas.find((e) => !visor(container).contains(e))!;
    const envoltura = dentro.closest("[data-solo-ra]")!;
    expect(envoltura.className).toMatch(/\bhidden\b/); // oculta, salvo durante la sesión de RA
    expect(envoltura.className).toMatch(/ar-status=session-started/);
    expect(fuera.className).not.toMatch(/\bhidden\b/);
    expect(fuera.textContent).toMatch(/la empresa vende únicamente el lote/); // va junto al texto legal
  });

  it("con la imagen de respaldo también hay una sola etiqueta, junto al texto legal", async () => {
    const { container } = render(<VisorCasa {...props} modeloUrl={null} lote={lote} cargarVisor={cargaOk} />);
    expect(container.querySelectorAll("[data-testid=etiqueta-referencial]")).toHaveLength(1);
    expect(screen.getByText(/la empresa vende únicamente el lote/)).toBeInTheDocument();
  });

  it("si no se puede armar el terreno, muestra la casa sola sin romperse y sin mensajes técnicos", async () => {
    const { container } = render(
      <VisorCasa {...props} lote={lote} prepararModelo={() => Promise.reject(new Error("glb dañado"))} cargarVisor={cargaOk} />,
    );
    await waitFor(() => expect(visor(container)).not.toBeNull());
    expect(visor(container)).toHaveAttribute("src", "/modelos/casa-sunampe.glb");
    expect(container.querySelectorAll("[slot^='hotspot']")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/glb dañado|Error/);
  });

  it("al elegir «Ver casa 3D en este lote» en el plano, rearma el terreno con las medidas de ese lote", async () => {
    const otro: Lote = { codigo: "Mz. B - Lt. 3", manzana: "B", numero: 3, estado: "disponible", areaM2: 200, frenteM: 10, fondoM: 20, precio: 62000 };
    function Elegir() {
      const { elegir3d } = useLote();
      return <button onClick={() => elegir3d(otro)}>elegir otro lote</button>;
    }
    const prepararModelo = vi.fn().mockImplementation(async (_u: string, l: { frenteM: number }) => preparado(`blob:frente-${l.frenteM}`));
    const { container } = render(
      <ProveedorLote>
        <Elegir />
        <VisorCasa {...props} lote={lote} prepararModelo={prepararModelo} cargarVisor={cargaOk} />
      </ProveedorLote>,
    );
    await waitFor(() => expect(visor(container)).toHaveAttribute("src", "blob:frente-8"));
    fireEvent.click(screen.getByRole("button", { name: "elegir otro lote" }));
    await waitFor(() => expect(visor(container)).toHaveAttribute("src", "blob:frente-10"));
    expect(prepararModelo).toHaveBeenLastCalledWith("/modelos/casa-sunampe.glb", expect.objectContaining({ frenteM: 10, fondoM: 20, areaM2: 200 }));
  });

  it("libera el modelo armado al cambiar de lote o al salir de la página", async () => {
    const prep = preparado();
    const { unmount } = render(<VisorCasa {...props} lote={lote} prepararModelo={async () => prep} cargarVisor={cargaOk} />);
    await waitFor(() => expect(screen.getByText("Frente 8 m")).toBeInTheDocument());
    unmount();
    expect(prep.liberar).toHaveBeenCalled();
  });

  it("en RA oculta el terreno y las medidas, y los vuelve a mostrar al salir", async () => {
    const material = (name: string) => {
      const llamadas: number[][] = [];
      return { name, llamadas, pbrMetallicRoughness: { setBaseColorFactor: (c: number[]) => llamadas.push(c) } };
    };
    const terreno = material("terreno");
    const { container } = render(<VisorCasa {...props} lote={lote} prepararModelo={async () => preparado()} cargarVisor={cargaOk} />);
    await waitFor(() => expect(visor(container)).not.toBeNull());
    Object.defineProperty(visor(container), "model", { value: { materials: [terreno, material("pared")] }, configurable: true });

    act(() => {
      fireEvent(visor(container), new CustomEvent("ar-status", { detail: { status: "session-started" } }));
    });
    expect(terreno.llamadas.at(-1)![3]).toBe(0);
    act(() => {
      fireEvent(visor(container), new CustomEvent("ar-status", { detail: { status: "not-presenting" } }));
    });
    expect(terreno.llamadas.at(-1)![3]).toBe(1);
  });
});
