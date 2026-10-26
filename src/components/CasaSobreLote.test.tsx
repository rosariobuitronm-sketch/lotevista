import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CasaSobreLote } from "@/components/CasaSobreLote";
import { ProveedorLote, useLote } from "@/components/ContextoLote";
import type { Lote } from "@/lib/proyectos";

const LOTE: Lote = { codigo: "Mz. B - Lt. 2", manzana: "B", numero: 2, estado: "disponible", areaM2: 144, frenteM: 9, fondoM: 16, precio: 44640 };

function Elegir() {
  const { elegir3d } = useLote();
  return (
    <button type="button" onClick={() => elegir3d(LOTE)}>
      ver casa en el lote
    </button>
  );
}

describe("CasaSobreLote", () => {
  const montar = () =>
    render(
      <ProveedorLote>
        <Elegir />
        <CasaSobreLote />
      </ProveedorLote>,
    );

  it("no muestra nada hasta que se elige un lote con «Ver casa 3D en este lote»", () => {
    montar();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("indica sobre qué lote se está mostrando la casa y recuerda que es solo una referencia", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "ver casa en el lote" }));
    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent("Mz. B - Lt. 2");
    expect(aviso).toHaveTextContent("144 m²");
    expect(aviso).toHaveTextContent("9 m × 16 m");
    expect(aviso).toHaveTextContent(/casa es solo una referencia/i);
    // La única etiqueta visible de la ficha está bajo el visor, junto al texto legal: aquí no se repite.
    expect(screen.queryByText("Imagen referencial")).not.toBeInTheDocument();
  });

  it("se puede quitar el lote", () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "ver casa en el lote" }));
    fireEvent.click(screen.getByRole("button", { name: /Quitar/ }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
