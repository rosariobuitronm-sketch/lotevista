import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BotonImprimir } from "@/components/BotonImprimir";
import { QrImprimible, QrProyecto } from "@/components/QrProyecto";

describe("QrProyecto (en la ficha)", () => {
  it("muestra el QR generado por el servidor con un texto alternativo claro", () => {
    render(<QrProyecto slug="algarrobos-de-sunampe" nombre="Algarrobos de Sunampe" />);
    const img = screen.getByRole("img", { name: /Código QR para abrir la ficha de Algarrobos de Sunampe en tu celular/ });
    expect(img).toHaveAttribute("src", "/api/qr/algarrobos-de-sunampe");
  });

  it("se puede descargar y abrir para imprimir", () => {
    render(<QrProyecto slug="algarrobos-de-sunampe" nombre="Algarrobos de Sunampe" />);
    const descargar = screen.getByRole("link", { name: /Descargar QR/ });
    expect(descargar).toHaveAttribute("href", "/api/qr/algarrobos-de-sunampe?descargar=1");
    expect(descargar).toHaveAttribute("download");
    expect(screen.getByRole("link", { name: /Ver para imprimir/ })).toHaveAttribute("href", "/qr/algarrobos-de-sunampe");
  });
});

describe("QrImprimible (página para imprimir)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra el QR grande con el nombre del proyecto y una instrucción", () => {
    render(<QrImprimible slug="campina-de-huaral" nombre="Campiña de Huaral" />);
    expect(screen.getByRole("heading", { level: 1, name: "Campiña de Huaral" })).toBeInTheDocument();
    expect(screen.getByText(/Escanea el código con la cámara de tu celular/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Código QR/ })).toHaveAttribute("src", "/api/qr/campina-de-huaral");
  });

  it("el botón Imprimir abre el diálogo de impresión", () => {
    const imprimir = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<BotonImprimir />);
    fireEvent.click(screen.getByRole("button", { name: /Imprimir/ }));
    expect(imprimir).toHaveBeenCalledOnce();
  });
});
