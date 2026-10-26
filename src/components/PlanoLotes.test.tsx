import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanoLotes } from "@/components/PlanoLotes";
import { ProveedorLote, useLote } from "@/components/ContextoLote";
import type { EstadoLote, Lote } from "@/lib/proyectos";

const crear = (manzana: string, numero: number, estado: EstadoLote, extra: Partial<Lote> = {}): Lote => ({
  codigo: `Mz. ${manzana} - Lt. ${numero}`,
  manzana,
  numero,
  estado,
  areaM2: 120,
  frenteM: 8,
  fondoM: 15,
  precio: 37200,
  ...extra,
});

const lotes: Lote[] = [
  crear("A", 1, "disponible"),
  crear("A", 2, "disponible", { areaM2: 144, frenteM: 9, fondoM: 16, precio: 44640 }),
  crear("A", 3, "vendido"),
  crear("A", 4, "separado", { areaM2: 150, frenteM: 10, fondoM: 15, precio: 46500 }),
  crear("B", 1, "disponible"),
  crear("B", 2, "vendido"),
  crear("C", 1, "disponible", { areaM2: 200, frenteM: 10, fondoM: 20, precio: 62000 }),
];

// Muestra qué eligió el visitante, para comprobar que el plano avisa al formulario y al visor 3D.
function Sonda() {
  const { loteInteres, lote3d } = useLote();
  return (
    <p data-testid="sonda">
      interes={loteInteres?.codigo ?? "-"}; 3d={lote3d?.codigo ?? "-"}
    </p>
  );
}

const montar = () =>
  render(
    <ProveedorLote>
      <PlanoLotes lotes={lotes} nombreProyecto="Algarrobos de Sunampe" />
      <Sonda />
      <div id="visor3d" />
      <div id="contacto">
        <input id="nombre" aria-label="Nombre" />
      </div>
    </ProveedorLote>,
  );

const lote = (codigo: string) => screen.getByRole("button", { name: new RegExp(codigo.replace(".", "\\.")) });
const panel = () => screen.queryByRole("region", { name: /Datos del lote/ });

describe("PlanoLotes", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("dice con claridad que el plano es referencial y no está a escala", () => {
    montar();
    expect(screen.getByText("Plano referencial, no a escala")).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Plano de lotización" })).toBeInTheDocument();
  });

  it("tiene leyenda de colores con la cantidad de lotes de cada estado", () => {
    montar();
    const leyenda = screen.getByRole("list", { name: "Leyenda del plano" });
    const items = within(leyenda).getAllByRole("listitem").map((i) => i.textContent);
    expect(items).toEqual(["Disponible (4)", "Separado (1)", "Vendido (2)"]);
  });

  it("cada lote del plano muestra su número y su área", () => {
    const { container } = montar();
    const textos = [...container.querySelectorAll("svg text")].map((t) => t.textContent);
    for (const l of lotes) {
      expect(textos).toContain(String(l.numero));
      expect(textos).toContain(`${l.areaM2} m²`);
    }
  });

  it("el plano dibuja una calle curva, un parque circular y rotula las manzanas", () => {
    const { container } = montar();
    expect(container.querySelector("svg path[data-calle]")).not.toBeNull();
    expect(container.querySelector("svg circle[data-parque]")).not.toBeNull();
    const textos = [...container.querySelectorAll("svg text")].map((t) => t.textContent);
    expect(textos).toEqual(expect.arrayContaining(["MANZANA A", "MANZANA B", "MANZANA C", "Parque"]));
  });

  it("el plano tiene un nombre accesible con el proyecto", () => {
    montar();
    expect(screen.getByRole("group", { name: /Plano de lotización de Algarrobos de Sunampe/ })).toBeInTheDocument();
  });

  describe("lotes disponibles y separados", () => {
    it("se pueden usar con teclado y tienen una descripción completa para lectores de pantalla", () => {
      montar();
      const l = lote("Mz. A - Lt. 1");
      expect(l).toHaveAttribute("tabindex", "0");
      expect(l).toHaveAccessibleName("Mz. A - Lt. 1, 120 m², 8 m de frente por 15 m de fondo, S/ 37,200, disponible");
    });

    it("al hacer clic en uno disponible se abre su panel con todos los datos", () => {
      montar();
      expect(panel()).not.toBeInTheDocument();
      fireEvent.click(lote("Mz. A - Lt. 2"));
      const p = panel()!;
      expect(within(p).getByRole("heading", { name: "Mz. A - Lt. 2" })).toBeInTheDocument();
      expect(within(p).getByText("144 m²")).toBeInTheDocument();
      expect(within(p).getByText("9 m × 16 m")).toBeInTheDocument();
      expect(within(p).getByText("S/ 44,640")).toBeInTheDocument();
      expect(within(p).getByText("Disponible")).toBeInTheDocument();
      expect(within(p).getByRole("button", { name: "Ver casa 3D en este lote" })).toBeInTheDocument();
      expect(within(p).getByRole("button", { name: "Quiero información" })).toBeInTheDocument();
      expect(lote("Mz. A - Lt. 2")).toHaveAttribute("aria-pressed", "true");
    });

    it("también se abre con Enter y con la barra espaciadora", () => {
      montar();
      fireEvent.keyDown(lote("Mz. A - Lt. 1"), { key: "Enter" });
      expect(within(panel()!).getByRole("heading", { name: "Mz. A - Lt. 1" })).toBeInTheDocument();
      fireEvent.keyDown(lote("Mz. C - Lt. 1"), { key: " " });
      expect(within(panel()!).getByRole("heading", { name: "Mz. C - Lt. 1" })).toBeInTheDocument();
    });

    it("al elegir otro lote el panel cambia", () => {
      montar();
      fireEvent.click(lote("Mz. A - Lt. 1"));
      fireEvent.click(lote("Mz. B - Lt. 1"));
      expect(within(panel()!).getByRole("heading", { name: "Mz. B - Lt. 1" })).toBeInTheDocument();
      expect(lote("Mz. A - Lt. 1")).toHaveAttribute("aria-pressed", "false");
    });

    it("Escape y el botón Cerrar cierran el panel", () => {
      montar();
      fireEvent.click(lote("Mz. A - Lt. 1"));
      fireEvent.keyDown(panel()!, { key: "Escape" });
      expect(panel()).not.toBeInTheDocument();
      fireEvent.click(lote("Mz. A - Lt. 1"));
      fireEvent.click(within(panel()!).getByRole("button", { name: "Cerrar" }));
      expect(panel()).not.toBeInTheDocument();
    });

    it("un lote separado también se puede ver, con un aviso de que está separado", () => {
      montar();
      fireEvent.click(lote("Mz. A - Lt. 4"));
      const p = panel()!;
      expect(within(p).getByText("Separado")).toBeInTheDocument();
      expect(within(p).getByText(/separado por otro cliente/i)).toBeInTheDocument();
    });
  });

  describe("lotes vendidos", () => {
    it("no son clicables ni se pueden enfocar con teclado, pero un lector de pantalla los describe", () => {
      montar();
      expect(screen.queryByRole("button", { name: /Mz\. A - Lt\. 3/ })).not.toBeInTheDocument();
      const vendido = screen.getByRole("img", { name: /Mz\. A - Lt\. 3, .*vendido/ });
      expect(vendido).not.toHaveAttribute("tabindex");
      fireEvent.click(vendido);
      fireEvent.keyDown(vendido, { key: "Enter" });
      expect(panel()).not.toBeInTheDocument();
    });
  });

  describe("botones del panel", () => {
    it("Quiero información precarga el lote en el formulario y lleva al contacto", () => {
      montar();
      fireEvent.click(lote("Mz. A - Lt. 2"));
      fireEvent.click(screen.getByRole("button", { name: "Quiero información" }));
      expect(screen.getByTestId("sonda")).toHaveTextContent("interes=Mz. A - Lt. 2");
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });

    it("Ver casa 3D en este lote avisa al visor y lleva hasta él", () => {
      montar();
      fireEvent.click(lote("Mz. C - Lt. 1"));
      fireEvent.click(screen.getByRole("button", { name: "Ver casa 3D en este lote" }));
      expect(screen.getByTestId("sonda")).toHaveTextContent("3d=Mz. C - Lt. 1");
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  it("sin lote elegido, el panel invita a tocar un lote", () => {
    montar();
    expect(screen.getByText(/Toca un lote disponible/)).toBeInTheDocument();
  });
});
