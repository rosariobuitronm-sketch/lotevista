import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListaLeads } from "@/components/ListaLeads";
import type { LeadPanel } from "@/lib/panel";

const proyectos = [
  { slug: "algarrobos-de-sunampe", nombre: "Algarrobos de Sunampe" },
  { slug: "campina-de-huaral", nombre: "Campiña de Huaral" },
];

const lead = (extra: Partial<LeadPanel> = {}): LeadPanel => ({
  id: 1,
  nombre: "María Quispe",
  celular: "987654321",
  correo: "maria@example.com",
  horario: "Tarde (12 m. a 6 p. m.)",
  creadoEn: "2026-10-20T15:00:00.000Z",
  ultimoContacto: "2026-10-21T20:30:00.000Z",
  intereses: [
    { proyecto: "Algarrobos de Sunampe", slug: "algarrobos-de-sunampe", canal: "qr_sala", uso3d: true, usoRa: false, fecha: "2026-10-20T15:00:00.000Z" },
    { proyecto: "Campiña de Huaral", slug: "campina-de-huaral", canal: "holograma", uso3d: false, usoRa: true, fecha: "2026-10-21T20:30:00.000Z" },
  ],
  preguntas: [
    { proyecto: "Algarrobos de Sunampe", pregunta: "¿Hay agua?", respuesta: "Sí, agua potable.", sabe: true, fecha: "2026-10-20T15:00:00.000Z" },
    { proyecto: "Algarrobos de Sunampe", pregunta: "¿Me hacen descuento?", respuesta: "Un asesor te ayudará.", sabe: false, fecha: "2026-10-20T15:01:00.000Z" },
  ],
  ...extra,
});

describe("ListaLeads", () => {
  it("sin leads muestra el estado vacío en español", () => {
    render(<ListaLeads leads={[]} proyectos={proyectos} proyectoActual={undefined} />);
    expect(screen.getByText(/Aún no hay leads/)).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("con filtro y sin resultados explica que no hay leads de ese proyecto", () => {
    render(<ListaLeads leads={[]} proyectos={proyectos} proyectoActual="campina-de-huaral" />);
    expect(screen.getByText(/Aún no hay leads de Campiña de Huaral/)).toBeInTheDocument();
  });

  it("muestra los datos del lead: nombre, celular, correo, horario y último contacto", () => {
    render(<ListaLeads leads={[lead()]} proyectos={proyectos} proyectoActual={undefined} />);
    const tarjeta = screen.getByRole("article");
    expect(within(tarjeta).getByRole("heading", { name: "María Quispe" })).toBeInTheDocument();
    expect(within(tarjeta).getByText("987654321")).toBeInTheDocument();
    expect(within(tarjeta).getByText("maria@example.com")).toBeInTheDocument();
    expect(within(tarjeta).getByText("Tarde (12 m. a 6 p. m.)")).toBeInTheDocument();
    expect(within(tarjeta).getByText("Último contacto: 21 oct 2026, 3:30 p. m.")).toBeInTheDocument();
  });

  it("sin horario indica Sin preferencia", () => {
    render(<ListaLeads leads={[lead({ horario: null })]} proyectos={proyectos} proyectoActual={undefined} />);
    expect(screen.getByText("Sin preferencia")).toBeInTheDocument();
  });

  it("muestra el historial: proyecto, canal, uso de 3D/RA y fecha", () => {
    render(<ListaLeads leads={[lead()]} proyectos={proyectos} proyectoActual={undefined} />);
    const historial = screen.getByRole("list", { name: /Historial de proyectos/ });
    const filas = within(historial).getAllByRole("listitem");
    expect(filas).toHaveLength(2);
    expect(filas[0]).toHaveTextContent("Algarrobos de Sunampe");
    expect(filas[0]).toHaveTextContent("QR en sala");
    expect(filas[0]).toHaveTextContent("Usó 3D");
    expect(filas[1]).toHaveTextContent("Holograma");
    expect(filas[1]).toHaveTextContent("Usó RA");
  });

  it("muestra las preguntas al asistente y marca las que se derivaron a un asesor", () => {
    render(<ListaLeads leads={[lead()]} proyectos={proyectos} proyectoActual={undefined} />);
    const preguntas = screen.getByRole("list", { name: /Preguntas al asistente/ });
    expect(within(preguntas).getByText("¿Hay agua?")).toBeInTheDocument();
    expect(within(preguntas).getByText("Sí, agua potable.")).toBeInTheDocument();
    expect(within(preguntas).getByText(/Derivada a un asesor/)).toBeInTheDocument();
  });

  it("los textos del cliente se muestran como texto, nunca como HTML", () => {
    const malicioso = lead({
      nombre: "<img src=x onerror=alert(1)>",
      correo: "<script>alert(2)</script>@x.com",
      preguntas: [{ proyecto: "P", pregunta: "<b>negrita</b><script>alert(3)</script>", respuesta: "<a href='javascript:alert(4)'>clic</a>", sabe: true, fecha: "2026-10-20T15:00:00.000Z" }],
    });
    const { container } = render(<ListaLeads leads={[malicioso]} proyectos={proyectos} proyectoActual={undefined} />);
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(screen.getByText("<b>negrita</b><script>alert(3)</script>")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("a[href^='javascript']")).toBeNull();
  });

  it("el filtro por proyecto son enlaces: Todos y uno por proyecto, con el actual marcado", () => {
    render(<ListaLeads leads={[lead()]} proyectos={proyectos} proyectoActual="campina-de-huaral" />);
    const filtro = screen.getByRole("navigation", { name: /Filtrar por proyecto/ });
    expect(within(filtro).getByRole("link", { name: "Todos" })).toHaveAttribute("href", "/panel");
    expect(within(filtro).getByRole("link", { name: "Algarrobos de Sunampe" })).toHaveAttribute("href", "/panel?proyecto=algarrobos-de-sunampe");
    expect(within(filtro).getByRole("link", { name: "Campiña de Huaral" })).toHaveAttribute("aria-current", "page");
  });

  it("muestra cuántos leads hay", () => {
    render(<ListaLeads leads={[lead(), lead({ id: 2, nombre: "Otro" })]} proyectos={proyectos} proyectoActual={undefined} />);
    expect(screen.getByText(/2 leads/)).toBeInTheDocument();
  });
});
