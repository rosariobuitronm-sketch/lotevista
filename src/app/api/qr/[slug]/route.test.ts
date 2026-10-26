// @vitest-environment node
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const pedir = (slug: string, consulta = "", cabeceras: Record<string, string> = {}) =>
  GET(new Request(`https://lotevista.test/api/qr/${slug}${consulta}`, { headers: cabeceras }), {
    params: Promise.resolve({ slug }),
  });

/** Lee el código QR de una imagen PNG y devuelve el texto que contiene. */
async function leerQr(res: Response): Promise<string | undefined> {
  const png = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
}

describe("GET /api/qr/[slug]", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("devuelve una imagen PNG", async () => {
    const res = await pedir("algarrobos-de-sunampe");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("el QR abre la ficha del proyecto con el canal qr_sala", async () => {
    const res = await pedir("campina-de-huaral");
    expect(await leerQr(res)).toBe("https://lotevista.test/proyectos/campina-de-huaral?canal=qr_sala");
  });

  it("usa SITE_URL cuando está configurada (por ejemplo, el dominio público)", async () => {
    vi.stubEnv("SITE_URL", "https://lotevista.vercel.app/");
    const res = await pedir("jardines-del-chira");
    expect(await leerQr(res)).toBe("https://lotevista.vercel.app/proyectos/jardines-del-chira?canal=qr_sala");
  });

  it("un QR de un proyecto inexistente también se genera (al escanearlo se llega a la página amable)", async () => {
    const res = await pedir("proyecto-que-ya-no-existe");
    expect(res.status).toBe(200);
    expect(await leerQr(res)).toBe("https://lotevista.test/proyectos/proyecto-que-ya-no-existe?canal=qr_sala");
  });

  it("con ?descargar=1 se ofrece como archivo para guardar", async () => {
    const res = await pedir("algarrobos-de-sunampe", "?descargar=1");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="qr-algarrobos-de-sunampe.png"');
    const normal = await pedir("algarrobos-de-sunampe");
    expect(normal.headers.get("content-disposition")).toBeNull();
  });

  it("rechaza identificadores inválidos sin generar nada", async () => {
    for (const slug of ["", "Con Espacios", "../../etc/passwd", "a".repeat(81), "x;y", "%00"]) {
      const res = await pedir(slug);
      expect(res.status, slug).toBe(400);
      expect((await res.json()).ok).toBe(false);
    }
  });

  it("se puede guardar en caché un rato (es el mismo QR para todos)", async () => {
    const res = await pedir("algarrobos-de-sunampe");
    expect(res.headers.get("cache-control")).toMatch(/public, max-age=\d+/);
  });
});
