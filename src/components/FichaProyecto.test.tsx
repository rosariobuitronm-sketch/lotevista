import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProyectoDetalle } from "@/lib/proyectos";

const obtenerProyecto = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("@/lib/proyectos", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/proyectos")>()),
  obtenerProyecto: (slug: string) => obtenerProyecto(slug),
}));
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

import { FichaCargada, FichaProyecto } from "@/components/FichaProyecto";
import { NoEncontrado } from "@/components/NoEncontrado";

const detalle: ProyectoDetalle = {
  id: 1,
  slug: "algarrobos-de-sunampe",
  nombre: "Algarrobos de Sunampe",
  departamento: "Ica",
  provincia: "Chincha",
  distrito: "Sunampe",
  descripcion: "Lotes residenciales en Sunampe.",
  precioDesde: 37200,
  areaDesde: 120,
  areaHasta: 200,
  imagenUrl: "/proyectos/algarrobos-de-sunampe.jpg",
  servicios: "Agua potable, desagüe y electricidad.",
  habilitacionUrbana: "Habilitación urbana en proceso.",
  financiamiento: "Cuota inicial desde el 10 % y hasta 60 cuotas mensuales.",
  entrega: "Posesión inmediata al pagar la cuota inicial.",
  modeloArchivo: null,
  modeloAutor: null,
  modeloLicencia: null,
  modeloFuente: null,
  lotes: [
    { codigo: "Mz. A - Lt. 1", manzana: "A", numero: 1, estado: "disponible", areaM2: 120, frenteM: 8, fondoM: 15, precio: 37200 },
    { codigo: "Mz. C - Lt. 2", manzana: "C", numero: 2, estado: "vendido", areaM2: 200, frenteM: 10, fondoM: 20, precio: 62000 },
    { codigo: "Mz. B - Lt. 1", manzana: "B", numero: 1, estado: "separado", areaM2: 144, frenteM: 9, fondoM: 16, precio: 44640 },
  ],
  faq: [],
};

describe("FichaProyecto", () => {
  it("muestra los datos del proyecto", () => {
    render(<FichaProyecto proyecto={detalle} />);
    expect(screen.getByRole("heading", { level: 1, name: "Algarrobos de Sunampe" })).toBeInTheDocument();
    expect(screen.getByText("Sunampe, Chincha, Ica")).toBeInTheDocument();
    expect(screen.getByText("Lotes residenciales en Sunampe.")).toBeInTheDocument();
    expect(screen.getByText("Agua potable, desagüe y electricidad.")).toBeInTheDocument();
    expect(screen.getByText("Habilitación urbana en proceso.")).toBeInTheDocument();
  });

  it("muestra los lotes referenciales con área, frente, fondo y precio", () => {
    render(<FichaProyecto proyecto={detalle} />);
    const tabla = screen.getByRole("table", { name: /Lotes referenciales/, hidden: true });
    const filas = within(tabla).getAllByRole("row", { hidden: true });
    expect(filas).toHaveLength(4); // encabezado + 3 lotes
    const primera = within(filas[1]).getAllByRole("cell", { hidden: true }).map((c) => c.textContent);
    expect(primera).toEqual(["Mz. A - Lt. 1", "120 m²", "8 m", "15 m", "S/ 37,200", "Disponible"]);
    expect(within(tabla).getByText("S/ 62,000", { ignore: "script" })).toBeInTheDocument();
  });

  it("muestra el financiamiento y la entrega solo como texto", () => {
    render(<FichaProyecto proyecto={detalle} />);
    expect(screen.getByText(/hasta 60 cuotas mensuales/)).toBeInTheDocument();
    expect(screen.getByText(/Posesión inmediata/)).toBeInTheDocument();
  });

  it("no tiene simulador de cuotas ni cronograma de pagos (el financiamiento es solo texto)", () => {
    const { container } = render(<FichaProyecto proyecto={detalle} />);
    expect(container.textContent ?? "").not.toMatch(/simulador|cronograma/i);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("muestra el plano de lotización referencial, con leyenda y el aviso de que no está a escala", () => {
    render(<FichaProyecto proyecto={detalle} />);
    expect(screen.getByRole("heading", { level: 2, name: "Plano de lotización" })).toBeInTheDocument();
    expect(screen.getByText("Plano referencial, no a escala")).toBeVisible();
    expect(screen.getByRole("list", { name: "Leyenda del plano" })).toBeInTheDocument();
  });

  it("ofrece la lista de lotes en una tabla como alternativa accesible al plano", () => {
    const { container } = render(<FichaProyecto proyecto={detalle} />);
    expect(container.querySelector("details > summary")).toHaveTextContent("Ver la lista de lotes en una tabla (3 lotes)");
  });

  it("tiene los destinos de los botones del plano (visor 3D y contacto), sin ids repetidos", () => {
    const { container } = render(<FichaProyecto proyecto={detalle} />);
    expect(container.querySelector("#visor3d")).not.toBeNull();
    expect(container.querySelector("#contacto")).not.toBeNull();
    const ids = [...container.querySelectorAll("[id]")].map((e) => e.id);
    expect(new Set(ids).size, "ids repetidos: " + ids.join(",")).toBe(ids.length);
  });

  it("aclara que se vende solo el lote y las medidas son referenciales", () => {
    render(<FichaProyecto proyecto={detalle} />);
    expect(screen.getAllByText(/se vende únicamente el lote/i).length).toBeGreaterThan(0);
  });

  it("la casa siempre se acompaña de la etiqueta Imagen referencial", () => {
    render(<FichaProyecto proyecto={detalle} />);
    expect(screen.getAllByText("Imagen referencial").length).toBeGreaterThan(0);
  });

  it("incluye un enlace para volver al catálogo", () => {
    render(<FichaProyecto proyecto={detalle} />);
    expect(screen.getByRole("link", { name: /Todos los proyectos/ })).toHaveAttribute("href", "/");
  });
});

describe("FichaCargada (lee la ficha de la base de datos)", () => {
  beforeEach(() => {
    obtenerProyecto.mockReset();
    notFound.mockClear();
  });

  it("muestra la ficha cuando el proyecto existe", async () => {
    obtenerProyecto.mockResolvedValue(detalle);
    render(await FichaCargada({ slug: "algarrobos-de-sunampe" }));
    expect(screen.getByRole("heading", { level: 1, name: "Algarrobos de Sunampe" })).toBeInTheDocument();
  });

  it("un slug inexistente activa la página amable (notFound)", async () => {
    obtenerProyecto.mockResolvedValue(null);
    await expect(FichaCargada({ slug: "no-existe" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("si la base falla, muestra un mensaje amable sin detalles técnicos", async () => {
    obtenerProyecto.mockRejectedValue(new Error("connect ECONNREFUSED postgres://u:clave@host/db"));
    const { container } = render(await FichaCargada({ slug: "algarrobos-de-sunampe" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/No pudimos cargar este proyecto/);
    expect(container.textContent).not.toMatch(/ECONNREFUSED|postgres|clave/);
    expect(screen.getByRole("link", { name: /catálogo/i })).toHaveAttribute("href", "/");
  });
});

describe("NoEncontrado (página amable)", () => {
  it("explica en español y enlaza al catálogo", () => {
    render(<NoEncontrado />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/No encontramos esta página/);
    expect(screen.getByRole("link", { name: /Ver los proyectos/ })).toHaveAttribute("href", "/");
  });
});
