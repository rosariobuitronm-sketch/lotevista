import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Proyecto } from "@/lib/proyectos";

const listarProyectos = vi.fn();
vi.mock("@/lib/proyectos", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/proyectos")>()),
  listarProyectos: () => listarProyectos(),
}));

import { Catalogo, CatalogoVista } from "@/components/Catalogo";
import { TarjetaProyecto } from "@/components/TarjetaProyecto";

const proyecto = (extra: Partial<Proyecto> = {}): Proyecto => ({
  id: 1,
  slug: "algarrobos-de-sunampe",
  nombre: "Algarrobos de Sunampe",
  departamento: "Ica",
  provincia: "Chincha",
  distrito: "Sunampe",
  descripcion: "Lotes residenciales.",
  precioDesde: 37200,
  areaDesde: 120,
  areaHasta: 200,
  imagenUrl: "/proyectos/algarrobos-de-sunampe.jpg",
  servicios: "Agua, desagüe y luz.",
  habilitacionUrbana: "En proceso.",
  financiamiento: "Directo.",
  entrega: "12 meses.",
  modeloArchivo: "/modelos/casa-sunampe.glb",
  modeloAutor: "Kenney",
  modeloLicencia: "CC0 1.0",
  modeloFuente: "https://poly.pizza/m/7VSVwAg2T3",
  ...extra,
});

describe("TarjetaProyecto", () => {
  it("muestra nombre, ubicación, precio desde, metraje e imagen", () => {
    render(<TarjetaProyecto proyecto={proyecto()} />);
    expect(screen.getByRole("heading", { name: "Algarrobos de Sunampe" })).toBeInTheDocument();
    expect(screen.getByText("Sunampe, Chincha, Ica")).toBeInTheDocument();
    expect(screen.getByText("S/ 37,200")).toBeInTheDocument();
    expect(screen.getByText("120 – 200 m²")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Algarrobos de Sunampe/ })).toBeInTheDocument();
  });

  it("lleva a la ficha del proyecto", () => {
    render(<TarjetaProyecto proyecto={proyecto()} />);
    expect(screen.getByRole("link", { name: /Ver proyecto/ })).toHaveAttribute("href", "/proyectos/algarrobos-de-sunampe");
  });

  it("la imagen, que dibuja una casa, lleva la etiqueta Imagen referencial", () => {
    render(<TarjetaProyecto proyecto={proyecto()} />);
    expect(screen.getByText("Imagen referencial")).toBeInTheDocument();
  });
});

describe("CatalogoVista", () => {
  it("muestra una tarjeta por proyecto", () => {
    render(
      <CatalogoVista
        proyectos={[proyecto(), proyecto({ id: 2, slug: "otro", nombre: "Otro Proyecto" })]}
      />,
    );
    const lista = screen.getByRole("list");
    expect(within(lista).getAllByRole("listitem")).toHaveLength(2);
  });

  it("muestra un aviso amable si no hay proyectos", () => {
    render(<CatalogoVista proyectos={[]} />);
    expect(screen.getByText(/Pronto tendremos proyectos/)).toBeInTheDocument();
  });
});

describe("Catalogo (lee de la base de datos)", () => {
  beforeEach(() => {
    listarProyectos.mockReset();
  });

  it("muestra los proyectos leídos", async () => {
    listarProyectos.mockResolvedValue([proyecto()]);
    render(await Catalogo());
    expect(screen.getByRole("heading", { name: "Algarrobos de Sunampe" })).toBeInTheDocument();
  });

  it("si la base no responde, muestra un mensaje amable en español sin detalles técnicos", async () => {
    listarProyectos.mockRejectedValue(new Error("connect ECONNREFUSED postgres://u:clave@host/db"));
    const { container } = render(await Catalogo());
    expect(screen.getByRole("alert")).toHaveTextContent(/No pudimos cargar los proyectos/);
    expect(container.textContent).not.toMatch(/ECONNREFUSED|postgres|clave|Error:/);
  });
});
