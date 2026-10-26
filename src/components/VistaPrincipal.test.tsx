import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProveedorLote, useLote } from "@/components/ContextoLote";
import type { PropsMaqueta } from "@/components/Maqueta3D";
import { VistaPrincipal } from "@/components/VistaPrincipal";
import { leerActividad, limpiarActividad } from "@/lib/actividad";
import type { EstadoLote, Lote, ProyectoDetalle } from "@/lib/proyectos";

// La escena 3D real necesita WebGL (no existe en jsdom): se reemplaza por una versión simple con botones.
vi.mock("@/components/Maqueta3D", () => ({
  default: (p: PropsMaqueta) => (
    <div data-testid="maqueta-3d" data-seleccionado={p.seleccionado ?? ""}>
      {p.lotes.map((l) => (
        <button key={l.codigo} onClick={() => p.alElegir(l)}>
          {`elegir ${l.codigo}`}
        </button>
      ))}
      <button onClick={() => p.alMover?.()}>mover cámara</button>
      <button onClick={() => p.alFallar?.()}>simular fallo</button>
    </div>
  ),
}));

const capacidades = { webgl: true, limitado: false };
vi.mock("@/lib/capacidades", () => ({
  soportaWebGL: () => capacidades.webgl,
  dispositivoLimitado: () => capacidades.limitado,
}));

const lote = (numero: number, estado: EstadoLote, extra: Partial<Lote> = {}): Lote => ({
  codigo: `Mz. A - Lt. ${numero}`,
  manzana: "A",
  numero,
  estado,
  areaM2: 120,
  frenteM: 8,
  fondoM: 15,
  precio: 37200,
  ...extra,
});

const proyecto: ProyectoDetalle = {
  id: 1,
  slug: "algarrobos-de-sunampe",
  nombre: "Algarrobos de Sunampe",
  departamento: "Ica",
  provincia: "Chincha",
  distrito: "Sunampe",
  descripcion: "Lotes.",
  precioDesde: 37200,
  areaDesde: 120,
  areaHasta: 200,
  imagenUrl: "/proyectos/algarrobos-de-sunampe.jpg",
  servicios: "Agua.",
  habilitacionUrbana: "En proceso.",
  financiamiento: "Directo.",
  entrega: "12 meses.",
  modeloArchivo: "/modelos/casa-sunampe.glb",
  modeloAutor: "Kenney",
  modeloLicencia: "CC0 1.0",
  modeloFuente: "https://poly.pizza/m/7VSVwAg2T3",
  lotes: [
    lote(1, "disponible"),
    lote(2, "disponible", { areaM2: 144, frenteM: 9, fondoM: 16, precio: 44640 }),
    lote(3, "separado", { areaM2: 150, frenteM: 10, fondoM: 15, precio: 46500 }),
    lote(4, "vendido"),
  ],
  faq: [],
};

function Sonda() {
  const { loteInteres } = useLote();
  return <p data-testid="sonda">{`interes=${loteInteres?.codigo ?? "-"}`}</p>;
}

const sinVisor = () => Promise.resolve({}); // nunca se carga el model-viewer real en jsdom
const montar = (extra: Partial<React.ComponentProps<typeof VistaPrincipal>> = {}) =>
  render(
    <ProveedorLote>
      <VistaPrincipal proyecto={proyecto} cargarVisor={sinVisor} {...extra} />
      <Sonda />
      <div id="contacto">
        <input id="nombre" aria-label="Nombre" />
      </div>
    </ProveedorLote>,
  );

const elegir = (n: number) => fireEvent.click(screen.getByRole("button", { name: `elegir Mz. A - Lt. ${n}` }));
const panel = () => screen.queryByRole("region", { name: /Datos del lote/ });

describe("VistaPrincipal (maqueta 3D como vista principal, plano 2D de respaldo)", () => {
  beforeEach(() => {
    capacidades.webgl = true;
    capacidades.limitado = false;
    window.sessionStorage.clear();
    limpiarActividad(proyecto.slug);
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe("vista", () => {
    it("con WebGL y un equipo normal, la maqueta 3D es la vista principal", async () => {
      montar();
      expect(await screen.findByTestId("maqueta-3d")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2, name: "Maqueta 3D del proyecto" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Plano de lotización" })).not.toBeInTheDocument();
    });

    it("el botón «Ver plano 2D» cambia al plano SVG y «Ver maqueta 3D» vuelve", async () => {
      montar();
      await screen.findByTestId("maqueta-3d");
      fireEvent.click(screen.getByRole("button", { name: "Ver plano 2D" }));
      expect(screen.getByRole("heading", { name: "Plano de lotización" })).toBeInTheDocument();
      expect(screen.getByText("Plano referencial, no a escala")).toBeVisible();
      expect(screen.queryByTestId("maqueta-3d")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Ver maqueta 3D" }));
      expect(await screen.findByTestId("maqueta-3d")).toBeInTheDocument();
    });

    it("sin WebGL muestra directamente el plano 2D con un aviso, y no ofrece la maqueta", () => {
      capacidades.webgl = false;
      montar();
      expect(screen.getByRole("heading", { name: "Plano de lotización" })).toBeInTheDocument();
      expect(screen.getByRole("note")).toHaveTextContent(/no puede mostrar la maqueta en 3D/);
      expect(screen.queryByRole("button", { name: "Ver maqueta 3D" })).not.toBeInTheDocument();
      expect(screen.queryByTestId("maqueta-3d")).not.toBeInTheDocument();
    });

    it("en un celular lento o con poca conexión empieza en el plano 2D, pero se puede pasar a la maqueta", async () => {
      capacidades.limitado = true;
      montar();
      expect(screen.getByRole("heading", { name: "Plano de lotización" })).toBeInTheDocument();
      expect(screen.getByRole("note")).toHaveTextContent(/Empezamos con el plano 2D para que cargue rápido/);
      fireEvent.click(screen.getByRole("button", { name: "Ver maqueta 3D" }));
      expect(await screen.findByTestId("maqueta-3d")).toBeInTheDocument();
    });

    it("si la maqueta falla al dibujar, cae al plano 2D con un aviso amable", async () => {
      montar();
      await screen.findByTestId("maqueta-3d");
      fireEvent.click(screen.getByRole("button", { name: "simular fallo" }));
      expect(screen.getByRole("heading", { name: "Plano de lotización" })).toBeInTheDocument();
      expect(screen.getByRole("note")).toHaveTextContent(/No pudimos mostrar la maqueta en 3D/);
      expect(document.body.textContent).not.toMatch(/WebGL context|Error:/);
    });
  });

  describe("etiqueta legal", () => {
    it("la maqueta 3D muestra la etiqueta Imagen referencial junto al texto legal", async () => {
      montar();
      await screen.findByTestId("maqueta-3d");
      expect(screen.getByText("Imagen referencial")).toBeVisible();
      expect(screen.getByText(/la empresa vende únicamente el lote/)).toBeVisible();
    });
  });

  describe("lotes en la maqueta", () => {
    it("al tocar un lote disponible se abre su panel con número, medidas, área, precio y estado", async () => {
      montar();
      await screen.findByTestId("maqueta-3d");
      expect(panel()).not.toBeInTheDocument();
      elegir(2);
      const p = panel()!;
      expect(within(p).getByRole("heading", { name: "Mz. A - Lt. 2" })).toBeInTheDocument();
      expect(within(p).getByText("144 m²")).toBeInTheDocument();
      expect(within(p).getByText("9 m × 16 m")).toBeInTheDocument();
      expect(within(p).getByText("S/ 44,640")).toBeInTheDocument();
      expect(within(p).getByText("Disponible")).toBeInTheDocument();
      expect(screen.getByTestId("maqueta-3d")).toHaveAttribute("data-seleccionado", "Mz. A - Lt. 2");
    });

    it("un lote vendido no abre nada", async () => {
      montar();
      await screen.findByTestId("maqueta-3d");
      elegir(4);
      expect(panel()).not.toBeInTheDocument();
      expect(screen.getByTestId("maqueta-3d")).toHaveAttribute("data-seleccionado", "");
    });

    it("un lote separado se puede ver, con un aviso", async () => {
      montar();
      await screen.findByTestId("maqueta-3d");
      elegir(3);
      expect(within(panel()!).getByText("Separado")).toBeInTheDocument();
      expect(within(panel()!).getByText(/separado por otro cliente/i)).toBeInTheDocument();
    });

    it("«Quiero información» precarga el lote en el formulario y lleva al contacto", async () => {
      montar();
      await screen.findByTestId("maqueta-3d");
      elegir(2);
      fireEvent.click(within(panel()!).getByRole("button", { name: "Quiero información" }));
      expect(screen.getByTestId("sonda")).toHaveTextContent("interes=Mz. A - Lt. 2");
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it("«Ver toda la maqueta» y Escape cierran el panel y la cámara vuelve a la vista general", async () => {
      montar();
      await screen.findByTestId("maqueta-3d");
      elegir(1);
      fireEvent.click(within(panel()!).getByRole("button", { name: "Ver toda la maqueta" }));
      expect(panel()).not.toBeInTheDocument();
      expect(screen.getByTestId("maqueta-3d")).toHaveAttribute("data-seleccionado", "");
      elegir(1);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(panel()).not.toBeInTheDocument();
    });

    it("elegir otro lote cambia el panel", async () => {
      montar();
      await screen.findByTestId("maqueta-3d");
      elegir(1);
      elegir(2);
      expect(within(panel()!).getByRole("heading", { name: "Mz. A - Lt. 2" })).toBeInTheDocument();
    });

    it("recuerda en el navegador (sin enviar nada) que se usó el 3D al elegir un lote o mover la cámara", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      montar();
      await screen.findByTestId("maqueta-3d");
      fireEvent.click(screen.getByRole("button", { name: "mover cámara" }));
      expect(leerActividad(proyecto.slug).uso3d).toBe(true);
      limpiarActividad(proyecto.slug);
      elegir(2);
      expect(leerActividad(proyecto.slug).uso3d).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });

  describe("Realidad Aumentada para el lote", () => {
    const cargaOk = () => Promise.resolve({});
    const visorRa = (c: HTMLElement) => c.querySelector("model-viewer") as HTMLElement & { activateAR?: () => void };

    it("el panel ofrece «Ver en tu espacio» con un model-viewer de la casa (solo la casa, sin terreno)", async () => {
      const { container } = montar({ cargarVisor: cargaOk });
      await screen.findByTestId("maqueta-3d");
      elegir(1);
      const v = visorRa(container);
      expect(v).toHaveAttribute("src", "/modelos/casa-sunampe.glb");
      expect(v).toHaveAttribute("ar");
      expect(v.getAttribute("ar-modes")).toBe("webxr scene-viewer quick-look");
      expect(within(panel()!).getByRole("button", { name: "Ver en tu espacio" })).toBeInTheDocument();
    });

    it("si el equipo admite RA, el botón la activa y se recuerda el uso", async () => {
      const { container } = montar({ cargarVisor: cargaOk });
      await screen.findByTestId("maqueta-3d");
      elegir(1);
      const activar = vi.fn();
      const v = visorRa(container);
      Object.defineProperty(v, "canActivateAR", { value: true, configurable: true });
      v.activateAR = activar;
      act(() => {
        fireEvent(v, new Event("load"));
      });
      const boton = within(panel()!).getByRole("button", { name: "Ver en tu espacio" });
      await waitFor(() => expect(boton).toBeEnabled());
      fireEvent.click(boton);
      expect(activar).toHaveBeenCalledOnce();
      expect(leerActividad(proyecto.slug).usoRa).toBe(true);
    });

    it("en laptop o equipos sin RA avisa claramente y mantiene el resto", async () => {
      const { container } = montar({ cargarVisor: cargaOk });
      await screen.findByTestId("maqueta-3d");
      elegir(1);
      const v = visorRa(container);
      Object.defineProperty(v, "canActivateAR", { value: false, configurable: true });
      act(() => {
        fireEvent(v, new Event("load"));
      });
      await waitFor(() => expect(within(panel()!).getByRole("note")).toHaveTextContent(/no admite Realidad Aumentada/));
      expect(within(panel()!).getByRole("button", { name: "Ver en tu espacio" })).toBeDisabled();
      expect(within(panel()!).getByRole("button", { name: "Quiero información" })).toBeEnabled();
    });
  });
});
