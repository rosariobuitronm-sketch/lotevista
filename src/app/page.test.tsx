import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/proyectos", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/proyectos")>()),
  listarProyectos: () => new Promise(() => {}), // la base "tarda": se ve el estado de carga
}));

import Home from "@/app/page";

describe("Página de inicio", () => {
  it("muestra el nombre LoteVista y la sección de proyectos", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1, name: "LoteVista" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Nuestros proyectos" })).toBeInTheDocument();
  });

  it("aclara desde el inicio que se vende el lote y la casa es referencial", () => {
    render(<Home />);
    expect(screen.getByText(/la casa que ves es solo una referencia/i)).toBeInTheDocument();
  });

  it("mientras carga la base muestra un indicador de carga", () => {
    render(<Home />);
    expect(screen.getByLabelText("Cargando proyectos")).toBeInTheDocument();
  });
});
