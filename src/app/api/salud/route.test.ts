import { beforeEach, describe, expect, it, vi } from "vitest";

const consulta = vi.fn();
vi.mock("@/lib/db", () => ({ getSql: () => consulta }));

import { GET } from "./route";

describe("GET /api/salud", () => {
  beforeEach(() => {
    consulta.mockReset();
  });

  it("dice que la base está accesible cuando responde", async () => {
    consulta.mockResolvedValue([{ ok: 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, base: "accesible" });
  });

  it("responde 503 sin detalles técnicos ni secretos si la base falla", async () => {
    consulta.mockImplementation(async () => {
      throw new Error("password authentication failed for postgres://u:secreto@host");
    });
    const res = await GET();
    const texto = await res.text();
    expect(res.status).toBe(503);
    expect(JSON.parse(texto)).toEqual({ ok: false, base: "no disponible" });
    expect(texto).not.toContain("secreto");
  });
});
