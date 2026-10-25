import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Página de inicio", () => {
  it("muestra el nombre LoteVista y el aviso Próximamente", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "LoteVista" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Próximamente")).toBeInTheDocument();
  });
});
